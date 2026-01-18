# Systeme de Devis

## Vue d'ensemble

Systeme de creation et gestion de devis pour les clients avec :
- Creation de devis avec lignes d'articles
- Calcul automatique TVA et totaux
- Numerotation automatique (YYYY-0001)
- Workflow de statuts (brouillon -> envoye -> accepte/refuse)
- Export PDF (via email)

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              ADMIN INTERFACE                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│    ┌──────────────────────────────────────────────────────────────────────┐ │
│    │                       QuoteForm (Client Component)                    │ │
│    │                                                                       │ │
│    │   Client info │ Event info │ Items (lignes) │ Notes                  │ │
│    │                     │                                                 │ │
│    └─────────────────────┼─────────────────────────────────────────────────┘ │
│                          │                                                   │
│                          ▼                                                   │
│    ┌──────────────────────────────────────────────────────────────────────┐ │
│    │                   Server Actions (quotes.actions.ts)                  │ │
│    │                                                                       │ │
│    │   createQuote() │ updateQuote() │ updateQuoteStatus()                │ │
│    └─────────────────────┬────────────────────────────────────────────────┘ │
│                          │                                                   │
│                          ▼                                                   │
│    ┌──────────────────────────────────────────────────────────────────────┐ │
│    │                   QuotesService (Service Layer)                       │ │
│    │                                                                       │ │
│    │   - Calcul automatique des totaux                                    │ │
│    │   - Validation metier                                                │ │
│    │   - Interactions Supabase                                            │ │
│    └─────────────────────┬────────────────────────────────────────────────┘ │
│                          │                                                   │
└──────────────────────────┼───────────────────────────────────────────────────┘
                           │
┌──────────────────────────┼───────────────────────────────────────────────────┐
│                     SUPABASE                                                 │
├──────────────────────────┼───────────────────────────────────────────────────┤
│                          │                                                   │
│    ┌─────────────────────▼────────────────────────────────────────────────┐ │
│    │                         quotes                                        │ │
│    │                                                                       │ │
│    │   quote_number (auto-gen) │ items (JSONB) │ totals │ status          │ │
│    └───────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│    ┌───────────────────────────────────────────────────────────────────────┐ │
│    │                    Trigger: generate_quote_number()                   │ │
│    │                    Format: YYYY-0001, YYYY-0002, etc.                 │ │
│    └───────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

## Fichiers impliques

| Fichier | Role |
|---------|------|
| `components/admin/quote-form.tsx` | Formulaire de creation/edition avec echeancier |
| `components/admin/quotes-list.tsx` | Liste des devis avec badges statuts |
| `components/admin/quote-actions.tsx` | Actions (envoyer, accepter, etc.) |
| `components/admin/quote-preview.tsx` | Apercu du devis avec echeancier |
| `components/quotes/quote-validation-client.tsx` | Page client acceptation/paiement |
| `lib/actions/quotes.actions.ts` | Server Actions (acceptQuote, createCheckout...) |
| `lib/services/quotes.service.ts` | Service metier (markAsAccepted, markAsPaid...) |
| `app/(public)/devis/[token]/page.tsx` | Page publique de validation |
| `supabase/migrations/007_create_quotes.sql` | Schema SQL initial |
| `supabase/migrations/015_add_accepted_at_to_quotes.sql` | Ajout colonne accepted_at |

## Concepts cles

### 1. Service Layer Pattern

Les devis utilisent une couche service separee pour la logique metier :

```
Server Action -> Service -> Supabase
```

```typescript
// lib/actions/quotes.actions.ts
export async function createQuote(input: CreateQuoteInput) {
  try {
    const quote = await QuotesService.create(input);  // Delegation au service
    revalidatePath('/admin/devis');
    return { success: true, quote };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
```

