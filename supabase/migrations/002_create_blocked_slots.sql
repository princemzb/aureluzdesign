-- Migration 002: Table blocked_slots
-- Créneaux bloqués par l'administrateur

CREATE TABLE blocked_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    reason VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Contraintes
    CONSTRAINT valid_blocked_time CHECK (end_time > start_time),
    CONSTRAINT unique_blocked_slot UNIQUE (date, start_time)
);

-- Index pour les requêtes fréquentes
CREATE INDEX idx_blocked_slots_date ON blocked_slots(date);
CREATE INDEX idx_blocked_slots_date_range ON blocked_slots(date, start_time, end_time);

-- RLS
ALTER TABLE blocked_slots ENABLE ROW LEVEL SECURITY;

-- Tout le monde peut lire (pour afficher les créneaux indisponibles)
CREATE POLICY "Anyone can read blocked_slots" ON blocked_slots
    FOR SELECT USING (true);

-- Seul admin peut insérer
CREATE POLICY "Authenticated users can insert blocked_slots" ON blocked_slots
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Seul admin peut modifier
CREATE POLICY "Authenticated users can update blocked_slots" ON blocked_slots
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Seul admin peut supprimer
CREATE POLICY "Authenticated users can delete blocked_slots" ON blocked_slots
    FOR DELETE USING (auth.role() = 'authenticated');
