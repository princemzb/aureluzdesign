'use client';

import { Clock, CalendarPlus } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { generateTimeSlots, format, frLocale } from '@/lib/utils/date';

interface ExtendedTimeSlot {
  time: string;
  available: boolean;
  isExceptional?: boolean;
}

interface TimeSlotsProps {
  date: Date;
  selectedTime: string | null;
  onTimeSelect: (time: string) => void;
  availableSlots?: ExtendedTimeSlot[];
  openTime?: string;
  closeTime?: string;
}

export function TimeSlots({
  date,
  selectedTime,
  onTimeSelect,
  availableSlots,
  openTime = '09:00',
  closeTime = '18:00',
}: TimeSlotsProps) {
  const allSlots = generateTimeSlots(openTime, closeTime, 60);

  const slots: ExtendedTimeSlot[] = availableSlots || allSlots.map((time) => ({
    time,
    available: true,
    isExceptional: false,
  }));

  const availableCount = slots.filter((s) => s.available).length;
  const exceptionalCount = slots.filter((s) => s.isExceptional).length;
  const hasExceptionalSlots = exceptionalCount > 0;

  return (
    <div className="bg-background rounded-xl border border-border p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Clock className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="font-medium text-foreground">
            {format(date, 'EEEE d MMMM', { locale: frLocale })}
          </h3>
          <p className="text-sm text-muted-foreground">
            {availableCount} créneau{availableCount > 1 ? 'x' : ''} disponible{availableCount > 1 ? 's' : ''}
            {hasExceptionalSlots && (
              <span className="text-green-600 font-medium">
                {' '}• dont {exceptionalCount} exceptionnel{exceptionalCount > 1 ? 's' : ''}
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Time slots grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {slots.map((slot) => {
          const isSelected = selectedTime === slot.time;
          const isDisabled = !slot.available;
          const isExceptional = slot.isExceptional;

          return (
            <button
              key={slot.time}
              onClick={() => slot.available && onTimeSelect(slot.time)}
              disabled={isDisabled}
              className={cn(
                'py-3 px-4 rounded-lg text-sm font-medium transition-all',
                // Normal available slots
                slot.available && !isSelected && !isExceptional && 'bg-secondary hover:bg-secondary/80 text-foreground',
                // Exceptional slots (green) - only these specific slots
                slot.available && !isSelected && isExceptional && 'bg-green-100 hover:bg-green-200 text-green-800 ring-1 ring-green-300',
                // Selected slot
                isSelected && 'bg-primary text-primary-foreground',
                // Disabled slot
                isDisabled && 'bg-muted text-muted-foreground cursor-not-allowed opacity-50'
              )}
            >
              <span className="flex items-center justify-center gap-1">
                {slot.time}
                {isExceptional && slot.available && !isSelected && (
                  <CalendarPlus className="h-3 w-3" />
                )}
              </span>
            </button>
          );
        })}
      </div>

      {/* No slots available */}
      {availableCount === 0 && (
        <div className="text-center py-8">
          <p className="text-muted-foreground">
            Aucun créneau disponible pour cette date.
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Veuillez choisir une autre date.
          </p>
        </div>
      )}

      {/* Duration info */}
      <p className="mt-4 text-xs text-muted-foreground text-center">
        Durée de la consultation : 1 heure
      </p>
    </div>
  );
}
