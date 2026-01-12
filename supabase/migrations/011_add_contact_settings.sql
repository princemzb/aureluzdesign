-- Add contact and social media settings
INSERT INTO site_settings (key, value, type, description) VALUES
(
  'contact_phone',
  '+33661434365',
  'text',
  'Numéro de téléphone affiché sur le site'
),
(
  'contact_email',
  'contact@aureluzdesign.fr',
  'text',
  'Email de contact public'
),
(
  'admin_email',
  'aureluzdesign@gmail.com',
  'text',
  'Email pour recevoir les notifications admin'
),
(
  'social_instagram',
  'https://www.instagram.com/aure_luz_design/',
  'text',
  'Lien vers le profil Instagram'
),
(
  'social_facebook',
  '',
  'text',
  'Lien vers la page Facebook'
),
(
  'social_linkedin',
  '',
  'text',
  'Lien vers le profil LinkedIn'
);
