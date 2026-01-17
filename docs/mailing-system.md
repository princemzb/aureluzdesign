# Systeme de Mailing

## Vue d'ensemble

Systeme d'envoi d'emails transactionnels et marketing avec :
- Emails de confirmation de reservation
- Notifications admin
- Campagnes marketing (salon du mariage)
- Templates personnalisables
- Detection Gmail pour optimiser la delivrabilite

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              APPLICATION                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│    TRANSACTIONNEL                          MARKETING                         │
│    ┌────────────────────┐                 ┌────────────────────┐            │
│    │ Booking Confirm    │                 │ Mailing Campaign   │            │
│    │ Admin Notification │                 │ (Salon du Mariage) │            │
│    │ Status Update      │                 │                    │            │
│    └─────────┬──────────┘                 └─────────┬──────────┘            │
│              │                                      │                        │
│              └──────────────┬───────────────────────┘                        │
│                             │                                                │
│                    ┌────────▼────────┐                                       │
│                    │  Email Service  │                                       │
│                    │  (email.service)│                                       │
│                    └────────┬────────┘                                       │
│                             │                                                │
│              ┌──────────────┼──────────────┐                                │
│              │              │              │                                 │
│              ▼              ▼              ▼                                 │
│    ┌─────────────┐  ┌──────────────┐  ┌────────────┐                        │
│    │ Template    │  │  Settings    │  │  Resend    │                        │
│    │ Service     │  │  Service     │  │  API       │                        │
│    │ (content)   │  │ (from email) │  │  (envoi)   │                        │
│    └─────────────┘  └──────────────┘  └────────────┘                        │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

## Fichiers impliques

| Fichier | Role |
|---------|------|
| `lib/services/email.service.ts` | Service principal d'envoi + templates HTML |
| `lib/services/email-templates.service.ts` | Gestion templates personnalisables |
| `lib/actions/mailing.actions.ts` | Server Actions pour campagnes |
| `lib/actions/email-templates.actions.ts` | Server Actions pour templates |
| `components/admin/mailing-form.tsx` | Formulaire d'envoi campagne |
| `components/admin/mailing-tabs.tsx` | Interface admin onglets |

## Concepts cles

### 1. Resend comme Provider

Resend est utilise pour l'envoi d'emails (alternative a SendGrid, Mailgun) :

```typescript
import { Resend } from 'resend';

// Initialisation paresseuse pour eviter erreurs au build
let resendClient: Resend | null = null;

function getResendClient(): Resend {
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
}

// Fonction generique d'envoi
async function sendEmail({ to, subject, html, fromEmail }) {
  const { data, error } = await getResendClient().emails.send({
    from: fromEmail,
    to,
    subject,
    html,
  });

  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true };
}
```

**Pourquoi initialisation paresseuse :**
- Evite les erreurs si `RESEND_API_KEY` n'est pas definie au build
- Le client n'est cree qu'au premier envoi reel

### 2. Templates Adaptatifs (Gmail vs Autres)

Gmail filtre les emails "trop designes" vers Promotions. Solution : 2 templates :

```typescript
// Detection du provider
function isGmailAddress(email: string): boolean {
  return email.toLowerCase().endsWith('@gmail.com') ||
         email.toLowerCase().endsWith('@googlemail.com');
}

// Choix du template
const html = isGmailAddress(to)
  ? getSalonEmailTemplateSimple(name, bookingUrl, content, instagramUrl)   // Minimaliste
  : getSalonEmailTemplateDesign(name, bookingUrl, content, instagramUrl);  // Rich HTML
```

**Template Design (non-Gmail) :**
- Fond colore, logo, gradients
- Bouton CTA style
- Mise en page elaboree

**Template Simple (Gmail) :**
- Fond blanc, texte brut
- Liens textuels (pas de boutons)
- Structure minimale

### 3. Configuration Dynamique

L'email expediteur et les liens sont configurables :

```typescript
async function getEmailSettings() {
  const contactSettings = await SettingsService.getContactSettings();
  return {
    fromEmail: `AureLuz Design <${contactSettings.email}>`,
    adminEmail: contactSettings.adminEmail,
    instagram: contactSettings.instagram,
  };
}
```

**Avantages :**
- Pas de hardcoding d'adresses email
- Changement possible depuis l'admin
- Fallback sur valeurs par defaut si non configure

### 4. Templates Stockes en Base

Les templates marketing sont stockes en base pour edition sans deploiement :

```typescript
// lib/services/email-templates.service.ts
export interface EmailTemplateContent {
  greeting: string;        // "Bonjour {name},"
  paragraphs: string[];    // Corps du message
  ctaText: string;         // Texte du bouton
  instagramText: string;   // Texte avant lien Instagram
  signatureName: string;   // "Aurelie"
  signatureTitle: string;  // "Fondatrice d'AureLuz Design"
}

export class EmailTemplatesService {
  static async getSalonTemplate(): Promise<EmailTemplate | null> {
    return this.getBySlug('salon-mariage');
  }

  static async updateSalonTemplate(
    subject: string,
    content: EmailTemplateContent
  ): Promise<boolean> {
    return this.update('salon-mariage', { subject, content });
  }
}
```

### 5. Campagne avec Rate Limiting

L'envoi en masse respecte les limites Resend :