```typescript
// lib/services/quotes.service.ts
export class QuotesService {
  static async create(input: CreateQuoteInput): Promise<Quote> {
    const supabase = createAdminClient();

    // Logique metier : calcul des totaux
    const { items, subtotal, vatAmount, total } = this.calculateTotals(
      input.items,
      input.vat_rate
    );

    // Insertion en base
    const { data, error } = await supabase.from('quotes').insert({ ... });

    if (error) throw new Error('Erreur lors de la creation');
    return data;
  }
}
```

**Avantages du pattern Service :**
- Separation des responsabilites (actions = orchestration, service = metier)
- Logique metier reutilisable
- Tests plus faciles (service mockable)
- Code plus lisible

### 2. Calcul Automatique des Totaux

Le service calcule automatiquement les totaux lors de la creation/modification :

```typescript
private static calculateTotals(
  items: Omit<QuoteItem, 'id' | 'total'>[],
  vatRate: number
): { items: QuoteItem[]; subtotal: number; vatAmount: number; total: number } {

  // Ajouter ID unique et calculer total par ligne
  const processedItems: QuoteItem[] = items.map((item) => ({
    ...item,
    id: this.generateItemId(),
    total: item.quantity * item.unit_price,
  }));

  // Sous-total HT
  const subtotal = processedItems.reduce((sum, item) => sum + item.total, 0);

  // Montant TVA
  const vatAmount = subtotal * (vatRate / 100);

  // Total TTC
  const total = subtotal + vatAmount;

  return {
    items: processedItems,
    subtotal: Math.round(subtotal * 100) / 100,  // Arrondi 2 decimales
    vatAmount: Math.round(vatAmount * 100) / 100,
    total: Math.round(total * 100) / 100,
  };
}
```

### 3. Items en JSONB

Les lignes du devis sont stockees en JSON dans une seule colonne :

```sql
items JSONB NOT NULL DEFAULT '[]'
```

Structure d'un item :
```typescript
interface QuoteItem {
  id: string;           // ID unique genere
  description: string;  // Description de la prestation
  quantity: number;     // Quantite
  unit_price: number;   // Prix unitaire HT
  total: number;        // quantity * unit_price
}
```

**Avantages du JSONB :**
- Pas besoin de table separee `quote_items`
- Lecture/ecriture atomique
- Flexible (ajouter des champs sans migration)

**Inconvenients :**
- Pas de contraintes de base sur les items
- Requetes sur les items plus complexes

### 4. Numerotation Automatique via Trigger

Le numero de devis est genere automatiquement par un trigger PostgreSQL :

```sql
CREATE OR REPLACE FUNCTION generate_quote_number()
RETURNS TRIGGER AS $$
DECLARE
    year_part VARCHAR(4);
    sequence_num INTEGER;
BEGIN
    year_part := TO_CHAR(NOW(), 'YYYY');

    -- Trouver le prochain numero pour cette annee
    SELECT COALESCE(MAX(CAST(SUBSTRING(quote_number FROM 6) AS INTEGER)), 0) + 1
    INTO sequence_num
    FROM quotes
    WHERE quote_number LIKE year_part || '-%';

    NEW.quote_number := year_part || '-' || LPAD(sequence_num::TEXT, 4, '0');

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_quote_number
    BEFORE INSERT ON quotes
    FOR EACH ROW
    WHEN (NEW.quote_number IS NULL OR NEW.quote_number = '')
    EXECUTE FUNCTION generate_quote_number();
```

**Resultat :**
- Premier devis 2024 : `2024-0001`
- Deuxieme devis 2024 : `2024-0002`
- Premier devis 2025 : `2025-0001`

### 5. Envoi de Devis par Email avec Pieces Jointes

Lors de l'envoi d'un devis, l'admin peut ajouter des pieces jointes supplementaires :

```typescript
// components/admin/quote-actions.tsx
const [attachments, setAttachments] = useState<File[]>([]);

// Conversion en base64 avant envoi
const attachmentData = await Promise.all(
  attachments.map(async (file) => {
    const buffer = await file.arrayBuffer();
    const base64 = btoa(
      new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
    );
    return { filename: file.name, content: base64 };
  })
);

// Envoi via API
await fetch(`/api/quotes/${quote.id}/send`, {
  method: 'POST',
  body: JSON.stringify({
    subject: emailSubject,
    body: emailBody,
    attachments: attachmentData,  // Pieces jointes additionnelles
  }),
});
```

