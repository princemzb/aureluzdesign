'use client';

import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { generateTimeSlots, format, frLocale } from '@/lib/utils/date';
import type { TimeSlot } from '@/lib/types';

interface TimeSlotsProps {
  date: Date;
  selectedTime: string | null;
  onTimeSelect: (time: string) => void;
  availableSlots?: TimeSlot[];
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

  const slots: TimeSlot[] = availableSlots || allSlots.map((time) => ({
    time,
    available: true,
  }));

  const availableCount = slots.filter((s) => s.available).length;

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
          </p>
        </div>
      </div>

      {/* Time slots grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {slots.map((slot) => {
          const isSelected = selectedTime === slot.time;
          const isDisabled = !slot.available;

          return (
            <button
              key={slot.time}
              onClick={() => slot.available && onTimeSelect(slot.time)}
              disabled={isDisabled}
              className={cn(
                'py-3 px-4 rounded-lg text-sm font-medium transition-all',
                slot.available && !isSelected && 'bg-secondary hover:bg-secondary/80 text-foreground',
                isSelected && 'bg-primary text-primary-foreground',
                isDisabled && 'bg-muted text-muted-foreground cursor-not-allowed opacity-50'
              )}
            >
              {slot.time}
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
