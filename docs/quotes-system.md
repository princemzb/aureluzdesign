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
| `components/admin/quote-form.tsx` | Formulaire de creation/edition |
| `components/admin/quotes-list.tsx` | Liste des devis |
| `components/admin/quote-actions.tsx` | Actions (envoyer, accepter, etc.) |
| `components/admin/quote-preview.tsx` | Apercu du devis |
| `lib/actions/quotes.actions.ts` | Server Actions |
| `lib/services/quotes.service.ts` | Service metier |
| `supabase/migrations/007_create_quotes.sql` | Schema SQL |

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

### 5. Workflow de Statuts

```
draft ────► sent ────► accepted
              │
              └──────► rejected
              │
              └──────► expired (auto)
```

```typescript
export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
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
    expires_at TIMESTAMPTZ
);
```

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

## Maintenance

### Statistiques disponibles

```typescript
export async function getQuoteStats() {
  return {
    total: 10,           // Nombre total de devis
    draft: 3,            // Brouillons
    sent: 4,             // Envoyes en attente
    accepted: 3,         // Acceptes
    totalRevenue: 15000, // CA total (devis acceptes)
  };
}
```

### Problemes courants

| Probleme | Cause | Solution |
|----------|-------|----------|
| Numero de devis duplique | Concurrence | Contrainte UNIQUE en base |
| Totaux incorrects | Calcul manuel | Toujours utiliser `calculateTotals` |
| Items non sauvegardes | Format JSON invalide | Verifier la serialisation |

### Checklist avant envoi au client

- [ ] Verifier les informations client
- [ ] Verifier les lignes et les prix
- [ ] Verifier le taux de TVA
- [ ] Ajouter des notes si necessaire
- [ ] Previsualiser le devis
