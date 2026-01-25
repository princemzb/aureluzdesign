-- Migration 022: Sous-tâches (checklist) pour les tâches
-- Permet d'ajouter une liste de cases à cocher avec réorganisation

-- Ajouter le champ auto_complete à la table tasks
ALTER TABLE tasks
ADD COLUMN auto_complete BOOLEAN DEFAULT FALSE;

-- Table des sous-tâches (checklist)
CREATE TABLE task_subtasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_completed BOOLEAN DEFAULT FALSE,
    position INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour les requêtes
CREATE INDEX idx_task_subtasks_task_id ON task_subtasks(task_id);
CREATE INDEX idx_task_subtasks_position ON task_subtasks(task_id, position);

-- Trigger pour updated_at sur task_subtasks
CREATE TRIGGER task_subtasks_updated_at
    BEFORE UPDATE ON task_subtasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- RLS pour task_subtasks
ALTER TABLE task_subtasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read task_subtasks" ON task_subtasks
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert task_subtasks" ON task_subtasks
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update task_subtasks" ON task_subtasks
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete task_subtasks" ON task_subtasks
    FOR DELETE USING (auth.role() = 'authenticated');