**Dans l'API `/api/quotes/[id]/send/route.ts` :**
```typescript
// Le PDF du devis est TOUJOURS joint automatiquement
const emailAttachments = [
  { filename: `devis-${quote.quote_number}.pdf`, content: pdfBuffer },
];

// Ajout des pieces jointes additionnelles (conversion base64 -> Buffer)
for (const att of additionalAttachments) {
  emailAttachments.push({
    filename: att.filename,
    content: Buffer.from(att.content, 'base64'),
  });
}
```

**UI dans quote-actions.tsx :**
- Section "Pieces jointes" dans le modal d'envoi
- Le PDF du devis est toujours joint automatiquement (non supprimable)
- Bouton "Ajouter une piece jointe" pour fichiers additionnels
- Liste des fichiers avec nom, taille et bouton de suppression
- Formats acceptes : PDF, DOC, DOCX, XLS, XLSX, JPG, PNG, GIF, TXT

### 6. Workflow de Statuts

```
draft ────► sent ────► accepted ────► paid
              │
              └──────► rejected
              │
              └──────► expired (auto)
```

**Statuts :**
- `draft` : Brouillon en cours d'édition
- `sent` : Envoyé, en attente d'acceptation par le client
- `accepted` : Accepté par le client, en attente de paiement
- `paid` : Paiement(s) reçu(s)
- `rejected` : Refusé par le client
- `expired` : Délai de validité dépassé

```typescript
export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'paid' | 'rejected' | 'expired';
```

Transition vers "sent" :
```typescript
static async markAsSent(id: string): Promise<Quote> {
  const quote = await this.getById(id);
  if (!quote) throw new Error('Devis non trouve');

  // Calculer la date d'expiration
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + quote.validity_days);

  const { data } = await supabase
    .from('quotes')
    .update({
      status: 'sent',
      sent_at: new Date().toISOString(),
      expires_at: expiresAt.toISOString(),
    })
    .eq('id', id);

  return data;
}
```

## Schema de la base

```sql
CREATE TABLE quotes (
    id UUID PRIMARY KEY,
    quote_number VARCHAR(20) NOT NULL UNIQUE,  -- Auto-genere

    -- Client
    client_name VARCHAR(255) NOT NULL,
    client_email VARCHAR(255) NOT NULL,
    client_phone VARCHAR(20),

    -- Evenement
    event_date DATE,
    event_type VARCHAR(100),

    -- Contenu
    items JSONB NOT NULL DEFAULT '[]',

    -- Calculs
    vat_rate DECIMAL(5,2) DEFAULT 20.00,
    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
    vat_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    total DECIMAL(10,2) NOT NULL DEFAULT 0,

    -- Metadata
    notes TEXT,
    validity_days INTEGER DEFAULT 30,
    status quote_status DEFAULT 'draft',

    -- Dates
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    sent_at TIMESTAMPTZ,
    accepted_at TIMESTAMPTZ,          -- Date d'acceptation par le client
    expires_at TIMESTAMPTZ,

    -- Paiement
    deposit_percent INTEGER DEFAULT 30,
    deposit_amount DECIMAL(10,2),
    validation_token UUID UNIQUE,
    payment_schedule JSONB,           -- Echeancier personnalisable
    paid_at TIMESTAMPTZ,
    paid_amount DECIMAL(10,2)
);
```

---

## Partie 2 : Paiement en Ligne

### Vue d'ensemble

Le systeme permet aux clients de valider et payer leurs devis en ligne via Stripe :
- Page publique de validation avec token securise
- Paiement d'un acompte configurable (par defaut 30%)
- Generation automatique de facture apres paiement
- Email de confirmation avec facture

