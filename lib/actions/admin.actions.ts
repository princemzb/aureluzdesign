'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { sendStatusUpdate } from '@/lib/services/email.service';
import type { Appointment, AppointmentStatus } from '@/lib/types';

export async function getAppointments(filters?: {
  status?: AppointmentStatus;
  startDate?: string;
  endDate?: string;
}): Promise<Appointment[]> {
  const supabase = await createClient();

  let query = supabase
    .from('appointments')
    .select('*')
    .order('date', { ascending: true })
    .order('start_time', { ascending: true });

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  if (filters?.startDate) {
    query = query.gte('date', filters.startDate);
  }
  if (filters?.endDate) {
    query = query.lte('date', filters.endDate);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching appointments:', error);
    return [];
  }

  return data || [];
}

export async function getAppointmentById(id: string): Promise<Appointment | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('appointments')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching appointment:', error);
    return null;
  }

  return data;
}

export async function getAppointmentStats(): Promise<{
  total: number;
  pending: number;
  confirmed: number;
  cancelled: number;
}> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('appointments')
    .select('status');

  if (error) {
    console.error('Error fetching stats:', error);
    return { total: 0, pending: 0, confirmed: 0, cancelled: 0 };
  }

  const stats = {
    total: data?.length || 0,
    pending: data?.filter((a) => a.status === 'pending').length || 0,
    confirmed: data?.filter((a) => a.status === 'confirmed').length || 0,
    cancelled: data?.filter((a) => a.status === 'cancelled').length || 0,
  };

  return stats;
}

export async function updateAppointmentStatus(
  appointmentId: string,
  status: AppointmentStatus
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    // Get appointment details first
    const { data: appointment } = await supabase
      .from('appointments')
      .select('*')
      .eq('id', appointmentId)
      .single();

    if (!appointment) {
      return { success: false, error: 'Rendez-vous non trouvé' };
    }

    // Update status
    const { error: updateError } = await supabase
      .from('appointments')
      .update({ status })
      .eq('id', appointmentId);

    if (updateError) {
      console.error('Error updating appointment:', updateError);
      return { success: false, error: 'Erreur lors de la mise à jour' };
    }

    // Send email notification
    if (status === 'confirmed' || status === 'cancelled') {
      await sendStatusUpdate(
        appointment.client_email,
        appointment.client_name,
        appointment.date,
        appointment.start_time,
        status
      );
    }

    revalidatePath('/admin');
    revalidatePath('/admin/appointments');

    return { success: true };
  } catch (error) {
    console.error('Error in updateAppointmentStatus:', error);
    return { success: false, error: 'Une erreur est survenue' };
  }
}

export async function deleteAppointment(
  appointmentId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from('appointments')
      .delete()
      .eq('id', appointmentId);

    if (error) {
      console.error('Error deleting appointment:', error);
      return { success: false, error: 'Erreur lors de la suppression' };
    }

    revalidatePath('/admin');
    revalidatePath('/admin/appointments');

    return { success: true };
  } catch (error) {
    console.error('Error in deleteAppointment:', error);
    return { success: false, error: 'Une erreur est survenue' };
  }
}

export async function createBlockedSlot(
  date: string,
  startTime: string,
  endTime: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    const { error } = await supabase.from('blocked_slots').insert({
      date,
      start_time: startTime,
      end_time: endTime,
      reason: reason || null,
    });

    if (error) {
      if (error.code === '23505') {
        return { success: false, error: 'Ce créneau est déjà bloqué' };
      }
      return { success: false, error: 'Erreur lors de la création' };
    }

    revalidatePath('/admin/settings');
    revalidatePath('/booking');

    return { success: true };
  } catch (error) {
    console.error('Error in createBlockedSlot:', error);
    return { success: false, error: 'Une erreur est survenue' };
  }
}

export async function deleteBlockedSlot(
  slotId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from('blocked_slots')
      .delete()
      .eq('id', slotId);

    if (error) {
      return { success: false, error: 'Erreur lors de la suppression' };
    }

    revalidatePath('/admin/settings');
    revalidatePath('/booking');

    return { success: true };
  } catch (error) {
    console.error('Error in deleteBlockedSlot:', error);
    return { success: false, error: 'Une erreur est survenue' };
  }
}

export async function getBlockedSlots() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('blocked_slots')
    .select('*')
    .order('date', { ascending: true })
    .order('start_time', { ascending: true });

  if (error) {
    console.error('Error fetching blocked slots:', error);
    return [];
  }

  return data || [];
}

// ============================================
// Créneaux ouverts (Open Slots)
// Pour ouvrir des créneaux sur des jours normalement fermés
// ============================================

export async function createOpenSlot(
  date: string,
  startTime: string,
  endTime: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    const { error } = await supabase.from('open_slots').insert({
      date,
      start_time: startTime,
      end_time: endTime,
      reason: reason || null,
    });

    if (error) {
      if (error.code === '23505') {
        return { success: false, error: 'Ce créneau est déjà ouvert' };
      }
      return { success: false, error: 'Erreur lors de la création' };
    }

    revalidatePath('/admin/settings');
    revalidatePath('/booking');

    return { success: true };
  } catch (error) {
    console.error('Error in createOpenSlot:', error);
    return { success: false, error: 'Une erreur est survenue' };
  }
}

export async function deleteOpenSlot(
  slotId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from('open_slots')
      .delete()
      .eq('id', slotId);

    if (error) {
      return { success: false, error: 'Erreur lors de la suppression' };
    }

    revalidatePath('/admin/settings');
    revalidatePath('/booking');

    return { success: true };
  } catch (error) {
    console.error('Error in deleteOpenSlot:', error);
    return { success: false, error: 'Une erreur est survenue' };
  }
}

export async function getOpenSlots() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('open_slots')
    .select('*')
    .order('date', { ascending: true })
    .order('start_time', { ascending: true });

  if (error) {
    console.error('Error fetching open slots:', error);
    return [];
  }

  return data || [];
}

export async function getOpenSlotsForDate(date: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('open_slots')
    .select('*')
    .eq('date', date)
    .order('start_time', { ascending: true });

  if (error) {
    console.error('Error fetching open slots for date:', error);
    return [];
  }

  return data || [];
}
