import { createAdminClient } from '@/lib/supabase/server';

export interface SiteSetting {
  id: string;
  key: string;
  value: string | null;
  type: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContactSettings {
  phone: string;
  email: string;
  adminEmail: string;
  instagram: string;
  facebook: string;
  linkedin: string;
}

const DEFAULT_CONTACT_SETTINGS: ContactSettings = {
  phone: '+33661434365',
  email: 'contact@aureluzdesign.fr',
  adminEmail: 'aureluzdesign@gmail.com',
  instagram: 'https://www.instagram.com/aure_luz_design/',
  facebook: '',
  linkedin: '',
};

export class SettingsService {
  static async getAll(): Promise<SiteSetting[]> {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('site_settings')
      .select('*')
      .order('key');

    if (error) {
      console.error('Error fetching settings:', error);
      return [];
    }

    return data || [];
  }

  static async get(key: string): Promise<string | null> {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', key)
      .single();

    if (error) {
      console.error(`Error fetching setting ${key}:`, error);
      return null;
    }

    return data?.value || null;
  }

  static async set(key: string, value: string): Promise<boolean> {
    const supabase = createAdminClient();

    const { error } = await supabase
      .from('site_settings')
      .update({ value, updated_at: new Date().toISOString() })
      .eq('key', key);

    if (error) {
      console.error(`Error updating setting ${key}:`, error);
      return false;
    }

    return true;
  }

  static async getLogo(): Promise<string> {
    const logo = await this.get('logo_url');
    return logo || '/images/aureluz-design-logo-decoration-evenementielle.png';
  }

  static async setLogo(url: string): Promise<boolean> {
    return this.set('logo_url', url);
  }

  static async uploadLogo(file: File): Promise<{ success: boolean; url?: string; error?: string }> {
    const supabase = createAdminClient();

    // Generate unique filename
    const ext = file.name.split('.').pop();
    const filename = `logo-${Date.now()}.${ext}`;

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from('photos')
      .upload(`logos/${filename}`, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) {
      console.error('Error uploading logo:', uploadError);
      return { success: false, error: 'Erreur lors de l\'upload du logo' };
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('photos')
      .getPublicUrl(`logos/${filename}`);

    const publicUrl = urlData.publicUrl;

    // Update setting
    const updated = await this.setLogo(publicUrl);

    if (!updated) {
      return { success: false, error: 'Erreur lors de la mise à jour du paramètre' };
    }

    return { success: true, url: publicUrl };
  }

  // Contact settings methods
  static async getContactSettings(): Promise<ContactSettings> {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('site_settings')
      .select('key, value')
      .in('key', [
        'contact_phone',
        'contact_email',
        'admin_email',
        'social_instagram',
        'social_facebook',
        'social_linkedin',
      ]);

    if (error) {
      console.error('Error fetching contact settings:', error);
      return DEFAULT_CONTACT_SETTINGS;
    }

    const settings = data?.reduce((acc, item) => {
      acc[item.key] = item.value || '';
      return acc;
    }, {} as Record<string, string>) || {};

    return {
      phone: settings['contact_phone'] || DEFAULT_CONTACT_SETTINGS.phone,
      email: settings['contact_email'] || DEFAULT_CONTACT_SETTINGS.email,
      adminEmail: settings['admin_email'] || DEFAULT_CONTACT_SETTINGS.adminEmail,
      instagram: settings['social_instagram'] || DEFAULT_CONTACT_SETTINGS.instagram,
      facebook: settings['social_facebook'] || DEFAULT_CONTACT_SETTINGS.facebook,
      linkedin: settings['social_linkedin'] || DEFAULT_CONTACT_SETTINGS.linkedin,
    };
  }

  static async updateContactSettings(settings: ContactSettings): Promise<boolean> {
    const updates = [
      { key: 'contact_phone', value: settings.phone },
      { key: 'contact_email', value: settings.email },
      { key: 'admin_email', value: settings.adminEmail },
      { key: 'social_instagram', value: settings.instagram },
      { key: 'social_facebook', value: settings.facebook },
      { key: 'social_linkedin', value: settings.linkedin },
    ];

    for (const update of updates) {
      const success = await this.set(update.key, update.value);
      if (!success) {
        return false;
      }
    }

    return true;
  }
}
