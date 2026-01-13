# Systeme de Temoignages

## Vue d'ensemble

Systeme de gestion des avis clients avec :
- Formulaire public de soumission
- Moderation admin avant publication
- Affichage des temoignages approuves sur le site
- Statistiques de moderation

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              SITE PUBLIC                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│    ┌──────────────────────────────────────────────────────────────────────┐ │
│    │                    TestimonialForm (Client)                           │ │
│    │                                                                       │ │
│    │   Nom, Email, Type evenement, Note, Titre, Contenu                   │ │
│    │                     │                                                 │ │
│    │                     ▼                                                 │ │
│    │           submitTestimonial() ─────────────────┐                     │ │
│    └────────────────────────────────────────────────│─────────────────────┘ │
│                                                     │                        │
│    ┌────────────────────────────────────────────────│─────────────────────┐ │
│    │              Testimonials (affichage)          │                      │ │
│    │                     ▲                          │                      │ │
│    │          getApprovedTestimonials() ◄──────────│───────┐              │ │
│    └────────────────────────────────────────────────│───────│──────────────┘ │
│                                                     │       │                │
└─────────────────────────────────────────────────────│───────│────────────────┘
                                                      │       │
┌─────────────────────────────────────────────────────│───────│────────────────┐
│                              SUPABASE               │       │                │
├─────────────────────────────────────────────────────│───────│────────────────┤
│                                                     │       │                │
│    ┌────────────────────────────────────────────────▼───────┴──────────────┐│
│    │                         testimonials                                   ││
│    │                                                                        ││
│    │   status = 'pending'  ────────────────────►  status = 'approved'      ││
│    │        (invisible)        moderation              (visible)            ││
│    │                              admin                                     ││
│    └────────────────────────────────────────────────────────────────────────┘│
│                                     ▲                                        │
│                                     │ RLS                                    │
│    ┌────────────────────────────────┴───────────────────────────────────────┐│
│    │  - Public: INSERT (pending only), SELECT (approved only)               ││
│    │  - Admin (service_role): ALL                                           ││
│    └────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

## Fichiers impliques

| Fichier | Role |
|---------|------|
| `components/testimonials/testimonial-form.tsx` | Formulaire de soumission (public) |
| `components/testimonials/testimonial-form-toggle.tsx` | Toggle afficher/masquer formulaire |
| `components/sections/testimonials.tsx` | Affichage des temoignages approuves |
| `components/admin/testimonials-manager.tsx` | Interface admin de moderation |
| `lib/actions/testimonials.actions.ts` | Server Actions |
| `supabase/migrations/20240106000000_create_testimonials.sql` | Schema SQL |

## Concepts cles

### 1. Workflow de Moderation

Les temoignages passent par 3 etats :

```
pending ────► approved ────► (affiche sur le site)
    │
    └──────► rejected  ────► (jamais affiche)
```

```typescript
export type TestimonialStatus = 'pending' | 'approved' | 'rejected';
```

### 2. RLS avec Filtrage par Status

La Row Level Security filtre automatiquement les donnees selon le contexte :

```sql
-- Public peut LIRE uniquement les temoignages approuves
CREATE POLICY "Anyone can read approved testimonials"
  ON testimonials FOR SELECT
  USING (status = 'approved');

-- Public peut INSERER uniquement avec status 'pending'
CREATE POLICY "Anyone can submit testimonials"
  ON testimonials FOR INSERT
  WITH CHECK (status = 'pending');

-- Admin (service_role) peut tout faire
CREATE POLICY "Service role full access"
  ON testimonials
  USING (auth.role() = 'service_role');
```

**Consequence pratique :**

```typescript
// Cote public - ne voit QUE les approved
const { data } = await supabaseClient
  .from('testimonials')
  .select('*');  // RLS filtre automatiquement

// Cote admin - utilise service_role pour tout voir
const supabase = createAdminClient();  // service_role key
const { data } = await supabase
  .from('testimonials')
  .select('*');  // Voit TOUS les status
```

### 3. Deux Clients Supabase

Le projet utilise deux clients Supabase differents :

```typescript
// lib/supabase/server.ts

// Client standard (respecte RLS)
export async function createClient() {
  // Utilise SUPABASE_ANON_KEY
}

// Client admin (bypass RLS)
export function createAdminClient() {
  // Utilise SUPABASE_SERVICE_ROLE_KEY
}
```

**Usage :**

