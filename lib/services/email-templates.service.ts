import { createAdminClient } from '@/lib/supabase/server';

export interface EmailTemplateContent {
  greeting: string;
  paragraphs: string[];
  ctaText: string;
  instagramText: string;
  signatureName: string;
  signatureTitle: string;
}

export interface EmailTemplate {
  id: string;
  slug: string;
  name: string;
  subject: string;
  content: EmailTemplateContent;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export class EmailTemplatesService {
  static async getBySlug(slug: string): Promise<EmailTemplate | null> {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('email_templates')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error) {
      console.error(`Error fetching email template ${slug}:`, error);
      return null;
    }

    return data as EmailTemplate;
  }

  static async update(
    slug: string,
    updates: { subject?: string; content?: EmailTemplateContent }
  ): Promise<boolean> {
    const supabase = createAdminClient();

    const { error } = await supabase
      .from('email_templates')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('slug', slug);

    if (error) {
      console.error(`Error updating email template ${slug}:`, error);
      return false;
    }

    return true;
  }

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
