-- Migration: Permettre la suppression en cascade des devis lors de la suppression d'un client
-- Les factures sont déjà en CASCADE sur les devis, donc elles seront supprimées automatiquement
-- Les tâches sont déjà en CASCADE sur les clients

-- 1. Supprimer la contrainte existante (RESTRICT)
ALTER TABLE quotes DROP CONSTRAINT IF EXISTS quotes_client_id_fkey;

-- 2. Recréer avec CASCADE
ALTER TABLE quotes
ADD CONSTRAINT quotes_client_id_fkey
FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE;
