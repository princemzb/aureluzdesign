-- Migration 004: Table business_hours
-- Configuration des heures d'ouverture

CREATE TABLE business_hours (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    open_time TIME NOT NULL DEFAULT '09:00',
    close_time TIME NOT NULL DEFAULT '18:00',
    is_open BOOLEAN DEFAULT true,

    -- Un seul enregistrement par jour de la semaine
    CONSTRAINT unique_day UNIQUE (day_of_week),
    CONSTRAINT valid_hours CHECK (close_time > open_time)
);

-- Données initiales (Lundi-Vendredi: 9h-18h, Weekend: fermé)
INSERT INTO business_hours (day_of_week, open_time, close_time, is_open) VALUES
    (0, '09:00', '18:00', false),  -- Dimanche
    (1, '09:00', '18:00', true),   -- Lundi
    (2, '09:00', '18:00', true),   -- Mardi
    (3, '09:00', '18:00', true),   -- Mercredi
    (4, '09:00', '18:00', true),   -- Jeudi
    (5, '09:00', '18:00', true),   -- Vendredi
    (6, '09:00', '18:00', false);  -- Samedi

-- RLS
ALTER TABLE business_hours ENABLE ROW LEVEL SECURITY;

-- Tout le monde peut lire les heures d'ouverture
CREATE POLICY "Anyone can read business_hours" ON business_hours
    FOR SELECT USING (true);

-- Seul admin peut modifier
CREATE POLICY "Authenticated users can update business_hours" ON business_hours
    FOR UPDATE USING (auth.role() = 'authenticated');
