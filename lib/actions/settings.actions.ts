'use server';

import { revalidatePath } from 'next/cache';
import { SettingsService } from '@/lib/services/settings.service';

export async function getLogo(): Promise<string> {
  return SettingsService.getLogo();
}

export async function updateLogo(
  formData: FormData
): Promise<{ success: boolean; url?: string; error?: string }> {
  const file = formData.get('logo') as File;

  if (!file || file.size === 0) {
    return { success: false, error: 'Aucun fichier sélectionné' };
  }

  // Validate file type
  const validTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
  if (!validTypes.includes(file.type)) {
    return { success: false, error: 'Format non supporté. Utilisez PNG, JPG, WebP ou SVG.' };
  }

  // Validate file size (max 2MB)
  if (file.size > 2 * 1024 * 1024) {
    return { success: false, error: 'Le fichier est trop volumineux (max 2MB)' };
  }

  const result = await SettingsService.uploadLogo(file);

  if (result.success) {
    // Revalidate all pages that use the logo
    revalidatePath('/', 'layout');
    revalidatePath('/admin', 'layout');
  }

  return result;
}

export async function setLogoUrl(
  url: string
): Promise<{ success: boolean; error?: string }> {
  const success = await SettingsService.setLogo(url);

  if (success) {
    revalidatePath('/', 'layout');
    revalidatePath('/admin', 'layout');
  }

  return { success, error: success ? undefined : 'Erreur lors de la mise à jour' };
}
