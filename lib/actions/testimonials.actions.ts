'use server';

import { revalidatePath } from 'next/cache';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import type { Testimonial, TestimonialStatus } from '@/lib/types';

// Client-side: Get approved testimonials
export async function getApprovedTestimonials(): Promise<Testimonial[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('testimonials')
    .select('*')
    .eq('status', 'approved')
    .order('approved_at', { ascending: false });

  if (error) {
    console.error('Error fetching testimonials:', error);
    return [];
  }

  return data || [];
}

// Client-side: Submit a new testimonial
export async function submitTestimonial(formData: {
  client_name: string;
  client_email: string;
  event_type: string;
  event_date?: string;
  rating: number;
  title: string;
  content: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    const { error } = await supabase.from('testimonials').insert({
      client_name: formData.client_name,
      client_email: formData.client_email,
      event_type: formData.event_type,
      event_date: formData.event_date || null,
      rating: formData.rating,
      title: formData.title,
      content: formData.content,
      status: 'pending',
    });

    if (error) {
      console.error('Error submitting testimonial:', error);
      return { success: false, error: 'Erreur lors de l\'envoi du témoignage' };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in submitTestimonial:', error);
    return { success: false, error: 'Une erreur est survenue' };
  }
}

// Admin: Get all testimonials (uses service role to bypass RLS)
export async function getAllTestimonials(status?: TestimonialStatus): Promise<Testimonial[]> {
  const supabase = createAdminClient();

  let query = supabase
    .from('testimonials')
    .select('*')
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching testimonials:', error);
    return [];
  }

  return data || [];
}

// Admin: Get testimonial stats (uses service role to bypass RLS)
export async function getTestimonialStats(): Promise<{
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('testimonials')
    .select('status');

  if (error) {
    console.error('Error fetching testimonial stats:', error);
    return { total: 0, pending: 0, approved: 0, rejected: 0 };
  }

  return {
    total: data?.length || 0,
    pending: data?.filter((t) => t.status === 'pending').length || 0,
    approved: data?.filter((t) => t.status === 'approved').length || 0,
    rejected: data?.filter((t) => t.status === 'rejected').length || 0,
  };
}

// Admin: Update testimonial status (uses service role to bypass RLS)
export async function updateTestimonialStatus(
  id: string,
  status: TestimonialStatus
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createAdminClient();

    const updateData: Record<string, unknown> = { status };

    if (status === 'approved') {
      updateData.approved_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('testimonials')
      .update(updateData)
      .eq('id', id);

    if (error) {
      console.error('Error updating testimonial:', error);
      return { success: false, error: 'Erreur lors de la mise à jour' };
    }

    revalidatePath('/');
    revalidatePath('/admin/testimonials');

    return { success: true };
  } catch (error) {
    console.error('Error in updateTestimonialStatus:', error);
    return { success: false, error: 'Une erreur est survenue' };
  }
}

// Admin: Delete testimonial (uses service role to bypass RLS)
export async function deleteTestimonial(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createAdminClient();

    const { error } = await supabase
      .from('testimonials')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting testimonial:', error);
      return { success: false, error: 'Erreur lors de la suppression' };
    }

    revalidatePath('/');
    revalidatePath('/admin/testimonials');

    return { success: true };
  } catch (error) {
    console.error('Error in deleteTestimonial:', error);
    return { success: false, error: 'Une erreur est survenue' };
  }
}
