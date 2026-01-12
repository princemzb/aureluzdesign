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
}
