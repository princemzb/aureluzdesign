'use server';

import { revalidatePath } from 'next/cache';
import {
  EmailTemplatesService,
  type EmailTemplate,
  type EmailTemplateContent,
} from '@/lib/services/email-templates.service';

export async function getSalonEmailTemplate(): Promise<EmailTemplate | null> {
  return EmailTemplatesService.getSalonTemplate();
}

export async function updateSalonEmailTemplate(
  subject: string,
  content: EmailTemplateContent
): Promise<{ success: boolean; error?: string }> {
  try {
    const success = await EmailTemplatesService.updateSalonTemplate(subject, content);

    if (success) {
      revalidatePath('/admin/mailing');
      return { success: true };
    }

    return { success: false, error: 'Erreur lors de la mise à jour du template' };
  } catch (error) {
    console.error('Error updating salon email template:', error);
    return { success: false, error: 'Erreur serveur' };
  }
}
