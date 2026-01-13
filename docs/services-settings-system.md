# Systeme de Configuration (Services et Settings)

## Vue d'ensemble

Deux systemes de configuration pour le site :

1. **Services** : Les prestations affichees sur la homepage (editables)
2. **Settings** : Parametres globaux (logo, contact, reseaux sociaux)

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              ADMIN INTERFACE                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│    ┌──────────────────────────┐    ┌──────────────────────────┐            │
│    │   ServicesManager        │    │   ContactSettingsManager │            │
│    │                          │    │                          │            │
│    │  [+] Add  [Edit] [Delete]│    │  Phone, Email, Socials  │            │
│    │  [Reorder] [Toggle]      │    │                          │            │
│    └────────────┬─────────────┘    └────────────┬─────────────┘            │
│                 │                               │                           │
│                 └───────────────┬───────────────┘                           │
│                                 │                                           │
│                    ┌────────────▼────────────┐                              │
│                    │     Server Actions      │                              │
│                    └────────────┬────────────┘                              │
│                                 │                                           │
│              ┌──────────────────┼──────────────────┐                       │
│              │                  │                  │                        │
│              ▼                  ▼                  ▼                        │
│    ┌─────────────────┐  ┌─────────────────┐  ┌───────────────┐             │
│    │ SiteServices    │  │ Settings        │  │ Storage       │             │
│    │ Service         │  │ Service         │  │ (logo upload) │             │
│    └─────────────────┘  └─────────────────┘  └───────────────┘             │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
                                 │
┌────────────────────────────────┼─────────────────────────────────────────────┐
│                           SUPABASE                                           │
├────────────────────────────────┼─────────────────────────────────────────────┤
│                                │                                             │
│    ┌───────────────────────────┴───────────────────────────────────────────┐│
│    │                                                                        ││
│    │   ┌─────────────────────┐      ┌─────────────────────┐                ││
│    │   │     services        │      │    site_settings    │                ││
│    │   │                     │      │                     │                ││
│    │   │  emoji, title,      │      │  key/value pairs    │                ││
│    │   │  description,       │      │  (logo_url,         │                ││
│    │   │  display_order,     │      │   contact_phone,    │                ││
│    │   │  is_active          │      │   social_instagram) │                ││
│    │   └─────────────────────┘      └─────────────────────┘                ││
│    │                                                                        ││
│    └────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

## Fichiers impliques

### Services

| Fichier | Role |
|---------|------|
| `components/admin/services-manager.tsx` | Interface admin CRUD |
| `components/sections/services.tsx` | Affichage public |
| `lib/actions/services.actions.ts` | Server Actions |
| `lib/services/site-services.service.ts` | Service metier |
| `supabase/migrations/008_create_services.sql` | Schema SQL |

### Settings

| Fichier | Role |
|---------|------|
| `components/admin/contact-settings-manager.tsx` | Interface admin |
| `lib/actions/settings.actions.ts` | Server Actions |
| `lib/services/settings.service.ts` | Service metier |
| `supabase/migrations/009_create_site_settings.sql` | Schema SQL |
| `supabase/migrations/011_add_contact_settings.sql` | Ajout contact |

---

## Partie 1 : Services

### Concepts cles

#### 1. Toggle Actif/Inactif

Les services peuvent etre desactives sans suppression :

```typescript
export interface Service {
  id: string;
  emoji: string;
  title: string;
  description: string;
  display_order: number;
  is_active: boolean;  // <- Toggle
}

// Admin voit tous les services
static async getAll(): Promise<Service[]> {
  const { data } = await supabase.from('services').select('*');
  return data || [];
}

// Public voit uniquement les actifs
static async getActive(): Promise<Service[]> {
  const { data } = await supabase
    .from('services')
    .select('*')
    .eq('is_active', true)  // <- Filtre
    .order('display_order');
  return data || [];
}
```

**Avantages :**
- Masquer temporairement un service (vacances, indisponibilite)
- Conserver l'historique (pas de suppression definitive)

#### 2. Protection contre la Suppression Totale

Impossible de supprimer le dernier service :

```typescript
static async delete(id: string): Promise<void> {
  // Verifier qu'il reste au moins un service
  const { count } = await supabase
    .from('services')
    .select('*', { count: 'exact', head: true });

  if (count && count <= 1) {
    throw new Error('Impossible de supprimer le dernier service');
  }

  await supabase.from('services').delete().eq('id', id);
}
```

#### 3. Ordre d'Affichage Personnalisable

Meme pattern que la galerie (drag & drop) :

```typescript
static async reorder(orderedIds: string[]): Promise<void> {
  const updates = orderedIds.map((id, index) =>
    supabase
      .from('services')
      .update({ display_order: index + 1 })
      .eq('id', id)
  );

  await Promise.all(updates);
}
```

### Schema SQL - Services

```sql
CREATE TABLE services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    emoji VARCHAR(10) NOT NULL,           -- Emoji comme icone
    title VARCHAR(100) NOT NULL,          -- Titre du service
    description TEXT NOT NULL,            -- Description
    display_order INTEGER DEFAULT 0,      -- Ordre d'affichage
    is_active BOOLEAN DEFAULT true,       -- Actif/Inactif
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insertion des services initiaux
INSERT INTO services (emoji, title, description, display_order) VALUES
('💒', 'Mariage', 'Decoration complete...', 1),
('🎂', 'Anniversaire', 'Fetes d''anniversaire...', 2),
...
```