### Architecture Paiement

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CLIENT (Page Publique)                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│    ┌──────────────────────────────────────────────────────────────────────┐ │
│    │              /devis/[token] - QuoteValidationClient                  │ │
│    │                                                                       │ │
│    │   Apercu du devis │ Montant acompte │ Bouton "Payer"                │ │
│    └─────────────────────────────┬────────────────────────────────────────┘ │
│                                  │                                          │
│                                  ▼                                          │
│    ┌──────────────────────────────────────────────────────────────────────┐ │
│    │              createQuoteCheckoutSession (Server Action)              │ │
│    └─────────────────────────────┬────────────────────────────────────────┘ │
│                                  │                                          │
└──────────────────────────────────┼──────────────────────────────────────────┘
                                   │
                                   ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                              STRIPE                                          │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│   ┌────────────────┐    ┌────────────────┐    ┌────────────────┐            │
│   │ Checkout       │ -> │ Payment        │ -> │ Webhook        │            │
│   │ Session        │    │ Processing     │    │ Event          │            │
│   └────────────────┘    └────────────────┘    └───────┬────────┘            │
│                                                        │                     │
└────────────────────────────────────────────────────────┼─────────────────────┘
                                                         │
                                   ┌─────────────────────┘
                                   │
                                   ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                        /api/stripe/webhook                                   │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│   1. Verifier signature webhook                                              │
│   2. Marquer le devis comme paye                                             │
│   3. Creer la facture                                                        │
│   4. Envoyer email de confirmation                                           │
│                                                                               │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Fichiers impliques (Paiement)

| Fichier | Role |
|---------|------|
| `lib/stripe/client.ts` | Client Stripe (server-side) |
| `lib/services/invoices.service.ts` | Service factures CRUD + PDF |
| `lib/actions/invoices.actions.ts` | Server Actions factures |
| `app/(public)/devis/[token]/page.tsx` | Page validation publique |
| `app/(public)/devis/[token]/success/page.tsx` | Page succes paiement |
| `app/api/stripe/webhook/route.ts` | Webhook Stripe |
| `components/quotes/quote-validation-client.tsx` | Client component paiement |
| `supabase/migrations/012_add_quote_payment_and_invoices.sql` | Schema SQL |

### Concepts cles (Paiement)

#### 1. Token de Validation Securise

Chaque devis possede un token UUID unique pour l'acces public :

```typescript
// Generation automatique a la creation
ALTER TABLE quotes ADD COLUMN validation_token UUID DEFAULT gen_random_uuid() UNIQUE;

// Acces par token
static async getByToken(token: string): Promise<Quote | null> {
  const { data } = await supabase
    .from('quotes')
    .select('*')
    .eq('validation_token', token)
    .single();
  return data;
}
```

**URL publique :** `/devis/550e8400-e29b-41d4-a716-446655440000`

#### 2. Acompte Configurable

Le pourcentage d'acompte est configurable par devis :

```sql
ALTER TABLE quotes ADD COLUMN deposit_percent INTEGER DEFAULT 30;
ALTER TABLE quotes ADD COLUMN deposit_amount DECIMAL(10,2);

-- Trigger pour calcul automatique
CREATE TRIGGER calculate_quote_deposit
    BEFORE INSERT OR UPDATE OF deposit_percent, total ON quotes
    FOR EACH ROW
    EXECUTE FUNCTION calculate_deposit_amount();
```

#### 3. Session Stripe Checkout

```typescript
static async createCheckoutSession(
  quoteId: string,
  successUrl: string,
  cancelUrl: string
): Promise<{ sessionId: string; url: string }> {
  const quote = await this.getById(quoteId);
  const depositAmount = quote.deposit_amount;

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: 'eur',
        product_data: {
          name: `Acompte Devis ${quote.quote_number}`,
          description: `Acompte de ${quote.deposit_percent}%`,
        },
        unit_amount: Math.round(depositAmount * 100), // En centimes
      },
      quantity: 1,
    }],
    mode: 'payment',
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: { quote_id: quoteId },
  });

  return { sessionId: session.id, url: session.url };
}
```

