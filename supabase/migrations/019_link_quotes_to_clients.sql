-- Migration 019: Lier les devis aux clients
-- Cette migration :
-- 1. Ajoute la colonne client_id aux devis
-- 2. Crée des clients à partir des devis existants
-- 3. Met à jour les devis avec les client_id correspondants
-- 4. Rend la colonne client_id NOT NULL

-- Étape 1: Ajouter la colonne client_id (nullable pour la migration)
ALTER TABLE quotes ADD COLUMN client_id UUID REFERENCES clients(id);

-- Étape 2: Créer des clients à partir des emails uniques des devis existants
-- Pour chaque email unique, on prend le nom et téléphone du devis le plus récent
INSERT INTO clients (name, email, phone, created_at)
SELECT DISTINCT ON (client_email)
    client_name as name,
    client_email as email,
    client_phone as phone,
    created_at
FROM quotes
WHERE client_email IS NOT NULL AND client_email != ''
ORDER BY client_email, created_at DESC
ON CONFLICT (email) DO NOTHING;

-- Étape 3: Mettre à jour les devis avec les client_id correspondants
UPDATE quotes q
SET client_id = c.id
FROM clients c
WHERE q.client_email = c.email;

-- Étape 4: Rendre client_id NOT NULL (une fois que tous les devis existants ont un client)
-- Note: Si certains devis n'ont pas d'email valide, cette étape peut échouer
-- Dans ce cas, il faudra gérer ces cas manuellement
ALTER TABLE quotes ALTER COLUMN client_id SET NOT NULL;

-- Étape 5: Ajouter un index pour les requêtes par client
CREATE INDEX idx_quotes_client_id ON quotes(client_id);

-- Étape 6: Ajouter une contrainte de clé étrangère avec ON DELETE RESTRICT
-- Pour éviter de supprimer un client qui a des devis
ALTER TABLE quotes DROP CONSTRAINT IF EXISTS quotes_client_id_fkey;
ALTER TABLE quotes ADD CONSTRAINT quotes_client_id_fkey
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE RESTRICT;

-- Note: Les colonnes client_name, client_email, client_phone sont conservées
-- dans la table quotes pour l'historique et la génération de PDF.
-- Elles peuvent différer des données actuelles du client.
