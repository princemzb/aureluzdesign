-- Create email_templates table for editable email content
CREATE TABLE email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  subject VARCHAR(500) NOT NULL,
  content JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for slug lookup
CREATE INDEX idx_email_templates_slug ON email_templates(slug);

-- Enable RLS
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

-- Policy: Service role can do everything
CREATE POLICY "Service role full access to email templates"
  ON email_templates
  USING (auth.role() = 'service_role');

-- Insert default salon campaign template
INSERT INTO email_templates (slug, name, subject, content) VALUES
(
  'salon-mariage',
  'Campagne Salon du Mariage',
  'Suite à notre rencontre au Salon du Mariage - AureLuz',
  '{
    "greeting": "Bonjour {name},",
    "paragraphs": [
      "C''était un réel plaisir de vous rencontrer lors du Salon du Mariage !",
      "J''espère que cette journée vous a inspiré pour votre futur événement. Comme promis, je reviens vers vous pour vous accompagner dans la création d''une décoration unique et à votre image.",
      "Je serais ravie d''échanger avec vous sur votre projet et de vous présenter mes différentes prestations lors d''un rendez-vous personnalisé."
    ],
    "ctaText": "Prendre rendez-vous",
    "instagramText": "N''hésitez pas à me suivre sur Instagram pour découvrir mes dernières réalisations !",
    "signatureName": "Aurélie",
    "signatureTitle": "Fondatrice d''AureLuz Design"
  }'::jsonb
);

-- Add comment
COMMENT ON TABLE email_templates IS 'Editable email templates for campaigns';
