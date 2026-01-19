import { Resend } from 'resend';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { BookingFormData } from '@/lib/validators/booking.schema';
import type { Quote, Invoice, QuotePayment, QuotePaymentSummary } from '@/lib/types';
import { EVENT_TYPES } from '@/lib/utils/constants';
import { EmailTemplatesService, type EmailTemplateContent } from './email-templates.service';
import { SettingsService } from './settings.service';
import { InvoicesService } from './invoices.service';

// Resend client - initialisation paresseuse pour éviter les erreurs au build
let resendClient: Resend | null = null;

function getResendClient(): Resend {
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
}

// Get dynamic email settings
async function getEmailSettings() {
  const contactSettings = await SettingsService.getContactSettings();
  return {
    fromEmail: `AureLuz Design <${contactSettings.email}>`,
    adminEmail: contactSettings.adminEmail,
    instagram: contactSettings.instagram,
  };
}

// Fallback values
const DEFAULT_FROM_EMAIL = 'AureLuz Design <contact@aureluzdesign.fr>';
const DEFAULT_ADMIN_EMAIL = 'aureluzdesign@gmail.com';
const DEFAULT_INSTAGRAM = 'https://www.instagram.com/aure_luz_design/';

function getEventTypeLabel(type: string): string {
  return EVENT_TYPES.find((t) => t.value === type)?.label || type;
}

function formatAppointmentDate(date: string, time: string): string {
  const d = parseISO(date);
  const formattedDate = format(d, "EEEE d MMMM yyyy 'à' ", { locale: fr });
  return `${formattedDate}${time}`;
}

// Generic email sender using Resend
async function sendEmail({
  to,
  subject,
  html,
  fromEmail,
}: {
  to: string;
  subject: string;
  html: string;
  fromEmail?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`📧 Envoi email à ${to}...`);

    const from = fromEmail || DEFAULT_FROM_EMAIL;

    const { data, error } = await getResendClient().emails.send({
      from,
      to,
      subject,
      html,
    });

    if (error) {
      console.error('❌ Erreur Resend:', error);
      return { success: false, error: error.message };
    }

    console.log(`✅ Email envoyé avec succès (ID: ${data?.id})`);
    return { success: true };
  } catch (error) {
    console.error('❌ Erreur envoi email:', error);
    return { success: false, error: 'Failed to send email' };
  }
}

// Email sender with attachments using Resend
async function sendEmailWithAttachment({
  to,
  subject,
  html,
  fromEmail,
  attachments,
}: {
  to: string;
  subject: string;
  html: string;
  fromEmail?: string;
  attachments?: Array<{ filename: string; content: string | Buffer }>;
}): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`📧 Envoi email avec pièce jointe à ${to}...`);

    const from = fromEmail || DEFAULT_FROM_EMAIL;

    const { data, error } = await getResendClient().emails.send({
      from,
      to,
      subject,
      html,
      attachments: attachments?.map((att) => ({
        filename: att.filename,
        content: typeof att.content === 'string' ? Buffer.from(att.content) : att.content,
      })),
    });

    if (error) {
      console.error('❌ Erreur Resend:', error);
      return { success: false, error: error.message };
    }

    console.log(`✅ Email avec pièce jointe envoyé avec succès (ID: ${data?.id})`);
    return { success: true };
  } catch (error) {
    console.error('❌ Erreur envoi email avec pièce jointe:', error);
    return { success: false, error: 'Failed to send email' };
  }
}

