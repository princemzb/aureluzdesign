import { Resend } from 'resend';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { BookingFormData } from '@/lib/validators/booking.schema';
import { EVENT_TYPES } from '@/lib/utils/constants';

// Resend client - initialisation paresseuse pour éviter les erreurs au build
let resendClient: Resend | null = null;

function getResendClient(): Resend {
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
}

// Email expéditeur (domaine vérifié sur Resend)
const FROM_EMAIL = 'AureLuz Design <contact@aureluzdesign.fr>';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'aureluzdesign@gmail.com';

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
}: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`📧 Envoi email à ${to}...`);

    const { data, error } = await getResendClient().emails.send({
      from: FROM_EMAIL,
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

export async function sendBookingConfirmation(
  data: BookingFormData
): Promise<{ success: boolean; error?: string }> {
  const appointmentDate = formatAppointmentDate(data.date, data.start_time);
  const eventTypeLabel = getEventTypeLabel(data.event_type);

  return sendEmail({
    to: data.client_email,
    subject: 'Confirmation de votre demande de rendez-vous - AureLuz',
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

          <div style="background: #f8f5f0; border-radius: 12px; padding: 20px; margin: 25px 0; text-align: center;">
            <p style="margin: 0 0 15px 0; font-weight: 600; color: #1a1a1a;">Lien de la consultation vidéo</p>
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://aureluzdesign.fr'}/meeting" style="display: inline-block; background: #c9a227; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500;">
              Rejoindre la réunion
            </a>
            <p style="margin: 15px 0 0 0; font-size: 12px; color: #666;">Ce lien sera actif au moment de votre rendez-vous confirmé</p>
          </div>

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

  return sendEmail({
    to: ADMIN_EMAIL,
    subject: `Nouvelle demande de RDV - ${data.client_name}`,
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
function getSalonEmailTemplateDesign(name: string, bookingUrl: string): string {
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
            <p class="greeting">Bonjour ${name},</p>

            <p class="message">
              C'était un réel plaisir de vous rencontrer lors du Salon du Mariage !
            </p>

            <p class="message">
              J'espère que cette journée vous a inspiré pour votre futur événement.
              Comme promis, je reviens vers vous pour vous accompagner dans la création
              d'une décoration unique et à votre image.
            </p>

            <p class="message">
              Je serais ravie d'échanger avec vous sur votre projet et de vous présenter
              mes différentes prestations lors d'un rendez-vous personnalisé.
            </p>

            <div class="cta-container">
              <a href="${bookingUrl}" class="cta">
                Prendre rendez-vous
              </a>
            </div>

            <div class="social-hint" style="text-align: center;">
              <p style="margin-bottom: 12px;">N'hésitez pas à me suivre sur Instagram pour découvrir mes dernières réalisations !</p>
              <a href="https://www.instagram.com/aure_luz_design/" style="display: inline-block;">
                <img src="https://cdn-icons-png.flaticon.com/512/174/174855.png" alt="Instagram" style="width: 32px; height: 32px;" />
              </a>
            </div>

            <div class="signature">
              <p class="signature-name">Aurélie</p>
              <p class="signature-title">Fondatrice d'AureLuz Design</p>
            </div>
          </div>

          <div class="footer">
            <p>© ${new Date().getFullYear()} AureLuz Design. Tous droits réservés.</p>
            <p>Cet email vous a été envoyé suite à notre rencontre au Salon du Mariage.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

// Template simplifié pour Gmail (évite l'onglet Promotions)
function getSalonEmailTemplateSimple(name: string, bookingUrl: string): string {
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
        <p>Bonjour ${name},</p>

        <p>C'était un réel plaisir de vous rencontrer lors du Salon du Mariage !</p>

        <p>J'espère que cette journée vous a inspiré pour votre futur événement. Comme promis, je reviens vers vous pour vous accompagner dans la création d'une décoration unique et à votre image.</p>

        <p>Je serais ravie d'échanger avec vous sur votre projet et de vous présenter mes différentes prestations lors d'un rendez-vous personnalisé.</p>

        <p><strong>→ Prendre rendez-vous :</strong> <a href="${bookingUrl}">${bookingUrl}</a></p>

        <p>N'hésitez pas à me suivre sur Instagram pour découvrir mes dernières réalisations : <a href="https://www.instagram.com/aure_luz_design/">@aure_luz_design</a></p>

        <p>À très bientôt,</p>
        <p><strong>Aurélie</strong><br>
        <em>Fondatrice d'AureLuz Design</em></p>
      </div>
    </body>
    </html>
  `;
}

// Export des templates pour la prévisualisation
export function getSalonEmailPreview(name: string, isGmail: boolean): string {
  const bookingUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://aureluzdesign.fr'}/booking`;
  return isGmail
    ? getSalonEmailTemplateSimple(name, bookingUrl)
    : getSalonEmailTemplateDesign(name, bookingUrl);
}

// Email campagne salon du mariage
export async function sendSalonCampaignEmail(
  to: string,
  name: string
): Promise<{ success: boolean; error?: string }> {
  const bookingUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://aureluzdesign.fr'}/booking`;

  // Choisir le template selon le type d'email
  const html = isGmailAddress(to)
    ? getSalonEmailTemplateSimple(name, bookingUrl)
    : getSalonEmailTemplateDesign(name, bookingUrl);

  return sendEmail({
    to,
    subject: 'Suite à notre rencontre au Salon du Mariage - AureLuz',
    html,
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

  return sendEmail({
    to: clientEmail,
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
              <p style="margin: 0 0 15px 0; font-weight: 600; color: #166534;">Rejoignez la consultation vidéo</p>
              <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://aureluzdesign.fr'}/meeting" style="display: inline-block; background: #166534; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500;">
                Accéder à la réunion
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
