import { createClient, createAdminClient } from '@/lib/supabase/server';
import type { Photo, PhotoCategory } from '@/lib/types';
import { BUSINESS_CONFIG } from '@/lib/utils/constants';

// Note: Les opérations d'écriture utilisent createAdminClient() car :
// - Les routes /admin/* sont déjà protégées par le middleware
// - La session utilisateur ne se propage pas toujours aux Server Actions
// Les opérations de lecture restent avec createClient() (accès public)

const STORAGE_BUCKET = 'photos';

export class GalleryService {
  static async getAll(category?: PhotoCategory): Promise<Photo[]> {
    const supabase = await createClient();

    let query = supabase
      .from('photos')
      .select('*')
      .order('display_order', { ascending: true });

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching photos:', error);
      return [];
    }

    return data || [];
  }

  static async getById(id: string): Promise<Photo | null> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('photos')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching photo:', error);
      return null;
    }

    return data;
  }

  static async uploadToStorage(file: File): Promise<string> {
    const supabase = createAdminClient();

    // Validate file type
    if (!(BUSINESS_CONFIG.ACCEPTED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
      throw new Error('Type de fichier non autorisé');
    }

    // Validate file size
    if (file.size > BUSINESS_CONFIG.MAX_UPLOAD_SIZE) {
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
      const maxSizeMB = (BUSINESS_CONFIG.MAX_UPLOAD_SIZE / (1024 * 1024)).toFixed(0);
      throw new Error(`Image trop volumineuse (${fileSizeMB} MB). Limite : ${maxSizeMB} MB`);
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const extension = file.name.split('.').pop();
    const filename = `${timestamp}-${randomStr}.${extension}`;

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(filename, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('Error uploading file:', uploadError);
      throw new Error('Erreur lors de l\'upload');
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(filename);

    return urlData.publicUrl;
  }

  static async create(input: {
    url: string;
    alt: string;
    category: PhotoCategory;
  }): Promise<Photo> {
    const supabase = createAdminClient();

    // Get max display order
    const { data: maxOrderData } = await supabase
      .from('photos')
      .select('display_order')
      .order('display_order', { ascending: false })
      .limit(1)
      .single();

    const newOrder = (maxOrderData?.display_order || 0) + 1;

    const { data, error } = await supabase
      .from('photos')
      .insert({
        url: input.url,
        alt: input.alt,
        category: input.category,
        display_order: newOrder,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating photo:', error);
      throw new Error('Erreur lors de la création');
    }

    return data;
  }

  static async delete(id: string): Promise<void> {
    const supabase = createAdminClient();

    // Get photo to find storage filename
    const photo = await this.getById(id);

    if (!photo) {
      throw new Error('Photo non trouvée');
    }

    // Extract filename from URL
    const urlParts = photo.url.split('/');
    const filename = urlParts[urlParts.length - 1];

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([filename]);

    if (storageError) {
      console.error('Error deleting from storage:', storageError);
      // Continue anyway to delete from database
    }

    // Delete from database
    const { error: dbError } = await supabase
      .from('photos')
      .delete()
      .eq('id', id);

    if (dbError) {
      console.error('Error deleting photo:', dbError);
      throw new Error('Erreur lors de la suppression');
    }
  }

  static async updateOrder(orderedIds: string[]): Promise<void> {
    const supabase = createAdminClient();

    // Update each photo's display_order
    const updates = orderedIds.map((id, index) =>
      supabase
        .from('photos')
        .update({ display_order: index })
        .eq('id', id)
    );

    await Promise.all(updates);
  }

  static async update(
    id: string,
    input: { alt?: string; category?: PhotoCategory }
  ): Promise<Photo> {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('photos')
      .update(input)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating photo:', error);
      throw new Error('Erreur lors de la mise à jour');
    }

    return data;
  }
}