// Generate invoice HTML for email attachment
function generateInvoicePdfHtml(invoice: Invoice, quote: Quote): string {
  const invoiceDate = format(new Date(invoice.created_at), 'dd MMMM yyyy', { locale: fr });
  const eventDateStr = quote.event_date
    ? format(parseISO(quote.event_date), 'dd/MM/yyyy', { locale: fr })
    : null;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Facture ${invoice.invoice_number}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 12px; line-height: 1.5; color: #333; padding: 40px; max-width: 800px; margin: 0 auto; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 2px solid #c9a227; }
        .logo { font-size: 28px; font-weight: bold; color: #c9a227; }
        .logo-subtitle { font-size: 12px; color: #666; margin-top: 4px; }
        .company-info { text-align: right; font-size: 11px; color: #666; line-height: 1.8; }
        .invoice-title { font-size: 32px; font-weight: bold; color: #1a1a1a; margin-bottom: 30px; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 40px; }
        .info-section { }
        .section-title { font-size: 10px; font-weight: bold; color: #999; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px; }
        .info-row { margin-bottom: 8px; }
        .info-label { color: #666; }
        .info-value { font-weight: 600; color: #1a1a1a; }
        .table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
        .table th { background: #f8f8f8; padding: 14px 16px; text-align: left; font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #e5e5e5; }
        .table td { padding: 16px; border-bottom: 1px solid #eee; }
        .table .amount { text-align: right; font-weight: 500; }
        .totals { width: 280px; margin-left: auto; background: #f8f8f8; border-radius: 8px; padding: 20px; }
        .total-row { display: flex; justify-content: space-between; padding: 8px 0; }
        .total-row.subtotal { color: #666; }
        .total-row.final { font-size: 18px; font-weight: bold; color: #1a1a1a; border-top: 2px solid #c9a227; padding-top: 16px; margin-top: 8px; }
        .payment-badge { display: inline-block; background: #dcfce7; color: #166534; padding: 8px 16px; border-radius: 20px; font-size: 12px; font-weight: 600; margin-top: 30px; }
        .payment-info { background: #f9f9f9; padding: 20px; border-radius: 8px; margin-top: 20px; font-size: 11px; color: #666; }
        .footer { margin-top: 60px; padding-top: 20px; border-top: 1px solid #eee; font-size: 10px; color: #999; text-align: center; }
        @media print {
          body { padding: 20px; }
          .payment-badge { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <div class="logo">AureLuz Design</div>
          <div class="logo-subtitle">Décoration Événementielle</div>
        </div>
        <div class="company-info">
          <p><strong>AureLuz Design</strong></p>
          <p>contact@aureluzdesign.fr</p>
          <p>+33 6 61 43 43 65</p>
          <p>www.aureluzdesign.fr</p>
        </div>
      </div>

      <h1 class="invoice-title">Facture ${invoice.invoice_number}</h1>

      <div class="info-grid">
        <div class="info-section">
          <div class="section-title">Facturé à</div>
          <div class="info-row">
            <span class="info-value" style="font-size: 16px;">${invoice.client_name}</span>
          </div>
          <div class="info-row">
            <span class="info-label">${invoice.client_email}</span>
          </div>
        </div>
        <div class="info-section">
          <div class="section-title">Informations</div>
          <div class="info-row">
            <span class="info-label">Date : </span>
            <span class="info-value">${invoiceDate}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Devis : </span>
            <span class="info-value">${quote.quote_number}</span>
          </div>
          ${eventDateStr ? `
          <div class="info-row">
            <span class="info-label">Événement : </span>
            <span class="info-value">${eventDateStr}</span>
          </div>
          ` : ''}
        </div>
      </div>

      <table class="table">
        <thead>
          <tr>
            <th style="width: 70%;">Description</th>
            <th class="amount">Montant HT</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <strong>Acompte de ${quote.deposit_percent}%</strong><br>
              <span style="color: #666; font-size: 11px;">Devis ${quote.quote_number}${quote.event_type ? ` - ${quote.event_type}` : ''}</span>
            </td>
            <td class="amount">${invoice.amount.toFixed(2)} EUR</td>
          </tr>
        </tbody>
      </table>

      <div class="totals">
        <div class="total-row subtotal">
          <span>Sous-total HT</span>
          <span>${invoice.amount.toFixed(2)} EUR</span>
        </div>
        <div class="total-row subtotal">
          <span>TVA (${quote.vat_rate}%)</span>
          <span>${invoice.vat_amount.toFixed(2)} EUR</span>
        </div>
        <div class="total-row final">
          <span>Total TTC</span>
          <span>${invoice.total_amount.toFixed(2)} EUR</span>
        </div>
      </div>

      <div style="text-align: center;">
        <div class="payment-badge">✓ Payé par carte bancaire</div>
      </div>

      <div class="payment-info">
        <p><strong>Référence de paiement :</strong> ${invoice.stripe_payment_intent_id || 'N/A'}</p>
        <p><strong>Mode de paiement :</strong> Carte bancaire via Stripe</p>
        <p><strong>Date de paiement :</strong> ${invoiceDate}</p>
      </div>

      <div class="footer">
        <p><strong>AureLuz Design</strong> - Décoration Événementielle sur mesure</p>
        <p style="margin-top: 8px;">Merci pour votre confiance !</p>
      </div>
    </body>
    </html>
  `;
}

export async function sendBookingConfirmation(
  data: BookingFormData
): Promise<{ success: boolean; error?: string }> {
  const appointmentDate = formatAppointmentDate(data.date, data.start_time);
  const eventTypeLabel = getEventTypeLabel(data.event_type);
  const emailSettings = await getEmailSettings();

  return sendEmail({
    to: data.client_email,
    subject: 'Confirmation de votre demande de rendez-vous - AureLuz',
    fromEmail: emailSettings.fromEmail,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
          .header { text-align: center; margin-bottom: 40px; }
          .logo { font-size: 28px; font-weight: 600; color: #c9a227; }
          .content { background: #fafaf8; border-radius: 12px; padding: 30px; margin-bottom: 30px; }
          .detail { margin-bottom: 16px; }
          .detail-label { font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; }
          .detail-value { font-size: 16px; font-weight: 500; margin-top: 4px; }
          .footer { text-align: center; font-size: 14px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">AureLuz Design</div>
            <p>Décoration Événementielle</p>
          </div>

          <h1 style="font-size: 24px; text-align: center; margin-bottom: 30px;">
            Votre demande a bien été reçue
          </h1>

          <p>Bonjour ${data.client_name},</p>

          <p>Nous avons bien reçu votre demande de consultation et nous vous en remercions.</p>

          <div class="content">
            <div class="detail">
              <div class="detail-label">Date et heure</div>
              <div class="detail-value">${appointmentDate}</div>
            </div>
            <div class="detail">
              <div class="detail-label">Type d'événement</div>
              <div class="detail-value">${eventTypeLabel}</div>
            </div>
            ${data.message ? `
            <div class="detail">
              <div class="detail-label">Votre message</div>
              <div class="detail-value">${data.message}</div>
            </div>
            ` : ''}
          </div>

          <p>Nous reviendrons vers vous dans les plus brefs délais pour confirmer ce rendez-vous.</p>

          <p>À très bientôt,<br><strong>L'équipe AureLuz</strong></p>

          <div class="footer">
            <p>© ${new Date().getFullYear()} AureLuz. Tous droits réservés.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  });
}

export async function sendAdminNotification(
  data: BookingFormData
): Promise<{ success: boolean; error?: string }> {
  const appointmentDate = formatAppointmentDate(data.date, data.start_time);
  const eventTypeLabel = getEventTypeLabel(data.event_type);
  const emailSettings = await getEmailSettings();

  return sendEmail({
    to: emailSettings.adminEmail || DEFAULT_ADMIN_EMAIL,
    subject: `Nouvelle demande de RDV - ${data.client_name}`,
    fromEmail: emailSettings.fromEmail,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
          .header { background: #1a1a1a; color: white; padding: 20px; border-radius: 12px 12px 0 0; }
          .content { background: #fafaf8; border-radius: 0 0 12px 12px; padding: 30px; }
          .detail { margin-bottom: 16px; padding-bottom: 16px; border-bottom: 1px solid #eee; }
          .detail:last-child { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
          .detail-label { font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; }
          .detail-value { font-size: 16px; font-weight: 500; margin-top: 4px; }
          .cta { display: inline-block; background: #c9a227; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 20px;">Nouvelle demande de rendez-vous</h1>
          </div>

          <div class="content">
            <div class="detail">
              <div class="detail-label">Client</div>
              <div class="detail-value">${data.client_name}</div>
            </div>
            <div class="detail">
              <div class="detail-label">Email</div>
              <div class="detail-value"><a href="mailto:${data.client_email}">${data.client_email}</a></div>
            </div>
            <div class="detail">
              <div class="detail-label">Téléphone</div>
              <div class="detail-value"><a href="tel:${data.client_phone}">${data.client_phone}</a></div>
            </div>
            <div class="detail">
              <div class="detail-label">Date et heure souhaitées</div>
              <div class="detail-value">${appointmentDate}</div>
            </div>
            <div class="detail">
              <div class="detail-label">Type d'événement</div>
              <div class="detail-value">${eventTypeLabel}</div>
            </div>
            ${data.message ? `
            <div class="detail">
              <div class="detail-label">Message</div>
              <div class="detail-value">${data.message}</div>
            </div>
            ` : ''}

            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://aureluzdesign.fr'}/admin/appointments" class="cta">
                Gérer dans le tableau de bord
              </a>
              <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://aureluzdesign.fr'}/meeting" class="cta" style="background: #166534;">
                Lien réunion vidéo
              </a>
            </div>
          </div>
        </div>
      </body>
      </html>
    `,
  });
}

// Détecte si l'email est Gmail
function isGmailAddress(email: string): boolean {
  return email.toLowerCase().endsWith('@gmail.com') || email.toLowerCase().endsWith('@googlemail.com');
}

// Template design complet (pour non-Gmail) - fond crème
function getSalonEmailTemplateDesign(
  name: string,
  bookingUrl: string,
  content: EmailTemplateContent,
  instagramUrl: string
): string {
  const greeting = content.greeting.replace('{name}', name);
  const paragraphsHtml = content.paragraphs
    .map((p) => `<p class="message">${p}</p>`)
    .join('\n');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #FDF8F3; }
        .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
        .card { background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
        .header { background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%); color: white; padding: 40px 30px; text-align: center; }
        .logo { font-family: Georgia, serif; font-size: 32px; font-weight: 400; color: #c9a227; margin-bottom: 8px; }
        .tagline { font-size: 14px; color: #999; letter-spacing: 2px; text-transform: uppercase; }
        .content { padding: 40px 30px; background-color: #FFFDF9; }
        .greeting { font-size: 18px; margin-bottom: 20px; }
        .message { color: #555; margin-bottom: 25px; }
        .cta-container { text-align: center; margin: 35px 0; }
        .cta { display: inline-block; background: linear-gradient(135deg, #c9a227 0%, #d4af37 100%); color: white; padding: 16px 40px; border-radius: 50px; text-decoration: none; font-weight: 600; font-size: 16px; box-shadow: 0 4px 15px rgba(201, 162, 39, 0.3); }
        .signature { margin-top: 30px; padding-top: 25px; border-top: 1px solid #eee; }
        .signature-name { font-weight: 600; color: #1a1a1a; }
        .signature-title { font-size: 14px; color: #888; }
        .footer { text-align: center; padding: 25px 30px; background: #FAF7F2; font-size: 12px; color: #999; }
        .social-hint { font-style: italic; color: #888; font-size: 14px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="card">
          <div class="header">
            <div class="logo">AureLuz Design</div>
            <div class="tagline">Décoration sur mesure</div>
          </div>

          <div class="content">
            <p class="greeting">${greeting}</p>

            ${paragraphsHtml}

            <div class="cta-container">
              <a href="${bookingUrl}" class="cta">
                ${content.ctaText}
              </a>
            </div>

            <div class="social-hint" style="text-align: center;">
              <p style="margin-bottom: 12px;">${content.instagramText}</p>
              <a href="${instagramUrl}" style="display: inline-block;">
                <img src="https://cdn-icons-png.flaticon.com/512/174/174855.png" alt="Instagram" style="width: 32px; height: 32px;" />
              </a>
            </div>

            <div class="signature">
              <p class="signature-name">${content.signatureName}</p>
              <p class="signature-title">${content.signatureTitle}</p>
            </div>
          </div>

          <div class="footer">
            <p>© ${new Date().getFullYear()} AureLuz Design. Tous droits réservés.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

// Template simplifié pour Gmail (évite l'onglet Promotions)
function getSalonEmailTemplateSimple(
  name: string,
  bookingUrl: string,
  content: EmailTemplateContent,
  instagramUrl: string
): string {
  const greeting = content.greeting.replace('{name}', name);
  const paragraphsHtml = content.paragraphs.map((p) => `<p>${p}</p>`).join('\n');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.7; color: #333; margin: 0; padding: 20px; background-color: #FDF8F3; }
        .container { max-width: 600px; margin: 0 auto; padding: 30px; background: #FFFDF9; }
        a { color: #c9a227; }
      </style>
    </head>
    <body>
      <div class="container">
        <p>${greeting}</p>

        ${paragraphsHtml}

        <p><strong>→ ${content.ctaText} :</strong> <a href="${bookingUrl}">${bookingUrl}</a></p>

        <p>${content.instagramText} <a href="${instagramUrl}">Instagram</a></p>

        <p>À très bientôt,</p>
        <p><strong>${content.signatureName}</strong><br>
        <em>${content.signatureTitle}</em></p>
      </div>
    </body>
    </html>
  `;
}

// Default content fallback
const DEFAULT_TEMPLATE_CONTENT: EmailTemplateContent = {
  greeting: 'Bonjour {name},',
  paragraphs: [
    "J'espère que vous allez bien !",
    "Je me permets de vous contacter pour vous accompagner dans la création d'une décoration unique et à votre image pour votre prochain événement.",
    "Je serais ravie d'échanger avec vous sur votre projet et de vous présenter mes différentes prestations lors d'un rendez-vous personnalisé.",
  ],
  ctaText: 'Prendre rendez-vous',
  instagramText: "N'hésitez pas à me suivre sur Instagram pour découvrir mes dernières réalisations !",
  signatureName: 'Aurélie',
  signatureTitle: "Fondatrice d'AureLuz Design",
};

// Export des templates pour la prévisualisation
export async function getSalonEmailPreview(name: string, isGmail: boolean): Promise<string> {
  const bookingUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://aureluzdesign.fr'}/booking`;

  // Fetch template and settings from database
  const [template, emailSettings] = await Promise.all([
    EmailTemplatesService.getSalonTemplate(),
    getEmailSettings(),
  ]);
  const content = template?.content || DEFAULT_TEMPLATE_CONTENT;
  const instagramUrl = emailSettings.instagram || DEFAULT_INSTAGRAM;

  return isGmail
    ? getSalonEmailTemplateSimple(name, bookingUrl, content, instagramUrl)
    : getSalonEmailTemplateDesign(name, bookingUrl, content, instagramUrl);
}

// Email campagne salon du mariage
export async function sendSalonCampaignEmail(
  to: string,
  name: string,
  attachments?: Array<{ filename: string; content: string }>
): Promise<{ success: boolean; error?: string }> {
  const bookingUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://aureluzdesign.fr'}/booking`;

  // Fetch template and settings from database
  const [template, emailSettings] = await Promise.all([
    EmailTemplatesService.getSalonTemplate(),
    getEmailSettings(),
  ]);
  const content = template?.content || DEFAULT_TEMPLATE_CONTENT;
  const subject = template?.subject || 'AureLuz Design - Décoration sur mesure';
  const instagramUrl = emailSettings.instagram || DEFAULT_INSTAGRAM;

  // Choisir le template selon le type d'email
  const html = isGmailAddress(to)
    ? getSalonEmailTemplateSimple(name, bookingUrl, content, instagramUrl)
    : getSalonEmailTemplateDesign(name, bookingUrl, content, instagramUrl);

  // If there are attachments, use sendEmailWithAttachment
  if (attachments && attachments.length > 0) {
    const emailAttachments = attachments.map((att) => ({
      filename: att.filename,
      content: Buffer.from(att.content, 'base64'),
    }));

    return sendEmailWithAttachment({
      to,
      subject,
      html,
      fromEmail: emailSettings.fromEmail,
      attachments: emailAttachments,
    });
  }

  return sendEmail({
    to,
    subject,
    html,
    fromEmail: emailSettings.fromEmail,
  });
}

export async function sendStatusUpdate(
  clientEmail: string,
  clientName: string,
  date: string,
  time: string,
  status: 'confirmed' | 'cancelled'
): Promise<{ success: boolean; error?: string }> {
  const appointmentDate = formatAppointmentDate(date, time);
  const isConfirmed = status === 'confirmed';
  const emailSettings = await getEmailSettings();

  // Format date as dd/mm/yyyy
  const d = parseISO(date);
  const formattedDateShort = format(d, 'dd/MM/yyyy', { locale: fr });

  return sendEmail({
    to: clientEmail,
    fromEmail: emailSettings.fromEmail,
    subject: isConfirmed
      ? 'Votre rendez-vous est confirmé - AureLuz'
      : 'Information sur votre demande de rendez-vous - AureLuz',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
          .header { text-align: center; margin-bottom: 40px; }
          .logo { font-size: 28px; font-weight: 600; color: #c9a227; }
          .status { text-align: center; padding: 30px; border-radius: 12px; margin-bottom: 30px; }
          .status.confirmed { background: #dcfce7; color: #166534; }
          .status.cancelled { background: #fef2f2; color: #991b1b; }
          .footer { text-align: center; font-size: 14px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">AureLuz Design</div>
          </div>

          <div class="status ${status}">
            <h1 style="margin: 0 0 10px 0; font-size: 24px;">
              ${isConfirmed ? '✓ Rendez-vous confirmé' : 'Rendez-vous non disponible'}
            </h1>
            <p style="margin: 0;">${appointmentDate}</p>
          </div>

          <p>Bonjour ${clientName},</p>

          ${isConfirmed ? `
            <p>Nous avons le plaisir de vous confirmer votre rendez-vous.</p>
            <p>Nous avons hâte de vous rencontrer pour discuter de votre projet.</p>

            <div style="background: #dcfce7; border-radius: 12px; padding: 20px; margin: 25px 0; text-align: center;">
              <p style="margin: 0 0 15px 0; font-weight: 600; color: #166534;">Consultation vidéo</p>
              <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://aureluzdesign.fr'}/meeting" style="display: inline-block; background: #166534; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500;">
                Rejoindre le ${formattedDateShort} à ${time}
              </a>
              <p style="margin: 15px 0 0 0; font-size: 12px; color: #166534;">Cliquez sur ce lien au moment de votre rendez-vous</p>
            </div>
          ` : `
            <p>Nous sommes désolés, mais le créneau que vous aviez demandé n'est malheureusement plus disponible.</p>
            <p>N'hésitez pas à réserver un autre créneau sur notre site.</p>
          `}

          <p>À très bientôt,<br><strong>L'équipe AureLuz</strong></p>

          <div class="footer">
            <p>© ${new Date().getFullYear()} AureLuz. Tous droits réservés.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  });
}

// ============================================
// Invoice and Quote Payment Emails
// ============================================

/**
 * Send invoice email after successful payment with PDF attachment
 */
export async function sendInvoiceEmail(
  quote: Quote,
  invoice: Invoice
): Promise<{ success: boolean; error?: string }> {
  const emailSettings = await getEmailSettings();
  const invoiceDate = format(new Date(invoice.created_at), 'dd MMMM yyyy', { locale: fr });
  const eventDateStr = quote.event_date
    ? format(parseISO(quote.event_date), 'dd/MM/yyyy', { locale: fr })
    : null;

  // Generate real PDF using pdf-lib
  let pdfBuffer: Buffer;
  try {
    pdfBuffer = await InvoicesService.generatePdfBuffer(invoice, quote);
  } catch (error) {
    console.error('Error generating PDF:', error);
    // Fallback to HTML if PDF generation fails
    const pdfHtml = generateInvoicePdfHtml(invoice, quote);
    return sendEmailWithAttachment({
      to: invoice.client_email,
      fromEmail: emailSettings.fromEmail,
      subject: `Votre facture ${invoice.invoice_number} - AureLuz Design`,
      html: getInvoiceEmailHtml(invoice, quote, invoiceDate, eventDateStr),
      attachments: [
        {
          filename: `Facture-${invoice.invoice_number}.html`,
          content: pdfHtml,
        },
      ],
    });
  }

  return sendEmailWithAttachment({
    to: invoice.client_email,
    fromEmail: emailSettings.fromEmail,
    subject: `Votre facture ${invoice.invoice_number} - AureLuz Design`,
    html: getInvoiceEmailHtml(invoice, quote, invoiceDate, eventDateStr),
    attachments: [
      {
        filename: `Facture-${invoice.invoice_number}.pdf`,
        content: pdfBuffer,
      },
    ],
  });
}

// Helper function to get invoice email HTML
function getInvoiceEmailHtml(invoice: Invoice, quote: Quote, invoiceDate: string, eventDateStr: string | null): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #FDF8F3;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #FDF8F3;">
        <tr>
          <td align="center" style="padding: 40px 20px;">
            <table width="600" cellpadding="0" cellspacing="0" style="background: white; border-radius: 16px; overflow: hidden;">
              <!-- Header -->
              <tr>
                <td style="background: #1a1a1a; color: white; padding: 40px 30px; text-align: center;">
                  <div style="font-family: Georgia, serif; font-size: 28px; color: #c9a227; margin-bottom: 8px;">AureLuz Design</div>
                  <p style="color: #999; margin: 0; font-size: 14px;">Décoration sur mesure</p>
                </td>
              </tr>

              <!-- Content -->
              <tr>
                <td style="padding: 40px 30px; text-align: center;">
                  <div style="background: #dcfce7; color: #166534; padding: 12px 24px; border-radius: 50px; display: inline-block; font-weight: 600; margin-bottom: 30px;">
                    ✓ Paiement confirmé
                  </div>

                  <h1 style="font-size: 24px; margin: 0 0 10px 0; color: #1a1a1a;">Merci pour votre confiance !</h1>
                  <p style="color: #666; margin: 0 0 30px 0;">
                    Votre paiement a été reçu avec succès. Vous trouverez votre facture en pièce jointe.
                  </p>

                  <!-- Details table -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="background: #f9f9f9; border-radius: 12px;">
                    <tr>
                      <td style="padding: 25px;">
                        <table width="100%" cellpadding="0" cellspacing="0">
                          <tr>
                            <td style="color: #666; font-size: 14px; padding: 12px 0; border-bottom: 1px solid #eee;">Facture</td>
                            <td style="font-weight: 600; color: #1a1a1a; padding: 12px 0; border-bottom: 1px solid #eee; text-align: right;">${invoice.invoice_number}</td>
                          </tr>
                          <tr>
                            <td style="color: #666; font-size: 14px; padding: 12px 0; border-bottom: 1px solid #eee;">Devis</td>
                            <td style="font-weight: 600; color: #1a1a1a; padding: 12px 0; border-bottom: 1px solid #eee; text-align: right;">${quote.quote_number}</td>
                          </tr>
                          <tr>
                            <td style="color: #666; font-size: 14px; padding: 12px 0; border-bottom: 1px solid #eee;">Date</td>
                            <td style="font-weight: 600; color: #1a1a1a; padding: 12px 0; border-bottom: 1px solid #eee; text-align: right;">${invoiceDate}</td>
                          </tr>
                          ${eventDateStr ? `
                          <tr>
                            <td style="color: #666; font-size: 14px; padding: 12px 0; border-bottom: 1px solid #eee;">Événement</td>
                            <td style="font-weight: 600; color: #1a1a1a; padding: 12px 0; border-bottom: 1px solid #eee; text-align: right;">${eventDateStr}</td>
                          </tr>
                          ` : ''}
                        </table>

                        <!-- Amount box -->
                        <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 20px;">
                          <tr>
                            <td style="background: #c9a227; color: white; padding: 15px 20px; border-radius: 8px;">
                              <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                  <td style="font-size: 14px;">Montant payé</td>
                                  <td style="font-size: 20px; font-weight: bold; text-align: right;">${invoice.total_amount.toFixed(2)} EUR</td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>

                  <p style="margin-top: 30px; color: #666;">
                    Cet acompte de ${quote.deposit_percent}% confirme votre commande.<br>
                    Le solde sera à régler selon les conditions convenues.
                  </p>

                  <p style="margin-top: 30px; color: #1a1a1a;">
                    Nous avons hâte de collaborer avec vous pour créer un événement inoubliable !
                  </p>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="text-align: center; padding: 25px 30px; background: #fafafa; font-size: 12px; color: #999;">
                  <p style="margin: 0;">AureLuz Design - Décoration Événementielle</p>
                  <p style="margin: 5px 0 0;">contact@aureluzdesign.fr | www.aureluzdesign.fr</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

/**
 * Send quote payment link to client
 */
export async function sendQuotePaymentLink(
  quote: Quote
): Promise<{ success: boolean; error?: string }> {
  const emailSettings = await getEmailSettings();
  const paymentUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://aureluzdesign.fr'}/devis/${quote.validation_token}`;
  const depositAmount = quote.deposit_amount || Math.round(quote.total * (quote.deposit_percent || 30) / 100);

  return sendEmail({
    to: quote.client_email,
    fromEmail: emailSettings.fromEmail,
    subject: `Validez votre devis ${quote.quote_number} - AureLuz Design`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #FDF8F3; }
          .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
          .card { background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
          .header { background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%); color: white; padding: 40px 30px; text-align: center; }
          .logo { font-family: Georgia, serif; font-size: 28px; font-weight: 400; color: #c9a227; margin-bottom: 8px; }
          .content { padding: 40px 30px; }
          .cta { display: inline-block; background: linear-gradient(135deg, #c9a227 0%, #d4af37 100%); color: white; padding: 16px 40px; border-radius: 50px; text-decoration: none; font-weight: 600; font-size: 16px; }
          .amount-box { background: #f9f9f9; border-radius: 12px; padding: 25px; margin: 25px 0; text-align: center; }
          .footer { text-align: center; padding: 25px 30px; background: #fafafa; font-size: 12px; color: #999; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="card">
            <div class="header">
              <div class="logo">AureLuz Design</div>
              <p style="color: #999; margin: 0;">Décoration sur mesure</p>
            </div>

            <div class="content">
              <p>Bonjour ${quote.client_name},</p>

              <p>
                Merci d'avoir choisi AureLuz Design pour votre événement !
                Vous pouvez maintenant valider votre devis en ligne.
              </p>

              <div class="amount-box">
                <p style="color: #666; margin: 0 0 10px;">Montant de l'acompte (${quote.deposit_percent}%)</p>
                <p style="font-size: 32px; font-weight: bold; color: #c9a227; margin: 0;">
                  ${depositAmount.toFixed(2)} EUR
                </p>
                <p style="color: #666; font-size: 14px; margin: 15px 0 0;">
                  sur un total de ${quote.total.toFixed(2)} EUR
                </p>
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${paymentUrl}" class="cta">
                  Valider et payer mon devis
                </a>
              </div>

              <p style="font-size: 14px; color: #666; text-align: center;">
                Paiement sécurisé par carte bancaire
              </p>

              <p style="margin-top: 30px;">À très bientôt,<br><strong>L'équipe AureLuz</strong></p>
            </div>

            <div class="footer">
              <p style="margin: 0;">AureLuz Design - Décoration Événementielle</p>
              <p style="margin: 5px 0 0;">contact@aureluzdesign.fr | www.aureluzdesign.fr</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `,
  });
}

/**
 * Send payment confirmation email for multi-payment system
 */
export async function sendPaymentConfirmationEmail(
  quote: Quote,
  payment: QuotePayment,
  invoice: Invoice,
  summary: QuotePaymentSummary | null
): Promise<{ success: boolean; error?: string }> {
  const emailSettings = await getEmailSettings();
  const invoiceDate = format(new Date(invoice.created_at), 'dd MMMM yyyy', { locale: fr });
  const isFullyPaid = summary?.payment_status === 'fully_paid';
  const progressPercent = summary ? Math.round((summary.total_paid / summary.total) * 100) : 0;

  // Generate real PDF using pdf-lib
  let pdfBuffer: Buffer;
  let attachmentFilename: string;
  try {
    pdfBuffer = await InvoicesService.generatePdfBuffer(invoice, quote);
    attachmentFilename = `Facture-${invoice.invoice_number}.pdf`;
  } catch (error) {
    console.error('Error generating PDF for payment confirmation:', error);
    // Fallback to HTML if PDF generation fails
    const pdfHtml = generateInvoicePdfHtml(invoice, quote);
    pdfBuffer = Buffer.from(pdfHtml);
    attachmentFilename = `Facture-${invoice.invoice_number}.html`;
  }

  return sendEmailWithAttachment({
    to: quote.client_email,
    fromEmail: emailSettings.fromEmail,
    subject: `${payment.label} reçu - Devis ${quote.quote_number} - AureLuz Design`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #FDF8F3;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #FDF8F3;">
          <tr>
            <td align="center" style="padding: 40px 20px;">
              <table width="600" cellpadding="0" cellspacing="0" style="background: white; border-radius: 16px; overflow: hidden;">
                <!-- Header -->
                <tr>
                  <td style="background: #1a1a1a; color: white; padding: 40px 30px; text-align: center;">
                    <div style="font-family: Georgia, serif; font-size: 28px; color: #c9a227; margin-bottom: 8px;">AureLuz Design</div>
                    <p style="color: #999; margin: 0; font-size: 14px;">Décoration sur mesure</p>
                  </td>
                </tr>

                <!-- Content -->
                <tr>
                  <td style="padding: 40px 30px; text-align: center;">
                    <div style="background: #dcfce7; color: #166534; padding: 12px 24px; border-radius: 50px; display: inline-block; font-weight: 600; margin-bottom: 30px;">
                      ✓ ${payment.label} confirmé
                    </div>

                    <h1 style="font-size: 24px; margin: 0 0 10px 0; color: #1a1a1a;">
                      ${isFullyPaid ? 'Paiement complet reçu !' : 'Merci pour votre paiement !'}
                    </h1>
                    <p style="color: #666; margin: 0 0 30px 0;">
                      Vous trouverez votre facture en pièce jointe.
                    </p>

                    <!-- Details table -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="background: #f9f9f9; border-radius: 12px;">
                      <tr>
                        <td style="padding: 25px;">
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="color: #666; font-size: 14px; padding: 12px 0; border-bottom: 1px solid #eee;">Facture</td>
                              <td style="font-weight: 600; color: #1a1a1a; padding: 12px 0; border-bottom: 1px solid #eee; text-align: right;">${invoice.invoice_number}</td>
                            </tr>
                            <tr>
                              <td style="color: #666; font-size: 14px; padding: 12px 0; border-bottom: 1px solid #eee;">Devis</td>
                              <td style="font-weight: 600; color: #1a1a1a; padding: 12px 0; border-bottom: 1px solid #eee; text-align: right;">${quote.quote_number}</td>
                            </tr>
                            <tr>
                              <td style="color: #666; font-size: 14px; padding: 12px 0; border-bottom: 1px solid #eee;">Date</td>
                              <td style="font-weight: 600; color: #1a1a1a; padding: 12px 0; border-bottom: 1px solid #eee; text-align: right;">${invoiceDate}</td>
                            </tr>
                          </table>

                          <!-- Amount box -->
                          <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 20px;">
                            <tr>
                              <td style="background: #c9a227; color: white; padding: 15px 20px; border-radius: 8px;">
                                <table width="100%" cellpadding="0" cellspacing="0">
                                  <tr>
                                    <td style="font-size: 14px;">${payment.label}</td>
                                    <td style="font-size: 20px; font-weight: bold; text-align: right;">${payment.amount.toFixed(2)} EUR</td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                    ${summary ? `
                    <!-- Progress section -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 25px;">
                      <tr>
                        <td style="text-align: left;">
                          <p style="font-size: 14px; color: #666; margin: 0 0 8px 0;">
                            Progression des paiements (${summary.paid_payments}/${summary.total_payments})
                          </p>
                          <table width="100%" cellpadding="0" cellspacing="0" style="background: #e5e5e5; border-radius: 10px; height: 12px;">
                            <tr>
                              <td style="background: #c9a227; border-radius: 10px; width: ${progressPercent}%;"></td>
                              <td></td>
                            </tr>
                          </table>
                          <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 8px;">
                            <tr>
                              <td style="font-size: 14px; color: #166534;">${summary.total_paid.toFixed(2)} EUR payés</td>
                              <td style="font-size: 14px; color: #666; text-align: right;">${summary.remaining_amount.toFixed(2)} EUR restants</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                    ` : ''}

                    <p style="margin-top: 30px; color: #666;">
                      ${isFullyPaid
                        ? 'Tous les paiements ont été reçus. Nous avons hâte de collaborer avec vous !'
                        : 'Nous vous contacterons pour le prochain paiement selon l\'échéancier convenu.'
                      }
                    </p>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="text-align: center; padding: 25px 30px; background: #fafafa; font-size: 12px; color: #999;">
                    <p style="margin: 0;">AureLuz Design - Décoration Événementielle</p>
                    <p style="margin: 5px 0 0;">contact@aureluzdesign.fr | www.aureluzdesign.fr</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
    attachments: [
      {
        filename: attachmentFilename,
        content: pdfBuffer,
      },
    ],
  });
}

/**
 * Send payment request email for a specific installment
 */
export async function sendPaymentRequestEmail(
  quote: Quote,
  payment: QuotePayment,
  summary: QuotePaymentSummary | null
): Promise<{ success: boolean; error?: string }> {
  const emailSettings = await getEmailSettings();
  const paymentUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://aureluzdesign.fr'}/paiement/${payment.validation_token}`;
  const dueDateStr = payment.due_date
    ? format(new Date(payment.due_date), 'dd MMMM yyyy', { locale: fr })
    : null;

  return sendEmail({
    to: quote.client_email,
    fromEmail: emailSettings.fromEmail,
    subject: `${payment.label} à régler - Devis ${quote.quote_number} - AureLuz Design`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #FDF8F3; }
          .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
          .card { background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
          .header { background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%); color: white; padding: 40px 30px; text-align: center; }
          .logo { font-family: Georgia, serif; font-size: 28px; font-weight: 400; color: #c9a227; margin-bottom: 8px; }
          .content { padding: 40px 30px; }
          .cta { display: inline-block; background: linear-gradient(135deg, #c9a227 0%, #d4af37 100%); color: white; padding: 16px 40px; border-radius: 50px; text-decoration: none; font-weight: 600; font-size: 16px; }
          .amount-box { background: #f9f9f9; border-radius: 12px; padding: 25px; margin: 25px 0; text-align: center; }
          .progress-bar { background: #e5e5e5; border-radius: 10px; height: 12px; overflow: hidden; margin: 20px 0; }
          .progress-fill { background: linear-gradient(135deg, #c9a227 0%, #d4af37 100%); height: 100%; border-radius: 10px; }
          .footer { text-align: center; padding: 25px 30px; background: #fafafa; font-size: 12px; color: #999; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="card">
            <div class="header">
              <div class="logo">AureLuz Design</div>
              <p style="color: #999; margin: 0;">Décoration sur mesure</p>
            </div>

            <div class="content">
              <p>Bonjour ${quote.client_name},</p>

              <p>
                ${payment.payment_number === 1
                  ? 'Merci d\'avoir choisi AureLuz Design pour votre événement ! Vous pouvez maintenant régler l\'acompte pour confirmer votre commande.'
                  : `Il est temps de procéder au règlement de votre ${payment.label.toLowerCase()}.`
                }
              </p>

              <div class="amount-box">
                <p style="color: #666; margin: 0 0 5px; font-size: 14px;">${payment.label}</p>
                ${payment.percentage ? `<p style="color: #999; margin: 0 0 10px; font-size: 12px;">(${payment.percentage}% du total)</p>` : ''}
                <p style="font-size: 36px; font-weight: bold; color: #c9a227; margin: 0;">
                  ${payment.amount.toFixed(2)} EUR
                </p>
                ${dueDateStr ? `
                <p style="color: #666; font-size: 14px; margin: 15px 0 0;">
                  À régler avant le ${dueDateStr}
                </p>
                ` : ''}
              </div>

              ${summary ? `
              <div style="margin: 25px 0;">
                <p style="font-size: 14px; color: #666; margin-bottom: 8px;">
                  Progression des paiements
                </p>
                <div class="progress-bar">
                  <div class="progress-fill" style="width: ${(summary.total_paid / summary.total) * 100}%"></div>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 14px;">
                  <span style="color: #166534;">${summary.total_paid.toFixed(2)} EUR payés</span>
                  <span style="color: #666;">Total: ${summary.total.toFixed(2)} EUR</span>
                </div>
              </div>
              ` : ''}

              <div style="text-align: center; margin: 30px 0;">
                <a href="${paymentUrl}" class="cta">
                  Payer ${payment.amount.toFixed(2)} EUR
                </a>
              </div>

              <p style="font-size: 14px; color: #666; text-align: center;">
                Paiement sécurisé par carte bancaire
              </p>

              <p style="margin-top: 30px;">À très bientôt,<br><strong>L'équipe AureLuz</strong></p>
            </div>

            <div class="footer">
              <p style="margin: 0;">AureLuz Design - Décoration Événementielle</p>
              <p style="margin: 5px 0 0;">contact@aureluzdesign.fr | www.aureluzdesign.fr</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `,
  });
}
