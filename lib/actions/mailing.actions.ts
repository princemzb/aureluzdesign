'use server';

import { sendSalonCampaignEmail, getSalonEmailPreview } from '@/lib/services/email.service';

export interface Contact {
  name: string;
  email: string;
}

export interface SendCampaignResult {
  success: boolean;
  total: number;
  sent: number;
  failed: number;
  errors: { email: string; error: string }[];
}

export async function sendSalonCampaign(
  contacts: Contact[]
): Promise<SendCampaignResult> {
  const result: SendCampaignResult = {
    success: false,
    total: contacts.length,
    sent: 0,
    failed: 0,
    errors: [],
  };

  if (contacts.length === 0) {
    return result;
  }

  // Envoyer les emails un par un pour éviter les limites de rate
  for (const contact of contacts) {
    try {
      const emailResult = await sendSalonCampaignEmail(contact.email, contact.name);

      if (emailResult.success) {
        result.sent++;
      } else {
        result.failed++;
        result.errors.push({
          email: contact.email,
          error: emailResult.error || 'Erreur inconnue',
        });
      }

      // Petit délai entre les envois pour éviter le rate limiting
      await new Promise((resolve) => setTimeout(resolve, 200));
    } catch (error) {
      result.failed++;
      result.errors.push({
        email: contact.email,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      });
    }
  }

  result.success = result.failed === 0;

  return result;
}

// Récupérer la prévisualisation du template
export async function getEmailPreview(
  name: string,
  isGmail: boolean
): Promise<string> {
  return getSalonEmailPreview(name || 'Prénom', isGmail);
}