#### 4. Webhook Stripe

Le webhook gere les evenements de paiement :

```typescript
// app/api/stripe/webhook/route.ts
export async function POST(request: Request) {
  const signature = headers.get('stripe-signature');
  const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;
      const quoteId = session.metadata.quote_id;

      // 1. Marquer devis comme paye
      await QuotesService.markAsPaid(quoteId, session.payment_intent, amount);

      // 2. Creer facture
      const invoice = await InvoicesService.createFromQuote(quote, paymentIntentId);

      // 3. Envoyer email
      await sendInvoiceEmail(quote, invoice);
      break;
  }
}
```

### Schema SQL (Factures)

```sql
CREATE TABLE invoices (
    id UUID PRIMARY KEY,
    invoice_number VARCHAR(20) NOT NULL UNIQUE,  -- FAC-2026-0001
    quote_id UUID NOT NULL REFERENCES quotes(id),
    client_name VARCHAR(255) NOT NULL,
    client_email VARCHAR(255) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    vat_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL,
    pdf_url TEXT,
    pdf_storage_path VARCHAR(255),
    payment_method VARCHAR(50) DEFAULT 'stripe',
    stripe_payment_intent_id VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    sent_at TIMESTAMPTZ
);
```

### Configuration Stripe

Variables d'environnement requises :

```env
STRIPE_SECRET_KEY=sk_test_xxx           # Cle secrete
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx  # Cle publique
STRIPE_WEBHOOK_SECRET=whsec_xxx         # Secret webhook
```

### Workflow Acceptation et Paiement

Le workflow se fait en deux etapes distinctes : acceptation puis paiement.

```
1. Admin envoie le devis (status: sent)
         │
         ▼
2. Client recoit email avec bouton "Consulter et accepter le devis"
         │
         ▼
3. Client ouvre /devis/[token]
         │
         ▼
4. Client clique "Accepter le devis"
   ─► status passe a "accepted"
   ─► accepted_at est renseigne
         │
         ▼
5. Page se met a jour avec bouton "Payer l'acompte"
         │
         ▼
6. Client clique "Payer l'acompte"
         │
         ▼
7. Redirect vers Stripe Checkout
         │
         ▼
8. Client complete le paiement
         │
         ▼
9. Stripe envoie webhook checkout.session.completed
         │
         ▼
10. Backend :
    - Marque devis comme "paid" + paid_at
    - Cree facture dans table invoices
    - Envoie email confirmation + facture
         │
         ▼
11. Client voit page /devis/[token]/success
```

**Avantages de ce workflow :**
- Separation claire entre accord commercial et paiement
- L'admin sait quand le client a accepte (avant meme le paiement)
- Possibilite d'envoyer des relances pour le paiement apres acceptation
- Meilleur suivi du pipeline commercial (draft → sent → accepted → paid)

---

## Points d'extension

### Ajouter un champ de remise

1. Modifier le schema :
```sql
ALTER TABLE quotes ADD COLUMN discount_percent DECIMAL(5,2) DEFAULT 0;
```

2. Modifier `calculateTotals` dans le service :
```typescript
const discountAmount = subtotal * (discountPercent / 100);
const subtotalAfterDiscount = subtotal - discountAmount;
const vatAmount = subtotalAfterDiscount * (vatRate / 100);
```

### Ajouter PayPal comme methode de paiement

1. Ajouter le SDK PayPal
2. Creer `lib/paypal/client.ts`
3. Ajouter methode `createPayPalOrder` dans `QuotesService`
4. Mettre a jour l'interface client avec choix de paiement

### Export PDF

L'export PDF peut etre implemente avec :
- `@react-pdf/renderer` pour generation cote client
- `puppeteer` pour generation cote serveur
- API externe (Vercel OG, html2pdf, etc.)

### Envoi automatique par email

