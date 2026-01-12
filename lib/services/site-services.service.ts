import { createAdminClient } from '@/lib/supabase/server';
import { createClient } from '@/lib/supabase/client';
import type { Service, CreateServiceInput, UpdateServiceInput } from '@/lib/types';

export class SiteServicesService {
  // Get all services (for admin - includes inactive)
  static async getAll(): Promise<Service[]> {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('services')
      .select('*')
      .order('display_order', { ascending: true });

    if (error) {
      console.error('Error fetching services:', error);
      return [];
    }

    return data || [];
  }

  // Get active services only (for public site)
  static async getActive(): Promise<Service[]> {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error) {
      console.error('Error fetching active services:', error);
      return [];
    }

    return data || [];
  }

  // Get active services from client-side (for public pages)
  static async getActiveClient(): Promise<Service[]> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error) {
      console.error('Error fetching active services:', error);
      return [];
    }

    return data || [];
  }

  static async getById(id: string): Promise<Service | null> {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching service:', error);
      return null;
    }

    return data;
  }

  static async create(input: CreateServiceInput): Promise<Service> {
    const supabase = createAdminClient();

    // Get max display_order if not provided
    let displayOrder = input.display_order;
    if (displayOrder === undefined) {
      const { data: maxData } = await supabase
        .from('services')
        .select('display_order')
        .order('display_order', { ascending: false })
        .limit(1)
        .single();

      displayOrder = (maxData?.display_order || 0) + 1;
    }

    const { data, error } = await supabase
      .from('services')
      .insert({
        emoji: input.emoji,
        title: input.title,
        description: input.description,
        display_order: displayOrder,
        is_active: input.is_active ?? true,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating service:', error);
      throw new Error('Erreur lors de la création du service');
    }

    return data;
  }

  static async update(id: string, input: UpdateServiceInput): Promise<Service> {
    const supabase = createAdminClient();

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (input.emoji !== undefined) updateData.emoji = input.emoji;
    if (input.title !== undefined) updateData.title = input.title;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.display_order !== undefined) updateData.display_order = input.display_order;
    if (input.is_active !== undefined) updateData.is_active = input.is_active;

    const { data, error } = await supabase
      .from('services')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating service:', error);
      throw new Error('Erreur lors de la mise à jour du service');
    }

    return data;
  }

  static async delete(id: string): Promise<void> {
    const supabase = createAdminClient();

    // Check if this is the last service
    const { count } = await supabase
      .from('services')
      .select('*', { count: 'exact', head: true });

    if (count && count <= 1) {
      throw new Error('Impossible de supprimer le dernier service');
    }

    const { error } = await supabase.from('services').delete().eq('id', id);

    if (error) {
      console.error('Error deleting service:', error);
      throw new Error('Erreur lors de la suppression du service');
    }
  }

  static async reorder(orderedIds: string[]): Promise<void> {
    const supabase = createAdminClient();

    // Update display_order for each service
    const updates = orderedIds.map((id, index) =>
      supabase
        .from('services')
        .update({ display_order: index + 1, updated_at: new Date().toISOString() })
        .eq('id', id)
    );

    const results = await Promise.all(updates);
    const hasError = results.some((r) => r.error);

    if (hasError) {
      throw new Error('Erreur lors de la réorganisation des services');
    }
  }
}
