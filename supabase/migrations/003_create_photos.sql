-- Migration 003: Table photos
-- Galerie de photos pour le portfolio

CREATE TYPE photo_category AS ENUM ('mariage', 'evenement', 'table');

CREATE TABLE photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    url VARCHAR(500) NOT NULL,
    alt VARCHAR(255) NOT NULL,
    category photo_category NOT NULL,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour les requêtes fréquentes
CREATE INDEX idx_photos_category ON photos(category);
CREATE INDEX idx_photos_order ON photos(display_order);
CREATE INDEX idx_photos_category_order ON photos(category, display_order);

-- RLS
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;

-- Tout le monde peut lire les photos (portfolio public)
CREATE POLICY "Anyone can read photos" ON photos
    FOR SELECT USING (true);

-- Seul admin peut insérer
CREATE POLICY "Authenticated users can insert photos" ON photos
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Seul admin peut modifier
CREATE POLICY "Authenticated users can update photos" ON photos
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Seul admin peut supprimer
CREATE POLICY "Authenticated users can delete photos" ON photos
    FOR DELETE USING (auth.role() = 'authenticated');
