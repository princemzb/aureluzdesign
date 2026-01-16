-- Migration: Add payment_schedule column to quotes
-- This stores the custom payment schedule defined by admin

ALTER TABLE quotes ADD COLUMN IF NOT EXISTS payment_schedule JSONB DEFAULT '[{"label": "Acompte", "percentage": 30}, {"label": "Solde", "percentage": 70}]';

-- Add comment for documentation
COMMENT ON COLUMN quotes.payment_schedule IS 'Custom payment schedule with label and percentage for each installment';
