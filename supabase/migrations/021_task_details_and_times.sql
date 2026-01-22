-- Migration 021: Ajout créneau horaire et détails des tâches
-- Permet d'ajouter un horaire d'exécution optionnel et des blocs de détails

-- Ajouter les champs horaires à la table tasks
ALTER TABLE tasks
ADD COLUMN start_time TIME,
ADD COLUMN end_time TIME;

-- Table des détails de tâche (blocs de texte)
CREATE TABLE task_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour les requêtes
CREATE INDEX idx_task_details_task_id ON task_details(task_id);
CREATE INDEX idx_task_details_created_at ON task_details(created_at DESC);

-- Trigger pour updated_at sur task_details
CREATE TRIGGER task_details_updated_at
    BEFORE UPDATE ON task_details
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS pour task_details
ALTER TABLE task_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read task_details" ON task_details
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert task_details" ON task_details
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update task_details" ON task_details
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete task_details" ON task_details
    FOR DELETE USING (auth.role() = 'authenticated');
