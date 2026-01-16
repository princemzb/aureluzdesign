-- Migration: Add accepted_at column to quotes
-- This stores when the client accepted the quote

ALTER TABLE quotes ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN quotes.accepted_at IS 'Timestamp when the client accepted the quote';
