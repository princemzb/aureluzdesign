-- Migration 005: Storage bucket pour les photos
-- Ce script doit être exécuté via le dashboard Supabase ou supabase CLI

-- Créer le bucket "photos" pour le stockage des images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'photos',
  'photos',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
);

-- Politique: Tout le monde peut voir les photos (bucket public)
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'photos');

-- Politique: Seuls les utilisateurs authentifiés peuvent upload
CREATE POLICY "Authenticated users can upload photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'photos'
  AND auth.role() = 'authenticated'
);

-- Politique: Seuls les utilisateurs authentifiés peuvent supprimer
CREATE POLICY "Authenticated users can delete photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'photos'
  AND auth.role() = 'authenticated'
);