```typescript
static async sendQuoteByEmail(id: string): Promise<void> {
  const quote = await this.getById(id);
  if (!quote) throw new Error('Devis non trouve');

  // Generer le PDF
  const pdfBuffer = await generateQuotePDF(quote);

  // Envoyer l'email avec piece jointe
  await resend.emails.send({
    to: quote.client_email,
    subject: `Devis ${quote.quote_number} - AureLuz Design`,
    attachments: [{
      filename: `devis-${quote.quote_number}.pdf`,
      content: pdfBuffer,
    }],
  });

  // Marquer comme envoye
  await this.markAsSent(id);
}
```

---

## Partie 3 : Systeme de Paiements Multi-Echeances

### Vue d'ensemble

Le systeme permet de definir un echeancier de paiements flexibles :
- Plusieurs paiements configurables (ex: 30% acompte, 40% jalon, 30% final)
- Chaque paiement a son propre lien de paiement securise
- Suivi de progression des paiements
- Generation automatique de factures PDF pour chaque paiement

### Architecture Multi-Paiements

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ADMIN - Gestion Paiements                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│    ┌──────────────────────────────────────────────────────────────────────┐ │
│    │             QuotePaymentsList (components/admin/)                    │ │
│    │                                                                      │ │
│    │   Progress bar │ Liste paiements │ Actions (envoyer, copier lien)   │ │
│    └─────────────────────┬────────────────────────────────────────────────┘ │
│                          │                                                   │
│                          ▼                                                   │
│    ┌──────────────────────────────────────────────────────────────────────┐ │
│    │             quote-payments.actions.ts (Server Actions)               │ │
│    │                                                                      │ │
│    │   sendPaymentRequest() │ createPaymentCheckoutSession()             │ │
│    └─────────────────────┬────────────────────────────────────────────────┘ │
│                          │                                                   │
│                          ▼                                                   │
│    ┌──────────────────────────────────────────────────────────────────────┐ │
│    │             QuotePaymentsService (Service Layer)                     │ │
│    │                                                                      │ │
│    │   - Gestion echeances (CRUD)                                        │ │
│    │   - Generation tokens de paiement                                   │ │
│    │   - Creation sessions Stripe par echeance                           │ │
│    └─────────────────────┬────────────────────────────────────────────────┘ │
│                          │                                                   │
└──────────────────────────┼───────────────────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                            SUPABASE                                          │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│   ┌──────────────────────────────────────────────────────────────────────┐  │
│   │                        quote_payments                                 │  │
│   │                                                                       │  │
│   │   id │ quote_id │ payment_number │ label │ amount │ percentage │     │  │
│   │   status │ validation_token │ paid_at │ stripe_payment_intent_id     │  │
│   └──────────────────────────────────────────────────────────────────────┘  │
│                                                                               │
│   ┌──────────────────────────────────────────────────────────────────────┐  │
│   │                    quote_payment_summary (VIEW)                       │  │
│   │                                                                       │  │
│   │   Calcule automatiquement : total_paid, remaining, payment_status    │  │
│   └──────────────────────────────────────────────────────────────────────┘  │
│                                                                               │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Fichiers impliques (Multi-Paiements)

| Fichier | Role |
|---------|------|
| `lib/services/quote-payments.service.ts` | Service CRUD echeances |
| `lib/actions/quote-payments.actions.ts` | Server Actions paiements |
| `components/admin/quote-payments-list.tsx` | UI admin echeancier |
| `app/(public)/paiement/[token]/page.tsx` | Page publique paiement |
| `app/(public)/paiement/[token]/success/page.tsx` | Page succes |
| `supabase/migrations/013_quote_payments.sql` | Schema SQL |

### Schema SQL (Paiements)

