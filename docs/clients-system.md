# Système de Gestion des Clients (Workspace)

## Vue d'ensemble

Le **Workspace** est un hub centralisé permettant de gérer les clients et de regrouper toutes les actions relatives à chaque client : devis, tâches, agenda et factures.

**Fonctionnalités clés :**
- Création automatique des clients lors d'une prise de RDV
- Agenda global affichant tous les RDV + tâches de tous les clients
- Vue journalière de l'agenda avec timeline
- Fiche client détaillée avec onglets (Devis, Tâches, Agenda, Factures)
- Page détail des tâches avec gestion des notes/détails

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              WORKSPACE                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   Sidebar : "Workspace" → /admin/clients                                    │
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
├─────────────────────────────────────────────────────────────────────────────┤
│                            AGENDA GLOBAL                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   Sidebar : "Agenda" → /admin/appointments                                  │
│                                                                              │
│   Vue calendrier par défaut affichant :                                     │
│   - Tous les RDV (jaune=attente, vert=confirmé, rouge=annulé)              │
│   - Toutes les tâches (couleur selon priorité : rouge/orange/bleu/gris)    │
│                                                                              │
│   Clic sur une date → /admin/agenda/[date] (vue journalière)               │
│                                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                            GESTION DES TÂCHES                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   /admin/tasks/[id]                 Page détail de la tâche :               │
│        │                             ├── Statut modifiable (boutons)        │
│        │                             ├── Infos (date, créneau, lieu)        │
│        │                             └── Section détails/notes              │
│        │                                                                     │
│        └── /modifier                 Formulaire édition complet             │
│                                                                              │
│   /admin/tasks/nouveau?client=xxx   Création nouvelle tâche                 │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Création automatique des clients

Quand un visiteur prend un RDV via le formulaire public, le système :
1. Crée le RDV
2. Vérifie si un client avec cet email existe
3. Si non → crée automatiquement le client (nom, email, téléphone)
4. Le RDV apparaît dans l'agenda du client

```typescript
// lib/actions/booking.actions.ts
const existingClient = await ClientsService.getByEmail(validatedData.client_email);
if (!existingClient) {
  await ClientsService.create({
    name: validatedData.client_name,
    email: validatedData.client_email,
    phone: validatedData.client_phone,
  });
}
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
  start_time time,           -- Créneau horaire optionnel
  end_time time,             -- Créneau horaire optionnel
  description text,
  status task_status DEFAULT 'pending',  -- pending, in_progress, completed, cancelled
  priority task_priority DEFAULT 'normal', -- urgent, high, normal, low
  attachments jsonb DEFAULT '[]',
  created_at timestamptz,
  updated_at timestamptz,
  completed_at timestamptz
)
```

### Table `task_details`

Blocs de texte/notes attachés à une tâche.

