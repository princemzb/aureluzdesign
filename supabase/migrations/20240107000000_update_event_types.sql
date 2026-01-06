-- Migration 007: Mise à jour des types d'événements
-- Ancien: mariage, table, autre
-- Nouveau: signature, instants, coaching

-- =============================================
-- 1. MISE À JOUR DE L'ENUM event_type (appointments)
-- =============================================

-- Créer le nouveau type enum
CREATE TYPE event_type_new AS ENUM ('signature', 'instants', 'coaching');

-- Mettre à jour la table appointments
ALTER TABLE appointments
  ALTER COLUMN event_type TYPE VARCHAR(50);

-- Migrer les données existantes
UPDATE appointments SET event_type = 'signature' WHERE event_type = 'mariage';
UPDATE appointments SET event_type = 'instants' WHERE event_type = 'table';
UPDATE appointments SET event_type = 'coaching' WHERE event_type = 'autre';

-- Convertir au nouveau type enum
ALTER TABLE appointments
  ALTER COLUMN event_type TYPE event_type_new
  USING event_type::event_type_new;

-- Supprimer l'ancien type et renommer le nouveau
DROP TYPE event_type;
ALTER TYPE event_type_new RENAME TO event_type;

-- =============================================
-- 2. MISE À JOUR DE L'ENUM photo_category (photos)
-- =============================================

-- Créer le nouveau type enum pour photos
CREATE TYPE photo_category_new AS ENUM ('signature', 'instants', 'coaching');

-- Mettre à jour la table photos
ALTER TABLE photos
  ALTER COLUMN category TYPE VARCHAR(50);

-- Migrer les données existantes
UPDATE photos SET category = 'signature' WHERE category = 'mariage';
UPDATE photos SET category = 'instants' WHERE category = 'evenement';
UPDATE photos SET category = 'coaching' WHERE category = 'table';

-- Convertir au nouveau type enum
ALTER TABLE photos
  ALTER COLUMN category TYPE photo_category_new
  USING category::photo_category_new;

-- Supprimer l'ancien type et renommer le nouveau
DROP TYPE photo_category;
ALTER TYPE photo_category_new RENAME TO photo_category;

-- =============================================
-- 3. MISE À JOUR DES TÉMOIGNAGES (event_type est VARCHAR)
-- =============================================

UPDATE testimonials SET event_type = 'Prestation Signature' WHERE event_type ILIKE '%mariage%';
UPDATE testimonials SET event_type = 'Prestation Instants Précieux' WHERE event_type ILIKE '%table%' OR event_type ILIKE '%art%';
UPDATE testimonials SET event_type = 'Coaching' WHERE event_type ILIKE '%autre%' OR event_type ILIKE '%coach%';