```typescript
export async function sendSalonCampaign(
  contacts: Contact[],
  attachments?: Attachment[]
): Promise<SendCampaignResult> {
  const result = { total: contacts.length, sent: 0, failed: 0, errors: [] };

  for (const contact of contacts) {
    try {
      const emailResult = await sendSalonCampaignEmail(contact.email, contact.name, attachments);

      if (emailResult.success) {
        result.sent++;
      } else {
        result.failed++;
        result.errors.push({ email: contact.email, error: emailResult.error });
      }

      // Delai entre envois pour eviter rate limiting
      await new Promise((resolve) => setTimeout(resolve, 200));

    } catch (error) {
      result.failed++;
      result.errors.push({ email: contact.email, error: error.message });
    }
  }

  result.success = result.failed === 0;
  return result;
}
```

**Pourquoi le delai :**
- Resend a des limites de rate (ex: 10 emails/seconde)
- 200ms = 5 emails/seconde (marge de securite)

### 6. Pieces Jointes

Les campagnes email supportent les pieces jointes :

```typescript
// Interface pour les pieces jointes
interface Attachment {
  filename: string;
  content: string; // base64
}

// Cote client (mailing-form.tsx)
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

// Envoi via server action
await sendSalonCampaign(contacts, attachmentData);
```

**Formats acceptes :**
- Documents : PDF, DOC, DOCX, XLS, XLSX, TXT
- Images : JPG, JPEG, PNG, GIF

**UI dans mailing-form.tsx :**
- Bouton "Ajouter une piece jointe"
- Liste des fichiers avec nom et taille
- Bouton de suppression pour chaque fichier

## Types d'Emails

### 1. Confirmation de Reservation (Transactionnel)

```typescript
export async function sendBookingConfirmation(data: BookingFormData) {
  return sendEmail({
    to: data.client_email,
    subject: 'Confirmation de votre demande de rendez-vous - AureLuz',
    html: `
      <h1>Votre demande a bien ete recue</h1>
      <p>Bonjour ${data.client_name},</p>
      <p>Date et heure: ${appointmentDate}</p>
      <p>Type d'evenement: ${eventTypeLabel}</p>
    `,
  });
}
```

### 2. Notification Admin (Transactionnel)

```typescript
export async function sendAdminNotification(data: BookingFormData) {
  return sendEmail({
    to: emailSettings.adminEmail,
    subject: `Nouvelle demande de RDV - ${data.client_name}`,
    html: `
      <h1>Nouvelle demande de rendez-vous</h1>
      <p>Client: ${data.client_name}</p>
      <p>Email: ${data.client_email}</p>
      <p>Telephone: ${data.client_phone}</p>
      <a href="/admin/appointments">Gerer dans le tableau de bord</a>
    `,
  });
}
```

### 3. Mise a jour de Statut (Transactionnel)

```typescript
export async function sendStatusUpdate(
  clientEmail: string,
  clientName: string,
  date: string,
  time: string,
  status: 'confirmed' | 'cancelled'
) {
  return sendEmail({
    to: clientEmail,
    subject: status === 'confirmed'
      ? 'Votre rendez-vous est confirme'
      : 'Information sur votre demande',
    html: `...`,
  });
}
```

### 4. Campagne Salon du Mariage (Marketing)

```typescript
export async function sendSalonCampaignEmail(to: string, name: string) {
  const template = await EmailTemplatesService.getSalonTemplate();
  const html = isGmailAddress(to)
    ? getSalonEmailTemplateSimple(name, bookingUrl, template.content)
    : getSalonEmailTemplateDesign(name, bookingUrl, template.content);

  return sendEmail({
    to,
    subject: template.subject,
    html,
  });
}
```

## Points d'extension

### Ajouter un nouveau type d'email

1. Creer la fonction dans `email.service.ts` :
```typescript
export async function sendNewEmailType(data: MyData) {
  return sendEmail({
    to: data.email,
    subject: 'Mon sujet',
    html: `<html>...</html>`,
  });
}
```

2. Creer le Server Action si necessaire dans `mailing.actions.ts`

### Ajouter un nouveau template configurable

1. Inserer le template en base :
```sql
INSERT INTO email_templates (slug, name, subject, content)
VALUES ('mon-template', 'Mon Template', 'Sujet', '{"greeting": "...", ...}');
```

2. Ajouter les methodes dans `EmailTemplatesService` :
```typescript
static async getMyTemplate() {
  return this.getBySlug('mon-template');
}
```

### Integrer un systeme de preview

Le systeme expose deja une fonction de preview :

```typescript
export async function getEmailPreview(name: string, isGmail: boolean): Promise<string> {
  return getSalonEmailPreview(name || 'Prenom', isGmail);
}
```

## Maintenance

### Variables d'environnement requises

```env
RESEND_API_KEY=re_xxxxx
NEXT_PUBLIC_APP_URL=https://aureluzdesign.fr
```

### Problemes courants

| Probleme | Cause | Solution |
|----------|-------|----------|
| Email dans Spam | Reputation domaine | Verifier SPF/DKIM dans Resend |
| Email dans Promotions (Gmail) | Template trop riche | Utiliser template simple |
| Rate limit exceeded | Trop d'envois rapides | Augmenter le delai entre envois |
| RESEND_API_KEY error | Variable non definie | Verifier .env.local |

### Monitoring

Resend fournit un dashboard pour suivre :
- Taux de delivrabilite
- Taux d'ouverture
- Bounces et plaintes
- Logs d'envoi

URL : https://resend.com/emails
