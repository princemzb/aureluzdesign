-- Migration 012: Ajout paiement devis et factures
-- Système de validation et paiement des devis via Stripe

-- ============================================
-- Modifications table quotes
-- ============================================

-- Acompte configurable
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS deposit_percent INTEGER DEFAULT 30;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS deposit_amount DECIMAL(10,2);

-- Token de validation (URL publique sécurisée)
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS validation_token UUID DEFAULT gen_random_uuid() UNIQUE;

-- Informations paiement Stripe
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS stripe_payment_intent_id VARCHAR(255);
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS stripe_session_id VARCHAR(255);
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(10,2);

-- Index pour recherche par token
CREATE INDEX IF NOT EXISTS idx_quotes_validation_token ON quotes(validation_token);

-- ============================================
-- Fonction pour calculer le montant d'acompte
-- ============================================
CREATE OR REPLACE FUNCTION calculate_deposit_amount()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculer le montant d'acompte si le pourcentage ou le total change
    IF NEW.deposit_percent IS NOT NULL AND NEW.total IS NOT NULL THEN
        NEW.deposit_amount := ROUND((NEW.total * NEW.deposit_percent / 100)::NUMERIC, 2);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour calcul automatique de l'acompte
DROP TRIGGER IF EXISTS calculate_quote_deposit ON quotes;
CREATE TRIGGER calculate_quote_deposit
    BEFORE INSERT OR UPDATE OF deposit_percent, total ON quotes
    FOR EACH ROW
    EXECUTE FUNCTION calculate_deposit_amount();

-- ============================================
-- Table des factures
-- ============================================
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Numéro de facture auto-généré (FAC-2026-0001)
    invoice_number VARCHAR(20) NOT NULL UNIQUE,

    -- Lien avec le devis
    quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,

    -- Informations client (copiées du devis pour archivage)
    client_name VARCHAR(255) NOT NULL,
    client_email VARCHAR(255) NOT NULL,

    -- Montants
    amount DECIMAL(10,2) NOT NULL,
    vat_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL,

    -- Fichier PDF
    pdf_url TEXT,
    pdf_storage_path VARCHAR(255),

    -- Informations paiement
    payment_method VARCHAR(50) DEFAULT 'stripe',
    stripe_payment_intent_id VARCHAR(255),

    -- Dates
    created_at TIMESTAMPTZ DEFAULT NOW(),
    sent_at TIMESTAMPTZ,

    -- Métadonnées
    notes TEXT
);

-- Index pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_invoices_quote_id ON invoices(quote_id);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_client_email ON invoices(client_email);

-- ============================================
-- Fonction pour générer le numéro de facture
-- ============================================
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TRIGGER AS $$
DECLARE
    year_part VARCHAR(4);
    sequence_num INTEGER;
BEGIN
    year_part := TO_CHAR(NOW(), 'YYYY');

    SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 5 FOR 4) AS INTEGER)), 0) + 1
    INTO sequence_num
    FROM invoices
    WHERE invoice_number LIKE 'FAC-' || year_part || '-%';

    NEW.invoice_number := 'FAC-' || year_part || '-' || LPAD(sequence_num::TEXT, 4, '0');

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour générer automatiquement le numéro de facture
DROP TRIGGER IF EXISTS set_invoice_number ON invoices;
CREATE TRIGGER set_invoice_number
    BEFORE INSERT ON invoices
    FOR EACH ROW
    WHEN (NEW.invoice_number IS NULL OR NEW.invoice_number = '')
    EXECUTE FUNCTION generate_invoice_number();

-- ============================================
-- RLS pour invoices
-- ============================================
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Admin peut tout faire
CREATE POLICY "Authenticated users can read invoices" ON invoices
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert invoices" ON invoices
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update invoices" ON invoices
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Service role peut tout faire (pour les webhooks)
CREATE POLICY "Service role full access invoices" ON invoices
    USING (auth.role() = 'service_role');

-- ============================================
-- Politique pour accès public aux devis par token
-- ============================================
CREATE POLICY "Public can read quotes by token" ON quotes
    FOR SELECT USING (
        validation_token IS NOT NULL
        AND validation_token = current_setting('app.current_quote_token', true)::UUID
    );

-- ============================================
-- Mise à jour des devis existants
-- ============================================
-- Générer des tokens pour les devis existants qui n'en ont pas
UPDATE quotes
SET validation_token = gen_random_uuid()
WHERE validation_token IS NULL;

-- Calculer les montants d'acompte pour les devis existants
UPDATE quotes
SET deposit_amount = ROUND((total * deposit_percent / 100)::NUMERIC, 2)
WHERE deposit_amount IS NULL AND total IS NOT NULL;
