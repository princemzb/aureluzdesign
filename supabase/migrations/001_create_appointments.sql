-- Migration 001: Table appointments
-- Système de rendez-vous pour AureLuz

-- Enum pour le type d'événement
CREATE TYPE event_type AS ENUM ('mariage', 'table', 'autre');

-- Enum pour le statut
CREATE TYPE appointment_status AS ENUM ('pending', 'confirmed', 'cancelled');

-- Table des rendez-vous
CREATE TABLE appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_name VARCHAR(100) NOT NULL,
    client_email VARCHAR(255) NOT NULL,
    client_phone VARCHAR(20) NOT NULL,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    event_type event_type NOT NULL,
    message TEXT,
    status appointment_status DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Contraintes
    CONSTRAINT valid_time_range CHECK (end_time > start_time),
    CONSTRAINT unique_slot UNIQUE (date, start_time)
);

-- Index pour les requêtes fréquentes
CREATE INDEX idx_appointments_date ON appointments(date);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_appointments_date_status ON appointments(date, status);
CREATE INDEX idx_appointments_created_at ON appointments(created_at DESC);

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER appointments_updated_at
    BEFORE UPDATE ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- RLS (Row Level Security)
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Politique: Tout le monde peut créer un RDV (pour les visiteurs)
CREATE POLICY "Anyone can create appointments" ON appointments
    FOR INSERT WITH CHECK (true);

-- Politique: Seul admin peut lire tous les RDV
CREATE POLICY "Authenticated users can read all appointments" ON appointments
    FOR SELECT USING (auth.role() = 'authenticated');

-- Politique: Seul admin peut modifier
CREATE POLICY "Authenticated users can update appointments" ON appointments
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Politique: Seul admin peut supprimer
CREATE POLICY "Authenticated users can delete appointments" ON appointments
    FOR DELETE USING (auth.role() = 'authenticated');
