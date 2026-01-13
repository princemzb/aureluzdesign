# Systeme de Galerie

## Vue d'ensemble

Systeme de gestion des photos du portfolio avec :
- Upload vers Supabase Storage
- Categorisation (mariage, table, etc.)
- Ordre d'affichage personnalisable (drag & drop)
- Validation du type et de la taille des fichiers

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              ADMIN INTERFACE                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│    ┌──────────────────────────────────────────────────────────────────────┐ │
│    │                    GalleryManager (Client Component)                  │ │
│    │                                                                       │ │
│    │   [Upload]  [Delete]  [Reorder (Drag & Drop)]  [Edit Alt/Category]   │ │
│    │                                                                       │ │
│    └─────────────────────┬────────────────────────────────────────────────┘ │
│                          │                                                   │
│                          ▼                                                   │
│    ┌──────────────────────────────────────────────────────────────────────┐ │
│    │                   Server Actions (gallery.actions.ts)                 │ │
│    │                                                                       │ │
│    │   uploadPhoto() │ deletePhoto() │ updatePhotoOrder() │ updatePhoto() │ │
│    └─────────────────────┬────────────────────────────────────────────────┘ │
│                          │                                                   │
│                          ▼                                                   │
│    ┌──────────────────────────────────────────────────────────────────────┐ │
│    │                   GalleryService (Service Layer)                      │ │
│    │                                                                       │ │
│    │   - Validation fichiers                                              │ │
│    │   - Upload Storage                                                   │ │
│    │   - CRUD Database                                                    │ │
│    └─────────────────────┬────────────────────────────────────────────────┘ │
│                          │                                                   │
└──────────────────────────┼───────────────────────────────────────────────────┘
                           │
┌──────────────────────────┼───────────────────────────────────────────────────┐
│                     SUPABASE                                                 │
├──────────────────────────┼───────────────────────────────────────────────────┤
│                          │                                                   │
│    ┌─────────────────────┴─────────────────────────────────────────────────┐│
│    │                                                                        ││
│    │   ┌─────────────────────┐      ┌─────────────────────┐                ││
│    │   │      Storage        │      │     Database        │                ││
│    │   │  (Bucket: photos)   │      │   (Table: photos)   │                ││
│    │   │                     │      │                     │                ││
│    │   │   image.jpg ────────┼──────┼──► url, alt,       │                ││
│    │   │   image2.png        │      │      category,     │                ││
│    │   │                     │      │      display_order │                ││
│    │   └─────────────────────┘      └─────────────────────┘                ││
│    │                                                                        ││
│    └────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

## Fichiers impliques

| Fichier | Role |
|---------|------|
| `components/admin/gallery-manager.tsx` | Interface admin (upload, grid, actions) |
| `lib/actions/gallery.actions.ts` | Server Actions |
| `lib/services/gallery.service.ts` | Service metier + Supabase Storage |
| `components/sections/portfolio.tsx` | Affichage public du portfolio |

## Concepts cles

### 1. Upload vers Supabase Storage

Le fichier est uploade vers un bucket Supabase avec un nom unique :

```typescript
static async uploadToStorage(file: File): Promise<string> {
  const supabase = createAdminClient();

  // Validation type de fichier
  if (!BUSINESS_CONFIG.ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    throw new Error('Type de fichier non autorise');
  }

  // Validation taille
  if (file.size > BUSINESS_CONFIG.MAX_UPLOAD_SIZE) {
    throw new Error('Image trop volumineuse');
  }

  // Nom unique pour eviter les collisions
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 8);
  const extension = file.name.split('.').pop();
  const filename = `${timestamp}-${randomStr}.${extension}`;

  // Upload vers le bucket "photos"
  const { error } = await supabase.storage
    .from('photos')
    .upload(filename, file, {
      cacheControl: '3600',  // Cache 1 heure
      upsert: false,         // Pas d'ecrasement
    });

  if (error) throw new Error('Erreur upload');

  // Recuperer l'URL publique
  const { data } = supabase.storage
    .from('photos')
    .getPublicUrl(filename);

  return data.publicUrl;
}
```

**Pourquoi nom unique :**
- Evite les collisions si 2 fichiers ont le meme nom
- Facilite le nettoyage (pas de references croisees)

### 2. Separation Storage / Database

L'image est stockee a 2 endroits :

1. **Storage** : Le fichier binaire (image.jpg)
2. **Database** : Les metadonnees (url, alt, category, order)

```typescript
export async function uploadPhoto(formData: FormData) {
  // 1. Upload vers Storage
  const url = await GalleryService.uploadToStorage(file);

  // 2. Creation en Database
  const photo = await GalleryService.create({
    url,
    alt,
    category,
  });

  return { success: true, photo };
}
```

**Avantages :**
- Separation des responsabilites
- Metadonnees interrogeables (requetes SQL sur category, order)
- URL publique via CDN Supabase

### 3. Suppression en Cascade

La suppression doit nettoyer Storage ET Database :

