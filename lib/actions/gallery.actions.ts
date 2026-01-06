'use server';

import { revalidatePath } from 'next/cache';
import { GalleryService } from '@/lib/services/gallery.service';
import type { Photo, PhotoCategory } from '@/lib/types';

export async function getPhotos(category?: PhotoCategory): Promise<Photo[]> {
  return GalleryService.getAll(category);
}

export async function uploadPhoto(
  formData: FormData
): Promise<{ success: boolean; photo?: Photo; error?: string }> {
  try {
    const file = formData.get('file') as File;
    const category = formData.get('category') as PhotoCategory;
    const alt = formData.get('alt') as string;

    if (!file || !category || !alt) {
      return { success: false, error: 'Données manquantes' };
    }

    // Upload to storage
    const url = await GalleryService.uploadToStorage(file);

    // Create database entry
    const photo = await GalleryService.create({
      url,
      alt,
      category,
    });

    revalidatePath('/');
    revalidatePath('/admin/gallery');

    return { success: true, photo };
  } catch (error) {
    console.error('Error in uploadPhoto:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Une erreur est survenue',
    };
  }
}

export async function deletePhoto(
  photoId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await GalleryService.delete(photoId);

    revalidatePath('/');
    revalidatePath('/admin/gallery');

    return { success: true };
  } catch (error) {
    console.error('Error in deletePhoto:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Une erreur est survenue',
    };
  }
}

export async function updatePhotoOrder(
  orderedIds: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    await GalleryService.updateOrder(orderedIds);

    revalidatePath('/');
    revalidatePath('/admin/gallery');

    return { success: true };
  } catch (error) {
    console.error('Error in updatePhotoOrder:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Une erreur est survenue',
    };
  }
}

export async function updatePhoto(
  photoId: string,
  data: { alt?: string; category?: PhotoCategory }
): Promise<{ success: boolean; photo?: Photo; error?: string }> {
  try {
    const photo = await GalleryService.update(photoId, data);

    revalidatePath('/');
    revalidatePath('/admin/gallery');

    return { success: true, photo };
  } catch (error) {
    console.error('Error in updatePhoto:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Une erreur est survenue',
    };
  }
}
