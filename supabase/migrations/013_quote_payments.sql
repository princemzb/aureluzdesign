-- Table pour gérer les paiements multiples d'un devis
CREATE TABLE IF NOT EXISTS quote_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,

  -- Informations de l'échéance
  payment_number INT NOT NULL DEFAULT 1,
  label VARCHAR(100) NOT NULL DEFAULT 'Paiement',
  description TEXT,

  -- Montant
  amount DECIMAL(10,2) NOT NULL,
  percentage DECIMAL(5,2), -- Pourcentage du total (optionnel, pour référence)

  -- Dates
  due_date DATE, -- Date d'échéance prévue
  sent_at TIMESTAMP WITH TIME ZONE, -- Quand la demande de paiement a été envoyée
  paid_at TIMESTAMP WITH TIME ZONE, -- Quand le paiement a été reçu

  -- Statut
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'paid', 'cancelled')),

  -- Stripe
  stripe_session_id VARCHAR(255),
  stripe_payment_intent_id VARCHAR(255),

  -- Token pour le lien de paiement public
  validation_token UUID UNIQUE,

  -- Métadonnées
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Contrainte d'unicité pour l'ordre des paiements par devis
  UNIQUE(quote_id, payment_number)
);

-- Index pour les requêtes courantes
CREATE INDEX idx_quote_payments_quote_id ON quote_payments(quote_id);
CREATE INDEX idx_quote_payments_status ON quote_payments(status);
CREATE INDEX idx_quote_payments_validation_token ON quote_payments(validation_token);
CREATE INDEX idx_quote_payments_due_date ON quote_payments(due_date);

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_quote_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_quote_payments_updated_at
  BEFORE UPDATE ON quote_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_quote_payments_updated_at();

-- Fonction pour créer automatiquement l'échéancier par défaut (acompte 30% + solde 70%)
CREATE OR REPLACE FUNCTION create_default_payment_schedule(p_quote_id UUID)
RETURNS VOID AS $$
DECLARE
  v_quote RECORD;
BEGIN
  SELECT * INTO v_quote FROM quotes WHERE id = p_quote_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Quote not found';
  END IF;

  -- Supprimer les anciens paiements pending
  DELETE FROM quote_payments WHERE quote_id = p_quote_id AND status = 'pending';

  -- Créer l'acompte (30%)
  INSERT INTO quote_payments (quote_id, payment_number, label, amount, percentage, status)
  VALUES (
    p_quote_id,
    1,
    'Acompte',
    ROUND(v_quote.total * COALESCE(v_quote.deposit_percent, 30) / 100, 2),
    COALESCE(v_quote.deposit_percent, 30),
    'pending'
  );

  -- Créer le solde (70%)
  INSERT INTO quote_payments (quote_id, payment_number, label, amount, percentage, status)
  VALUES (
    p_quote_id,
    2,
    'Solde',
    ROUND(v_quote.total * (100 - COALESCE(v_quote.deposit_percent, 30)) / 100, 2),
    100 - COALESCE(v_quote.deposit_percent, 30),
    'pending'
  );
END;
$$ LANGUAGE plpgsql;

-- Vue pour avoir le résumé des paiements par devis
CREATE OR REPLACE VIEW quote_payment_summary AS
SELECT
  q.id AS quote_id,
  q.quote_number,
  q.total,
  COUNT(qp.id) AS total_payments,
  COUNT(qp.id) FILTER (WHERE qp.status = 'paid') AS paid_payments,
  COALESCE(SUM(qp.amount) FILTER (WHERE qp.status = 'paid'), 0) AS total_paid,
  q.total - COALESCE(SUM(qp.amount) FILTER (WHERE qp.status = 'paid'), 0) AS remaining_amount,
  CASE
    WHEN COUNT(qp.id) = COUNT(qp.id) FILTER (WHERE qp.status = 'paid') THEN 'fully_paid'
    WHEN COUNT(qp.id) FILTER (WHERE qp.status = 'paid') > 0 THEN 'partially_paid'
    ELSE 'unpaid'
  END AS payment_status
FROM quotes q
LEFT JOIN quote_payments qp ON q.id = qp.quote_id
GROUP BY q.id, q.quote_number, q.total;

-- Migrer les données existantes: créer des entrées de paiement pour les devis déjà payés
DO $$
DECLARE
  v_quote RECORD;
BEGIN
  FOR v_quote IN SELECT * FROM quotes WHERE paid_at IS NOT NULL LOOP
    -- Créer l'entrée de paiement d'acompte comme "paid"
    INSERT INTO quote_payments (
      quote_id,
      payment_number,
      label,
      amount,
      percentage,
      status,
      paid_at,
      stripe_payment_intent_id
    )
    VALUES (
      v_quote.id,
      1,
      'Acompte',
      COALESCE(v_quote.paid_amount, ROUND(v_quote.total * COALESCE(v_quote.deposit_percent, 30) / 100, 2)),
      COALESCE(v_quote.deposit_percent, 30),
      'paid',
      v_quote.paid_at,
      v_quote.stripe_payment_intent_id
    )
    ON CONFLICT (quote_id, payment_number) DO NOTHING;

    -- Créer l'entrée pour le solde comme "pending"
    INSERT INTO quote_payments (
      quote_id,
      payment_number,
      label,
      amount,
      percentage,
      status
    )
    VALUES (
      v_quote.id,
      2,
      'Solde',
      v_quote.total - COALESCE(v_quote.paid_amount, ROUND(v_quote.total * COALESCE(v_quote.deposit_percent, 30) / 100, 2)),
      100 - COALESCE(v_quote.deposit_percent, 30),
      'pending'
    )
    ON CONFLICT (quote_id, payment_number) DO NOTHING;
  END LOOP;
END;
$$;

-- RLS policies
ALTER TABLE quote_payments ENABLE ROW LEVEL SECURITY;

-- Politique pour les utilisateurs authentifiés (admin)
CREATE POLICY "Admin can manage quote payments"
  ON quote_payments
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Politique pour les accès publics via le token
CREATE POLICY "Public can view payments by token"
  ON quote_payments
  FOR SELECT
  TO anon
  USING (validation_token IS NOT NULL);
