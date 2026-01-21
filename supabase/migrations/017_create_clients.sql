-- Migration 017: Table des clients
-- Gestion centralisée des clients

CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Informations principales
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(20),

    -- Informations complémentaires
    address TEXT,
    company VARCHAR(255),
    notes TEXT,

    -- Métadonnées
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour les requêtes fréquentes
CREATE INDEX idx_clients_email ON clients(email);
CREATE INDEX idx_clients_name ON clients(name);
CREATE INDEX idx_clients_created_at ON clients(created_at DESC);

-- Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_clients_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour updated_at
CREATE TRIGGER clients_updated_at
    BEFORE UPDATE ON clients
    FOR EACH ROW
    EXECUTE FUNCTION update_clients_updated_at();

-- RLS
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- Seuls les utilisateurs authentifiés peuvent accéder aux clients
CREATE POLICY "Authenticated users can read clients" ON clients
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert clients" ON clients
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update clients" ON clients
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete clients" ON clients
    FOR DELETE USING (auth.role() = 'authenticated');
