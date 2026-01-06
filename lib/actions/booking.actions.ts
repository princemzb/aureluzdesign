'use server';

import { revalidatePath } from 'next/cache';
import { bookingSchema, type BookingFormData } from '@/lib/validators/booking.schema';
import { createClient } from '@/lib/supabase/server';
import { sendBookingConfirmation, sendAdminNotification } from '@/lib/services/email.service';

export async function createAppointment(
  data: BookingFormData
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Validate data
    const validatedData = bookingSchema.parse(data);

    // 2. Calculate end time (1 hour after start)
    const [hours] = validatedData.start_time.split(':').map(Number);
    const endTime = `${String(hours + 1).padStart(2, '0')}:00`;

    // 3. Get Supabase client
    const supabase = await createClient();

    // 4. Check if slot is still available
    const { data: existingAppointment } = await supabase
      .from('appointments')
      .select('id')
      .eq('date', validatedData.date)
      .eq('start_time', validatedData.start_time)
      .neq('status', 'cancelled')
      .single();

    if (existingAppointment) {
      return {
        success: false,
        error: 'Ce créneau n\'est plus disponible. Veuillez en choisir un autre.',
      };
    }

    // 5. Check if slot is blocked (check time range, not exact match)
    const { data: blockedSlots } = await supabase
      .from('blocked_slots')
      .select('start_time, end_time')
      .eq('date', validatedData.date);

    if (blockedSlots && blockedSlots.length > 0) {
      const slotHour = parseInt(validatedData.start_time.split(':')[0]);
      const isBlocked = blockedSlots.some((b) => {
        const blockStart = parseInt(b.start_time.split(':')[0]);
        const blockEnd = parseInt(b.end_time.split(':')[0]);
        return slotHour >= blockStart && slotHour < blockEnd;
      });

      if (isBlocked) {
        return {
          success: false,
          error: 'Ce créneau n\'est plus disponible. Veuillez en choisir un autre.',
        };
      }
    }

    // 6. Create appointment
    const { error: insertError } = await supabase.from('appointments').insert({
      client_name: validatedData.client_name,
      client_email: validatedData.client_email,
      client_phone: validatedData.client_phone,
      date: validatedData.date,
      start_time: validatedData.start_time,
      end_time: endTime,
      event_type: validatedData.event_type,
      message: validatedData.message || null,
      status: 'pending',
    });

    if (insertError) {
      console.error('Error creating appointment:', insertError);

      // Handle unique constraint violation
      if (insertError.code === '23505') {
        return {
          success: false,
          error: 'Ce créneau vient d\'être réservé. Veuillez en choisir un autre.',
        };
      }

      return {
        success: false,
        error: 'Une erreur est survenue. Veuillez réessayer.',
      };
    }

    // 7. Send confirmation emails
    await sendBookingConfirmation(validatedData);
    await sendAdminNotification(validatedData);

    // 8. Revalidate paths
    revalidatePath('/booking');
    revalidatePath('/admin/appointments');

    return { success: true };
  } catch (error) {
    console.error('Error in createAppointment:', error);

    if (error instanceof Error && error.name === 'ZodError') {
      return {
        success: false,
        error: 'Les données du formulaire sont invalides.',
      };
    }

    return {
      success: false,
      error: 'Une erreur est survenue. Veuillez réessayer.',
    };
  }
}

export async function getAvailableSlots(date: string): Promise<{
  slots: { time: string; available: boolean }[];
  isOpen: boolean;
}> {
  try {
    const supabase = await createClient();
    const dayOfWeek = new Date(date).getDay();

    // Get business hours for this day
    const { data: hours } = await supabase
      .from('business_hours')
      .select('*')
      .eq('day_of_week', dayOfWeek)
      .single();

    if (!hours?.is_open) {
      return { slots: [], isOpen: false };
    }

    // Get existing appointments
    const { data: appointments } = await supabase
      .from('appointments')
      .select('start_time')
      .eq('date', date)
      .neq('status', 'cancelled');

    // Get blocked slots (with full time range)
    const { data: blocked } = await supabase
      .from('blocked_slots')
      .select('start_time, end_time')
      .eq('date', date);

    // Get booked times from appointments (normalize to HH:00 format)
    const bookedTimes = new Set(
      appointments?.map((a) => {
        // Handle both "HH:00" and "HH:00:00" formats
        const timeParts = a.start_time.split(':');
        return `${timeParts[0]}:${timeParts[1]}`;
      }) || []
    );

    // Helper to check if a time slot falls within a blocked range
    const isTimeBlocked = (timeStr: string): boolean => {
      if (!blocked || blocked.length === 0) return false;

      const slotHour = parseInt(timeStr.split(':')[0]);

      return blocked.some((b) => {
        const blockStart = parseInt(b.start_time.split(':')[0]);
        const blockEnd = parseInt(b.end_time.split(':')[0]);
        return slotHour >= blockStart && slotHour < blockEnd;
      });
    };

    // Generate time slots
    const slots: { time: string; available: boolean }[] = [];
    const openHour = parseInt(hours.open_time.split(':')[0]);
    const closeHour = parseInt(hours.close_time.split(':')[0]);

    for (let hour = openHour; hour < closeHour; hour++) {
      const timeStr = `${String(hour).padStart(2, '0')}:00`;
      slots.push({
        time: timeStr,
        available: !bookedTimes.has(timeStr) && !isTimeBlocked(timeStr),
      });
    }

    return { slots, isOpen: true };
  } catch (error) {
    console.error('Error getting available slots:', error);
    return { slots: [], isOpen: false };
  }
}
