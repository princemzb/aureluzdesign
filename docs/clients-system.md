# Système de Gestion des Clients

## Vue d'ensemble

L'espace client est un hub centralisé permettant de gérer les clients et de regrouper toutes les actions relatives à chaque client : devis, tâches, agenda et factures.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ESPACE CLIENT                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   /admin/clients                    Liste paginée des clients (10/page)     │
│        │                                                                     │
│        └── /admin/clients/[id]      Fiche client avec onglets :             │
│             │                        ├── Devis (liés au client)             │
│             │                        ├── Tâches (avec priorité/statut)      │
│             │                        ├── Agenda (vue semaine/mois)          │
│             │                        └── Factures (après paiements)         │
│             │                                                                │
│             └── /modifier            Édition des infos client               │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Base de données

### Table `clients`

```sql
clients (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  phone text,
  address text,
  company text,
  notes text,
  created_at timestamptz,
  updated_at timestamptz
)
```

### Table `tasks`

```sql
tasks (
  id uuid PRIMARY KEY,
  client_id uuid REFERENCES clients NOT NULL,
  name text NOT NULL,
  location text,
  due_date timestamptz,
  description text,
  status task_status DEFAULT 'pending',  -- pending, in_progress, completed, cancelled
  priority task_priority DEFAULT 'normal', -- urgent, high, normal, low
  attachments jsonb DEFAULT '[]',
  created_at timestamptz,
  updated_at timestamptz,
  completed_at timestamptz
)
```

### Relation `quotes` → `clients`

```sql
ALTER TABLE quotes ADD COLUMN client_id uuid REFERENCES clients NOT NULL;
```

## Fichiers impliqués

### Migrations

| Fichier | Description |
|---------|-------------|
| `017_create_clients.sql` | Création table clients |
| `018_create_tasks.sql` | Création table tasks |
| `019_link_quotes_to_clients.sql` | Ajout client_id aux quotes + migration données |

### Services

| Fichier | Description |
|---------|-------------|
| `lib/services/clients.service.ts` | CRUD clients, recherche, pagination, stats |
| `lib/services/tasks.service.ts` | CRUD tâches, filtrage, calendrier |

### Actions

| Fichier | Description |
|---------|-------------|
| `lib/actions/clients.actions.ts` | Server actions clients |
| `lib/actions/tasks.actions.ts` | Server actions tâches |

### Pages

| Route | Fichier |
|-------|---------|
| `/admin/clients` | `app/(admin)/admin/clients/page.tsx` |
| `/admin/clients/nouveau` | `app/(admin)/admin/clients/nouveau/page.tsx` |
| `/admin/clients/[id]` | `app/(admin)/admin/clients/[id]/page.tsx` |
| `/admin/clients/[id]/modifier` | `app/(admin)/admin/clients/[id]/modifier/page.tsx` |

### Composants

| Fichier | Description |
|---------|-------------|
| `components/admin/clients-list.tsx` | Liste paginée avec recherche |
| `components/admin/client-form.tsx` | Formulaire création/édition |
| `components/admin/client-detail-tabs.tsx` | Onglets (Devis/Tâches/Agenda/Factures) |
| `components/admin/client-tasks-list.tsx` | Liste des tâches avec statut/priorité |
| `components/admin/client-agenda.tsx` | Vue calendrier (semaine/mois) |
| `components/admin/client-selector.tsx` | Sélecteur client pour formulaire devis |
| `components/admin/task-form-modal.tsx` | Modal création/édition tâche |

## Concepts clés

### Priorités des tâches

```typescript
type TaskPriority = 'urgent' | 'high' | 'normal' | 'low';

// Affichage avec icônes
const priorityConfig = {
  urgent: { icon: Flame, label: 'Urgent', class: 'text-red-500' },
  high: { icon: ArrowUp, label: 'Haute', class: 'text-orange-500' },
  normal: { icon: Minus, label: 'Normale', class: 'text-gray-500' },
  low: { icon: ArrowDown, label: 'Basse', class: 'text-blue-500' },
};
```

### Statuts des tâches

```typescript
type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

// Workflow typique : pending → in_progress → completed
```

### Sélection client pour devis

Lors de la création d'un devis, un client doit être sélectionné :

```tsx
<ClientSelector
  selectedClientId={clientId}
  onSelect={handleClientSelect}
  disabled={mode === 'edit'}  // Non modifiable en édition
/>
```

Le sélecteur :
- Affiche la liste des clients existants
- Permet la recherche par nom/email
- Propose de créer un nouveau client
- Pré-remplit les champs du devis (nom, email, téléphone)

### Migration des données existantes

La migration `019_link_quotes_to_clients.sql` :
1. Crée des clients à partir des emails uniques des devis
2. Lie chaque devis à son client via `client_id`
3. Rend `client_id` NOT NULL

```sql
-- Créer clients depuis devis existants
INSERT INTO clients (name, email, phone, created_at)
SELECT DISTINCT ON (client_email)
    client_name, client_email, client_phone, created_at
FROM quotes
WHERE client_email IS NOT NULL
ORDER BY client_email, created_at DESC;

-- Lier les devis aux clients
UPDATE quotes q
SET client_id = c.id
FROM clients c
WHERE q.client_email = c.email;
```

## Points d'extension

### Ajouter un nouvel onglet dans la fiche client

1. Modifier `client-detail-tabs.tsx` :
   - Ajouter l'onglet dans le tableau `tabs`
   - Ajouter le contenu dans le switch `activeTab`

### Ajouter un nouveau champ aux tâches

1. Migration SQL pour ajouter la colonne
2. Mettre à jour le type `Task` dans `lib/types/index.ts`
3. Mettre à jour le service `tasks.service.ts`
4. Mettre à jour le formulaire `task-form-modal.tsx`

### Statistiques client

Les stats sont calculées dans `ClientsService.getClientStats()` :
- `quotes_count` : Nombre de devis
- `tasks_count` : Nombre de tâches
- `total_amount` : CA total (somme des devis)
- `pending_tasks` : Tâches en attente

## Maintenance

### Vérifier les clients orphelins

```sql
-- Clients sans devis ni tâches
SELECT c.* FROM clients c
LEFT JOIN quotes q ON q.client_id = c.id
LEFT JOIN tasks t ON t.client_id = c.id
WHERE q.id IS NULL AND t.id IS NULL;
```

### Nettoyer les tâches anciennes

```sql
-- Tâches terminées depuis plus de 6 mois
SELECT * FROM tasks
WHERE status = 'completed'
AND completed_at < NOW() - INTERVAL '6 months';
```
