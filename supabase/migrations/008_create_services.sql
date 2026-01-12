-- Create services table for configurable service cards
CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  emoji VARCHAR(10) NOT NULL DEFAULT '✨',
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for ordering
CREATE INDEX idx_services_display_order ON services(display_order);
CREATE INDEX idx_services_active ON services(is_active);

-- Enable RLS
ALTER TABLE services ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read active services
CREATE POLICY "Anyone can read active services"
  ON services FOR SELECT
  USING (is_active = true);

-- Policy: Service role can do everything
CREATE POLICY "Service role full access to services"
  ON services
  USING (auth.role() = 'service_role');

-- Insert default services
INSERT INTO services (emoji, title, description, display_order) VALUES
(
  '💍',
  'Mariage',
  'Bien plus qu''une décoration, une signature visuelle complète. Nous concevons l''ambiance de votre cérémonie et de votre réception dans les moindres détails (fleurs, mobilier, mise en scène). De la conception à la dépose le jour J, nous donnons vie à vos rêves pendant que vous profitez de vos invités.',
  1
),
(
  '🎂',
  'Événements spéciaux',
  'L''art de transformer un simple repas en une expérience esthétique et mémorable. De l''intimité d''un dîner de fiançailles à la joie d''une baby shower, en passant par vos anniversaires et EVJF chic, nous créons un écrin sur-mesure pour vos plus beaux souvenirs. Une ambiance élégante et conviviale, jusque dans les moindres détails.',
  2
),
(
  '💡',
  'Accompagnement "Do It Yourself"',
  'L''art de faire soi-même, avec l''œil d''une experte. Pour les mariés créatifs et les organisateurs qui souhaitent piloter leur décoration, nous vous offrons une boussole esthétique. Ensemble, nous définissons une vision cohérente et impactante pour donner vie à votre projet, avec l''assurance d''un résultat professionnel.',
  3
);

-- Add comment
COMMENT ON TABLE services IS 'Configurable service cards displayed on the homepage';