```typescript
static async delete(id: string): Promise<void> {
  // 1. Recuperer la photo pour avoir l'URL
  const photo = await this.getById(id);
  if (!photo) throw new Error('Photo non trouvee');

  // 2. Extraire le nom de fichier de l'URL
  const urlParts = photo.url.split('/');
  const filename = urlParts[urlParts.length - 1];

  // 3. Supprimer du Storage
  await supabase.storage.from('photos').remove([filename]);

  // 4. Supprimer de la Database
  await supabase.from('photos').delete().eq('id', id);
}
```

**Important :** On continue meme si la suppression Storage echoue, pour eviter les photos orphelines en base.

### 4. Ordre d'Affichage Personnalisable

L'ordre est gere par un champ `display_order` :

```typescript
// Insertion : ordre auto-incremente
static async create(input) {
  // Trouver le max actuel
  const { data } = await supabase
    .from('photos')
    .select('display_order')
    .order('display_order', { ascending: false })
    .limit(1)
    .single();

  const newOrder = (data?.display_order || 0) + 1;

  await supabase.from('photos').insert({
    ...input,
    display_order: newOrder,
  });
}

// Reordonnancement (apres drag & drop)
static async updateOrder(orderedIds: string[]) {
  // orderedIds = ['uuid1', 'uuid2', 'uuid3'] dans le nouvel ordre

  const updates = orderedIds.map((id, index) =>
    supabase.from('photos').update({ display_order: index }).eq('id', id)
  );

  await Promise.all(updates);
}
```

### 5. Lecture Publique vs Ecriture Admin

Deux clients Supabase differents selon l'operation :

```typescript
// Lecture (public) - respecte RLS
static async getAll(): Promise<Photo[]> {
  const supabase = await createClient();  // Client standard
  const { data } = await supabase.from('photos').select('*');
  return data || [];
}

// Ecriture (admin) - bypass RLS
static async create(input): Promise<Photo> {
  const supabase = createAdminClient();  // Service role
  const { data } = await supabase.from('photos').insert(input);
  return data;
}
```

**Pourquoi cette separation :**
- Les routes admin sont deja protegees par middleware
- La session utilisateur ne se propage pas toujours aux Server Actions
- Evite les erreurs RLS en ecriture

## Configuration

### Variables requises

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJxxx  # Pour createAdminClient
```

### Bucket Storage

Creer le bucket "photos" dans Supabase Dashboard :
- **Nom** : `photos`
- **Public** : Oui (pour les URLs publiques)
- **Policies** : INSERT/DELETE pour service_role uniquement

### Constantes de validation

```typescript
// lib/utils/constants.ts
export const BUSINESS_CONFIG = {
  ACCEPTED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'] as const,
  MAX_UPLOAD_SIZE: 5 * 1024 * 1024, // 5 MB
};
```

## Schema de la base

```sql
CREATE TABLE photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    url TEXT NOT NULL,                    -- URL publique Supabase Storage
    alt VARCHAR(255) NOT NULL,            -- Texte alternatif (SEO, accessibilite)
    category photo_category NOT NULL,     -- 'mariage', 'table', 'autre'
    display_order INTEGER DEFAULT 0,      -- Ordre d'affichage
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_photos_category ON photos(category);
CREATE INDEX idx_photos_display_order ON photos(display_order);
```

## Points d'extension

### Ajouter une nouvelle categorie

1. Modifier l'enum TypeScript :
```typescript
export type PhotoCategory = 'mariage' | 'table' | 'autre' | 'nouvelle_categorie';
```

2. (Optionnel) Modifier l'enum SQL si stocke en enum

### Ajouter des dimensions d'image

1. Ajouter les colonnes :
```sql
ALTER TABLE photos ADD COLUMN width INTEGER;
ALTER TABLE photos ADD COLUMN height INTEGER;
```

2. Calculer les dimensions a l'upload (via sharp ou browser API)

### Ajouter des miniatures

Generer des thumbnails a l'upload :
```typescript
static async uploadToStorage(file: File) {
  // Upload original
  const originalUrl = await this.uploadFile(file, 'photos');

  // Generer thumbnail (via sharp)
  const thumbnail = await generateThumbnail(file, 200, 200);
  const thumbnailUrl = await this.uploadFile(thumbnail, 'thumbnails');

  return { originalUrl, thumbnailUrl };
}
```

## Maintenance

### Nettoyage des orphelins

Script pour supprimer les fichiers Storage sans entree Database :

```typescript
async function cleanOrphanedFiles() {
  const supabase = createAdminClient();

  // Lister tous les fichiers Storage
  const { data: files } = await supabase.storage.from('photos').list();

  // Lister toutes les URLs en Database
  const { data: photos } = await supabase.from('photos').select('url');
  const dbFilenames = new Set(photos.map(p => p.url.split('/').pop()));

  // Supprimer les fichiers non references
  for (const file of files) {
    if (!dbFilenames.has(file.name)) {
      await supabase.storage.from('photos').remove([file.name]);
    }
  }
}
```

### Problemes courants

| Probleme | Cause | Solution |
|----------|-------|----------|
| Upload echoue | Fichier trop gros | Verifier MAX_UPLOAD_SIZE |
| Image non affichee | Bucket non public | Verifier les policies Storage |
| Ordre non sauvegarde | Promise.all echoue | Verifier les erreurs individuelles |
| URL 404 | Fichier supprime manuellement | Supprimer l'entree Database |