```typescript
// Fonction publique - client standard
export async function getApprovedTestimonials() {
  const supabase = await createClient();  // RLS active
  // ...
}

// Fonction admin - client admin
export async function getAllTestimonials() {
  const supabase = createAdminClient();  // Bypass RLS
  // ...
}
```

### 4. Formulaire avec Note Interactive

Le formulaire inclut un selecteur d'etoiles interactif :

```typescript
// components/testimonials/testimonial-form.tsx
const [rating, setRating] = useState(5);
const [hoveredRating, setHoveredRating] = useState(0);

<div className="flex items-center gap-1">
  {[1, 2, 3, 4, 5].map((star) => (
    <button
      key={star}
      type="button"
      onClick={() => setRating(star)}
      onMouseEnter={() => setHoveredRating(star)}
      onMouseLeave={() => setHoveredRating(0)}
    >
      <Star
        className={cn(
          'w-8 h-8 transition-colors',
          (hoveredRating || rating) >= star
            ? 'text-yellow-400 fill-yellow-400'
            : 'text-muted-foreground/30'
        )}
      />
    </button>
  ))}
</div>
```

**Pattern utilise :**
- `rating` = valeur selectionnee (persistee)
- `hoveredRating` = valeur survolee (temporaire, UX)
- Affichage : priorite au hover, sinon rating

### 5. Actions Admin avec Revalidation

Quand l'admin modifie un temoignage, le cache Next.js est invalide :

```typescript
export async function updateTestimonialStatus(
  id: string,
  status: TestimonialStatus
) {
  const supabase = createAdminClient();

  const updateData: Record<string, unknown> = { status };

  // Si approuve, enregistrer la date d'approbation
  if (status === 'approved') {
    updateData.approved_at = new Date().toISOString();
  }

  await supabase
    .from('testimonials')
    .update(updateData)
    .eq('id', id);

  // Invalider le cache des pages concernees
  revalidatePath('/');                    // Homepage (affiche temoignages)
  revalidatePath('/admin/testimonials');  // Admin

  return { success: true };
}
```

## Schema de la base

```sql
CREATE TABLE testimonials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Informations client
  client_name VARCHAR(255) NOT NULL,
  client_email VARCHAR(255) NOT NULL,      -- Non affiche publiquement

  -- Details evenement
  event_type VARCHAR(100) NOT NULL,
  event_date DATE,

  -- Contenu du temoignage
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  photo_url TEXT,                          -- Optionnel

  -- Moderation
  status VARCHAR(20) DEFAULT 'pending',    -- pending, approved, rejected
  approved_at TIMESTAMP WITH TIME ZONE,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Points d'extension

### Ajouter une reponse de l'admin

1. Ajouter la colonne :
```sql
ALTER TABLE testimonials ADD COLUMN admin_response TEXT;
```

2. Ajouter le champ dans le type TypeScript
3. Ajouter l'action `addAdminResponse(id, response)`
4. Afficher la reponse dans le composant public

### Ajouter des photos aux temoignages

1. La colonne `photo_url` existe deja
2. Ajouter un input file dans le formulaire
3. Uploader vers Supabase Storage
4. Stocker l'URL dans `photo_url`

### Notification email a l'approbation

```typescript
export async function updateTestimonialStatus(id: string, status: TestimonialStatus) {
  // ... update logic ...

  if (status === 'approved') {
    // Recuperer l'email du client
    const { data } = await supabase.from('testimonials').select('client_email').eq('id', id).single();

    // Envoyer notification
    await sendTestimonialApprovedEmail(data.client_email);
  }
}
```

## Maintenance

### Checklist de moderation

- [ ] Verifier les nouveaux temoignages pending regulierement
- [ ] Lire le contenu avant approbation (spam, contenu inapproprie)
- [ ] Verifier l'email si douteux

### Problemes courants

| Probleme | Cause | Solution |
|----------|-------|----------|
| Temoignage soumis mais invisible | Status = pending | Approuver dans l'admin |
| Formulaire ne soumet pas en preview | Mode preview active | Normal, desactive volontairement |
| Email client visible | Bug affichage | Verifier que seul client_name est affiche |

### Statistiques de moderation

```typescript
export async function getTestimonialStats() {
  const supabase = createAdminClient();
  const { data } = await supabase.from('testimonials').select('status');

  return {
    total: data?.length || 0,
    pending: data?.filter((t) => t.status === 'pending').length || 0,
    approved: data?.filter((t) => t.status === 'approved').length || 0,
    rejected: data?.filter((t) => t.status === 'rejected').length || 0,
  };
}
```