```sql
CREATE TABLE IF NOT EXISTS quote_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
    payment_number INT NOT NULL DEFAULT 1,
    label VARCHAR(100) NOT NULL DEFAULT 'Paiement',
    amount DECIMAL(10,2) NOT NULL,
    percentage DECIMAL(5,2),
    due_date DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    validation_token UUID UNIQUE,
    stripe_session_id VARCHAR(255),
    stripe_payment_intent_id VARCHAR(255),
    paid_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(quote_id, payment_number)
);

-- Vue pour les statistiques de paiement
CREATE OR REPLACE VIEW quote_payment_summary AS
SELECT
    quote_id,
    COUNT(*) as total_payments,
    COUNT(*) FILTER (WHERE status = 'paid') as paid_payments,
    COALESCE(SUM(amount), 0) as total,
    COALESCE(SUM(amount) FILTER (WHERE status = 'paid'), 0) as total_paid,
    COALESCE(SUM(amount) FILTER (WHERE status != 'paid'), 0) as remaining_amount,
    CASE
        WHEN COUNT(*) FILTER (WHERE status = 'paid') = COUNT(*) THEN 'fully_paid'
        WHEN COUNT(*) FILTER (WHERE status = 'paid') > 0 THEN 'partially_paid'
        ELSE 'unpaid'
    END as payment_status
FROM quote_payments
GROUP BY quote_id;
```

### Workflow Multi-Paiements

```
1. Admin envoie le devis (status: sent)
   ─► Client recoit email avec bouton "Accepter"
         │
         ▼
2. Client accepte le devis (status: accepted)
   ─► Echeancier de paiement cree selon payment_schedule
         │
         ▼
3. Admin clique "Envoyer demande de paiement" sur echeance #1
   ─► Token genere, email envoye au client
         │
         ▼
4. Client ouvre /paiement/[token]
   ─► Voit progression + montant a payer
         │
         ▼
5. Client clique "Payer"
   ─► Redirect Stripe Checkout
         │
         ▼
6. Paiement reussi
   ─► Webhook marque echeance comme "paid"
   ─► Facture PDF generee et envoyee
   ─► Si tous les paiements recus : status devis = "paid"
         │
         ▼
7. Admin peut envoyer demande pour echeance suivante
```

**Suivi des paiements :**
La vue `quote_payment_summary` calcule automatiquement :
- `payment_status` : 'unpaid' | 'partially_paid' | 'fully_paid'
- `total_paid` : Montant total deja paye
- `remaining_amount` : Montant restant a payer

Le statut du devis reste a `accepted` pendant les paiements partiels,
et passe a `paid` une fois que tous les paiements sont recus.

### Generation PDF Factures (pdf-lib)

Les factures sont generees en vrai PDF avec la librairie `pdf-lib` :

```typescript
// lib/services/invoices.service.ts
static async generatePdfBuffer(invoice: Invoice, quote: Quote): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]); // A4

  // Charger polices
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Logo AureLuz
  const logoBytes = fs.readFileSync(path.join(process.cwd(), 'public/images/logo.png'));
  const logoImage = await pdfDoc.embedPng(logoBytes);
  page.drawImage(logoImage, { x: 50, y: 760, width: 80, height: 40 });

  // Titre FACTURE
  page.drawText('FACTURE', { x: 450, y: 780, size: 24, font: helveticaBold, color: gold });
  page.drawText(invoice.invoice_number, { x: 450, y: 760, size: 12, font: helvetica });

  // Informations client
  page.drawText(invoice.client_name, { x: 50, y: 680, size: 12, font: helveticaBold });
  page.drawText(invoice.client_email, { x: 50, y: 665, size: 10, font: helvetica });

  // Tableau prestations
  // ... lignes avec description, montants

  // Totaux avec encadre dore
  page.drawRectangle({ x: 350, y: 200, width: 200, height: 28, color: gold });
  page.drawText(`Total TTC: ${formatCurrency(invoice.total_amount)}`, { ... });

  // Badge "Paiement recu"
  page.drawRectangle({ x: 50, y: 100, width: 500, height: 50, color: lightGreen });
  page.drawText('✓ PAIEMENT REÇU', { x: 65, y: 130, color: green });

  // Footer
  page.drawText('AureLuz Design - contact@aureluzdesign.fr', { x: 200, y: 30 });

  return Buffer.from(await pdfDoc.save());
}
```

