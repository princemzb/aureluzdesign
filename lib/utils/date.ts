import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isAfter,
  isBefore,
  addHours,
  parseISO,
  addDays,
  getDay,
} from 'date-fns';
import { fr } from 'date-fns/locale';

export {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isAfter,
  isBefore,
  addHours,
  parseISO,
  addDays,
  getDay,
};

export const frLocale = fr;

export function formatDate(date: Date | string, formatStr: string = 'PP'): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, formatStr, { locale: fr });
}

export function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'HH:mm', { locale: fr });
}

export function getCalendarDays(date: Date): Date[] {
  const start = startOfWeek(startOfMonth(date), { weekStartsOn: 1 });
  const end = endOfWeek(endOfMonth(date), { weekStartsOn: 1 });
  return eachDayOfInterval({ start, end });
}

export function isDateInPast(date: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return isBefore(date, today);
}

export function isDateTooSoon(date: Date, minHoursNotice: number = 24): boolean {
  const minDate = addHours(new Date(), minHoursNotice);
  return isBefore(date, minDate);
}

export function generateTimeSlots(
  openTime: string = '09:00',
  closeTime: string = '18:00',
  durationMinutes: number = 60
): string[] {
  const slots: string[] = [];
  const [openHour, openMinute] = openTime.split(':').map(Number);
  const [closeHour, closeMinute] = closeTime.split(':').map(Number);

  let currentHour = openHour;
  let currentMinute = openMinute;

  while (
    currentHour < closeHour ||
    (currentHour === closeHour && currentMinute < closeMinute)
  ) {
    const timeStr = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;
    slots.push(timeStr);

    currentMinute += durationMinutes;
    if (currentMinute >= 60) {
      currentHour += Math.floor(currentMinute / 60);
      currentMinute = currentMinute % 60;
    }
  }

  return slots;
}

export function getMinBookingDate(minHoursNotice: number = 24): Date {
  return addHours(new Date(), minHoursNotice);
}

export function getMaxBookingDate(monthsAhead: number = 3): Date {
  return addMonths(new Date(), monthsAhead);
}