---

## Partie 2 : Settings

### Concepts cles

#### 1. Key-Value Store

Les settings sont stockes en paires cle/valeur :

```sql
CREATE TABLE site_settings (
    id UUID PRIMARY KEY,
    key VARCHAR(100) UNIQUE NOT NULL,  -- Ex: 'logo_url'
    value TEXT,                        -- Ex: 'https://...'
    type VARCHAR(50) DEFAULT 'string', -- Type pour validation UI
    description TEXT                   -- Pour l'admin
);
```

**Avantages :**
- Flexible (ajouter un setting = INSERT)
- Pas de migration SQL pour chaque nouveau parametre
- Facile a backup/restore

#### 2. Getter/Setter Generiques

```typescript
export class SettingsService {
  static async get(key: string): Promise<string | null> {
    const { data } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', key)
      .single();
    return data?.value || null;
  }

  static async set(key: string, value: string): Promise<boolean> {
    const { error } = await supabase
      .from('site_settings')
      .update({ value })
      .eq('key', key);
    return !error;
  }
}
```

#### 3. Methodes Specialisees pour le Logo

```typescript
static async getLogo(): Promise<string> {
  const logo = await this.get('logo_url');
  return logo || '/images/default-logo.png';  // Fallback
}

static async uploadLogo(file: File): Promise<{ success: boolean; url?: string }> {
  // 1. Upload vers Storage
  const filename = `logo-${Date.now()}.${ext}`;
  await supabase.storage.from('photos').upload(`logos/${filename}`, file);

  // 2. Recuperer URL publique
  const { data } = supabase.storage.from('photos').getPublicUrl(`logos/${filename}`);

  // 3. Mettre a jour le setting
  await this.setLogo(data.publicUrl);

  return { success: true, url: data.publicUrl };
}
```

#### 4. Contact Settings avec Fallback

```typescript
const DEFAULT_CONTACT_SETTINGS: ContactSettings = {
  phone: '+33661434365',
  email: 'contact@aureluzdesign.fr',
  adminEmail: 'aureluzdesign@gmail.com',
  instagram: 'https://www.instagram.com/aure_luz_design/',
  facebook: '',
  linkedin: '',
};

static async getContactSettings(): Promise<ContactSettings> {
  const { data } = await supabase
    .from('site_settings')
    .select('key, value')
    .in('key', ['contact_phone', 'contact_email', ...]);

  // Transformer en objet avec fallback
  return {
    phone: settings['contact_phone'] || DEFAULT_CONTACT_SETTINGS.phone,
    email: settings['contact_email'] || DEFAULT_CONTACT_SETTINGS.email,
    // ...
  };
}
```

**Pourquoi les fallbacks :**
- Le site fonctionne meme si les settings ne sont pas configures
- Migration progressive (settings ajoutes au fil du temps)

### Schema SQL - Settings

```sql
CREATE TABLE site_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(100) UNIQUE NOT NULL,
    value TEXT,
    type VARCHAR(50) DEFAULT 'string',
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Settings initiaux
INSERT INTO site_settings (key, value, type, description) VALUES
('logo_url', NULL, 'image', 'URL du logo du site'),
('contact_phone', '+33661434365', 'phone', 'Telephone de contact'),
('contact_email', 'contact@aureluzdesign.fr', 'email', 'Email de contact'),
('admin_email', 'aureluzdesign@gmail.com', 'email', 'Email admin'),
('social_instagram', 'https://instagram.com/...', 'url', 'Lien Instagram'),
('social_facebook', '', 'url', 'Lien Facebook'),
('social_linkedin', '', 'url', 'Lien LinkedIn');
```

---

## Context Providers

Les settings sont propages via React Context pour eviter des requetes multiples :

```typescript
// components/providers/contact-provider.tsx
export function ContactProvider({ children, contact }: Props) {
  return (
    <ContactContext.Provider value={contact}>
      {children}
    </ContactContext.Provider>
  );
}

// Usage dans un composant
export function Footer() {
  const contact = useContact();  // Recupere du context
  return <a href={`tel:${contact.phone}`}>...</a>;
}
```

---

## Points d'extension

### Ajouter un nouveau service

Via l'interface admin (pas de code necessaire).

### Ajouter un nouveau setting

1. Inserer la valeur en base :
```sql
INSERT INTO site_settings (key, value, type, description)
VALUES ('new_setting', 'default_value', 'string', 'Description');
```

2. Ajouter le getter/setter dans `SettingsService` si logique specifique

3. Ajouter le champ dans l'interface admin si necessaire

### Ajouter un reseau social

1. Ajouter la cle dans `getContactSettings` et `updateContactSettings`
2. Ajouter le champ dans l'interface `ContactSettingsManager`
3. Ajouter l'icone dans le Footer

---

## Maintenance

### Problemes courants

| Probleme | Cause | Solution |
|----------|-------|----------|
| Service non affiche | `is_active = false` | Activer dans l'admin |
| Logo non mis a jour | Cache navigateur | Hard refresh (Cmd+Shift+R) |
| Setting non trouve | Cle non inseree | Verifier en base |
| Contact vide | Fallback non defini | Ajouter DEFAULT_CONTACT_SETTINGS |

### Checklist avant mise en production

- [ ] Au moins un service actif
- [ ] Logo configure
- [ ] Email contact valide
- [ ] Email admin valide (recoit les notifications)
- [ ] Lien Instagram valide