```sql
task_details (
  id uuid PRIMARY KEY,
  task_id uuid REFERENCES tasks NOT NULL ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz,
  updated_at timestamptz
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
| `020_client_cascade_delete.sql` | FK avec CASCADE pour suppression client |
| `021_task_details_and_times.sql` | Table task_details + champs start_time/end_time |

### Services

| Fichier | Description |
|---------|-------------|
| `lib/services/clients.service.ts` | CRUD clients, recherche, pagination, stats |
| `lib/services/tasks.service.ts` | CRUD tâches, filtrage, calendrier, détails |

### Actions

| Fichier | Description |
|---------|-------------|
| `lib/actions/clients.actions.ts` | Server actions clients |
| `lib/actions/tasks.actions.ts` | Server actions tâches + détails |

### Pages

| Route | Fichier |
|-------|---------|
| `/admin/clients` | `app/(admin)/admin/clients/page.tsx` |
| `/admin/clients/nouveau` | `app/(admin)/admin/clients/nouveau/page.tsx` |
| `/admin/clients/[id]` | `app/(admin)/admin/clients/[id]/page.tsx` |
| `/admin/clients/[id]/modifier` | `app/(admin)/admin/clients/[id]/modifier/page.tsx` |
| `/admin/agenda/[date]` | `app/(admin)/admin/agenda/[date]/page.tsx` |
| `/admin/tasks/[id]` | `app/(admin)/admin/tasks/[id]/page.tsx` |
| `/admin/tasks/[id]/modifier` | `app/(admin)/admin/tasks/[id]/modifier/page.tsx` |
| `/admin/tasks/nouveau` | `app/(admin)/admin/tasks/nouveau/page.tsx` |

### Composants

| Fichier | Description |
|---------|-------------|
| `components/admin/clients-list.tsx` | Liste paginée avec recherche et suppression |
| `components/admin/client-form.tsx` | Formulaire création/édition |
| `components/admin/client-detail-tabs.tsx` | Onglets (Devis/Tâches/Agenda/Factures) |
| `components/admin/client-tasks-list.tsx` | Liste des tâches avec actions visibles |
| `components/admin/client-agenda.tsx` | Vue calendrier (semaine/mois) |
| `components/admin/client-selector.tsx` | Sélecteur client pour formulaire devis |
| `components/admin/delete-client-button.tsx` | Bouton suppression avec confirmation |
| `app/.../tasks/[id]/task-status-changer.tsx` | Boutons changement de statut |
| `app/.../tasks/[id]/task-details-section.tsx` | Gestion des détails/notes |

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

### Détails de tâche

Chaque tâche peut avoir plusieurs blocs de notes/détails. Ils sont affichés avec des couleurs alternées pour une meilleure lisibilité.

```typescript
interface TaskDetail {
  id: string;
  task_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

// Ajout d'un détail
const result = await addTaskDetail({ task_id: taskId, content: "Note importante..." });

// Suppression
await deleteTaskDetail(detailId, taskId);
```

### Créneau horaire des tâches

Les tâches peuvent optionnellement avoir un créneau d'exécution :

```typescript
interface Task {
  // ...
  start_time: string | null;  // Format "HH:MM:SS"
  end_time: string | null;
}
```

Dans la vue journalière de l'agenda, les tâches avec créneau pourraient être positionnées sur la timeline (fonctionnalité future).

### Navigation agenda → tâche

Depuis le calendrier global (`/admin/appointments`) :
1. Clic sur une date → `/admin/agenda/[date]` (vue journalière)
2. Sur la vue journalière :
   - Clic sur un RDV → `/admin/appointments/[id]`
   - Clic sur une tâche → `/admin/tasks/[id]`

### Liste des tâches (fiche client)

Les tâches sont affichées avec :
- Indicateur de priorité (icône colorée)
- Badge de statut
- Date limite (rouge si en retard)
- Lieu
- Actions visibles directement (pas de menu déroulant) :
  - Boutons de statut (En attente / En cours / Terminé)
  - Modifier
  - Supprimer
- Clic sur la tâche → page détail

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
4. Mettre à jour les formulaires dans `app/(admin)/admin/tasks/`

### Statistiques client

Les stats sont calculées dans `ClientsService.getClientStats()` :
- `quotes_count` : Nombre de devis
- `tasks_count` : Nombre de tâches
- `total_amount` : CA total (somme des devis)
- `pending_tasks` : Tâches en attente

### Suppression d'un client

La suppression d'un client entraîne la suppression en cascade de toutes ses données :

```
Client supprimé
  ├── Tâches (CASCADE automatique via FK)
  │     └── Détails de tâche (CASCADE automatique via FK)
  ├── Devis (CASCADE automatique via FK)
  │     └── Factures (CASCADE automatique via FK quote_id)
  └── RDV (suppression manuelle par email dans le service)
```

**Fichiers impliqués :**
- `lib/services/clients.service.ts` : Méthode `delete()` qui supprime les RDV puis le client
- `components/admin/delete-client-button.tsx` : Bouton avec modal de confirmation
- `supabase/migrations/020_client_cascade_delete.sql` : FK quotes → clients avec CASCADE

**Code de suppression :**

```typescript
// lib/services/clients.service.ts
static async delete(id: string): Promise<void> {
  const supabase = createAdminClient();

  // 1. Récupérer l'email du client
  const { data: client } = await supabase
    .from('clients')
    .select('email')
    .eq('id', id)
    .single();

  // 2. Supprimer les RDV liés à cet email
  await supabase
    .from('appointments')
    .delete()
    .eq('client_email', client.email);

  // 3. Supprimer le client (CASCADE: tâches, détails, devis, factures)
  await supabase
    .from('clients')
    .delete()
    .eq('id', id);
}
```

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

### Nettoyer les détails orphelins

```sql
-- Détails sans tâche (ne devrait pas arriver avec CASCADE)
SELECT td.* FROM task_details td
LEFT JOIN tasks t ON td.task_id = t.id
WHERE t.id IS NULL;
```

## Dernière mise à jour

Janvier 2026
