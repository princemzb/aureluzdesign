import { Resend } from 'resend';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { BookingFormData } from '@/lib/validators/booking.schema';
import { EVENT_TYPES } from '@/lib/utils/constants';

// Resend client
const resend = new Resend(process.env.RESEND_API_KEY);

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

    const { data, error } = await resend.emails.send({
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
            <div class="logo">AureLuz</div>
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

            <a href="${process.env.NEXT_PUBLIC_APP_URL}/admin/appointments" class="cta">
              Gérer dans le tableau de bord
            </a>
          </div>
        </div>
      </body>
      </html>
    `,
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
            <div class="logo">AureLuz</div>
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
