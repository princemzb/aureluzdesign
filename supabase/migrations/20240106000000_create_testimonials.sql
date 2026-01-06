-- Create testimonials table
CREATE TABLE testimonials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name VARCHAR(255) NOT NULL,
  client_email VARCHAR(255) NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  event_date DATE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  photo_url TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  approved_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX idx_testimonials_status ON testimonials(status);
CREATE INDEX idx_testimonials_created_at ON testimonials(created_at DESC);

-- Enable RLS
ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read approved testimonials
CREATE POLICY "Anyone can read approved testimonials"
  ON testimonials FOR SELECT
  USING (status = 'approved');

-- Policy: Anyone can insert testimonials (will be pending)
CREATE POLICY "Anyone can submit testimonials"
  ON testimonials FOR INSERT
  WITH CHECK (status = 'pending');

-- Policy: Service role can do everything
CREATE POLICY "Service role full access to testimonials"
  ON testimonials
  USING (auth.role() = 'service_role');

-- Add comment
COMMENT ON TABLE testimonials IS 'Client testimonials for AureLuz events';
