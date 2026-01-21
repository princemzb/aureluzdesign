-- Migration 018: Table des tâches client
-- Gestion des tâches associées à chaque client

-- Type pour le statut des tâches
CREATE TYPE task_status AS ENUM ('pending', 'in_progress', 'completed', 'cancelled');

-- Type pour la priorité des tâches
CREATE TYPE task_priority AS ENUM ('urgent', 'high', 'normal', 'low');

CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Relation avec le client
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

    -- Informations de la tâche
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    due_date TIMESTAMPTZ,
    description TEXT,

    -- Statut et priorité
    status task_status DEFAULT 'pending',
    priority task_priority DEFAULT 'normal',

    -- Pièces jointes (stockées en JSON)
    attachments JSONB DEFAULT '[]',

    -- Métadonnées
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Index pour les requêtes fréquentes
CREATE INDEX idx_tasks_client_id ON tasks(client_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_priority ON tasks(priority);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_created_at ON tasks(created_at DESC);

-- Fonction pour mettre à jour updated_at et completed_at
CREATE OR REPLACE FUNCTION update_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();

    -- Mettre à jour completed_at si le statut passe à 'completed'
    IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
        NEW.completed_at = NOW();
    END IF;

    -- Réinitialiser completed_at si le statut n'est plus 'completed'
    IF NEW.status != 'completed' AND OLD.status = 'completed' THEN
        NEW.completed_at = NULL;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour updated_at
CREATE TRIGGER tasks_updated_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_tasks_updated_at();

-- RLS
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Seuls les utilisateurs authentifiés peuvent accéder aux tâches
CREATE POLICY "Authenticated users can read tasks" ON tasks
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert tasks" ON tasks
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update tasks" ON tasks
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete tasks" ON tasks
    FOR DELETE USING (auth.role() = 'authenticated');
