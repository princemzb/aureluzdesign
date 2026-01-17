'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export interface BusinessHour {
  id: string;
  day_of_week: number;
  open_time: string;
  close_time: string;
  is_open: boolean;
}

export async function getBusinessHours(): Promise<BusinessHour[]> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('business_hours')
      .select('*')
      .order('day_of_week');

    if (error) {
      console.error('Error fetching business hours:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getBusinessHours:', error);
    return [];
  }
}

export async function updateBusinessHour(
  dayOfWeek: number,
  updates: {
    is_open?: boolean;
    open_time?: string;
    close_time?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from('business_hours')
      .update(updates)
      .eq('day_of_week', dayOfWeek);

    if (error) {
      console.error('Error updating business hour:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/admin/site');
    revalidatePath('/booking');

    return { success: true };
  } catch (error) {
    console.error('Error in updateBusinessHour:', error);
    return { success: false, error: 'Erreur lors de la mise à jour' };
  }
}

export async function updateAllBusinessHours(
  hours: Array<{
    day_of_week: number;
    is_open: boolean;
    open_time: string;
    close_time: string;
  }>
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    // Update each day
    for (const hour of hours) {
      const { error } = await supabase
        .from('business_hours')
        .update({
          is_open: hour.is_open,
          open_time: hour.open_time,
          close_time: hour.close_time,
        })
        .eq('day_of_week', hour.day_of_week);

      if (error) {
        console.error(`Error updating day ${hour.day_of_week}:`, error);
        return { success: false, error: error.message };
      }
    }

    revalidatePath('/admin/site');
    revalidatePath('/booking');

    return { success: true };
  } catch (error) {
    console.error('Error in updateAllBusinessHours:', error);
    return { success: false, error: 'Erreur lors de la mise à jour' };
  }
}

export async function applyHoursToAllDays(
  openTime: string,
  closeTime: string,
  applyToClosedDays: boolean = false
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    let query = supabase
      .from('business_hours')
      .update({ open_time: openTime, close_time: closeTime });

    // Only apply to open days unless specified otherwise
    if (!applyToClosedDays) {
      query = query.eq('is_open', true);
    }

    const { error } = await query;

    if (error) {
      console.error('Error applying hours to all days:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/admin/site');
    revalidatePath('/booking');

    return { success: true };
  } catch (error) {
    console.error('Error in applyHoursToAllDays:', error);
    return { success: false, error: 'Erreur lors de la mise à jour' };
  }
}
