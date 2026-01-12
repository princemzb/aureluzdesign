-- Create site_settings table for configurable site elements
CREATE TABLE site_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(100) UNIQUE NOT NULL,
  value TEXT,
  type VARCHAR(50) DEFAULT 'text', -- text, image, json
  description VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for key lookup
CREATE INDEX idx_site_settings_key ON site_settings(key);

-- Enable RLS
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read settings
CREATE POLICY "Anyone can read site settings"
  ON site_settings FOR SELECT
  USING (true);

-- Policy: Service role can do everything
CREATE POLICY "Service role full access to site settings"
  ON site_settings
  USING (auth.role() = 'service_role');

-- Insert default logo setting
INSERT INTO site_settings (key, value, type, description) VALUES
(
  'logo_url',
  '/images/aureluz-design-logo-decoration-evenementielle.png',
  'image',
  'Logo principal du site'
);

-- Add comment
COMMENT ON TABLE site_settings IS 'Configurable site settings (logo, etc.)';