### Email avec PDF

Le service email attache le vrai PDF :

```typescript
// lib/services/email.service.ts
export async function sendInvoiceEmail(quote: Quote, invoice: Invoice) {
  // Generer le PDF
  const pdfBuffer = await InvoicesService.generatePdfBuffer(invoice, quote);

  return sendEmailWithAttachment({
    to: invoice.client_email,
    subject: `Votre facture ${invoice.invoice_number} - AureLuz Design`,
    html: getInvoiceEmailHtml(invoice, quote),
    attachments: [{
      filename: `Facture-${invoice.invoice_number}.pdf`,
      content: pdfBuffer,
    }],
  });
}
```

---

## Maintenance

### Statistiques disponibles

```typescript
export async function getQuoteStats() {
  return {
    total: 10,           // Nombre total de devis
    draft: 3,            // Brouillons
    sent: 4,             // Envoyes en attente d'acceptation
    accepted: 2,         // Acceptes, en attente de paiement
    paid: 1,             // Payes (partiellement ou totalement)
    totalRevenue: 15000, // CA total (devis acceptes + payes)
  };
}
```

### Problemes courants

| Probleme | Cause | Solution |
|----------|-------|----------|
| Numero de devis duplique | Concurrence | Contrainte UNIQUE en base |
| Totaux incorrects | Calcul manuel | Toujours utiliser `calculateTotals` |
| Items non sauvegardes | Format JSON invalide | Verifier la serialisation |
| Erreur PDF "WinAnsi cannot encode" | Espaces insécables Unicode (U+202F) dans formatage devise FR | Utiliser `formatCurrencyForPdf()` qui remplace les espaces spéciaux |
| Input file ne fonctionne qu'une fois dans un modal | React ne recrée pas l'input après sélection | Utiliser `key={file-input-${count}}` pour forcer React à recréer l'élément |

### Note technique : Input file dans les modals

Lors de l'ajout de pièces jointes dans un modal, l'input file peut ne fonctionner qu'une seule fois. Cela est dû au fait que React réutilise le même élément DOM après la mise à jour du state.

**Solution :** Utiliser une clé dynamique basée sur le nombre de fichiers :

```typescript
<input
  key={`file-input-${attachments.length}`}  // Force React à recréer l'input
  type="file"
  multiple
  onChange={(e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setAttachments((prev) => [...prev, ...Array.from(files)]);
    }
    // PAS BESOIN de e.target.value = '' avec cette approche
  }}
/>
```

Cette technique force React à détruire et recréer l'élément input à chaque ajout de fichier, garantissant un comportement cohérent.

### Notes techniques PDF

La génération PDF utilise `pdf-lib` avec les polices standards (Helvetica). Ces polices utilisent l'encodage WinAnsi qui ne supporte pas certains caractères Unicode comme l'espace insécable étroit (U+202F) utilisé par `Intl.NumberFormat('fr-FR')`.

**Solution :** Helper `formatCurrencyForPdf()` dans les routes PDF :
```typescript
function formatCurrencyForPdf(amount: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })
    .format(amount)
    .replace(/\u202F/g, ' ')  // Narrow no-break space → regular space
    .replace(/\u00A0/g, ' '); // No-break space → regular space
}
```

**Position du logo :** Uniformisée à `y - logoDims.height + 45` avec échelle 0.3 dans tous les fichiers :
- `app/api/quotes/[id]/pdf/route.ts`
- `app/api/quotes/[id]/send/route.ts`
- `lib/services/invoices.service.ts`

### Checklist avant envoi au client

- [ ] Verifier les informations client
- [ ] Verifier les lignes et les prix
- [ ] Verifier le taux de TVA
- [ ] Ajouter des notes si necessaire
- [ ] Previsualiser le devis
