-- Migration 016: Créer la table open_slots pour les créneaux exceptionnels
-- Permet d'ouvrir des créneaux sur des jours normalement fermés (weekends, etc.)

CREATE TABLE IF NOT EXISTS open_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Date et horaires du créneau ouvert
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,

    -- Raison optionnelle (ex: "Ouverture exceptionnelle samedi")
    reason VARCHAR(255),

    -- Métadonnées
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Contrainte d'unicité pour éviter les doublons
    UNIQUE(date, start_time)
);

-- Index pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_open_slots_date ON open_slots(date);
CREATE INDEX IF NOT EXISTS idx_open_slots_date_time ON open_slots(date, start_time, end_time);

-- RLS (Row Level Security)
ALTER TABLE open_slots ENABLE ROW LEVEL SECURITY;

-- Tout le monde peut lire (nécessaire pour vérifier la disponibilité côté public)
CREATE POLICY "Anyone can read open slots" ON open_slots
    FOR SELECT USING (true);

-- Seuls les utilisateurs authentifiés (admin) peuvent créer/modifier/supprimer
CREATE POLICY "Authenticated users can insert open slots" ON open_slots
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update open slots" ON open_slots
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete open slots" ON open_slots
    FOR DELETE USING (auth.role() = 'authenticated');

-- Commentaire sur la table
COMMENT ON TABLE open_slots IS 'Créneaux exceptionnellement ouverts sur des jours normalement fermés';
COMMENT ON COLUMN open_slots.date IS 'Date du créneau ouvert';
COMMENT ON COLUMN open_slots.start_time IS 'Heure de début du créneau';
COMMENT ON COLUMN open_slots.end_time IS 'Heure de fin du créneau';
COMMENT ON COLUMN open_slots.reason IS 'Raison de l''ouverture exceptionnelle';
