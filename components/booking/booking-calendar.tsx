'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  isSameMonth,
  isSameDay,
  isAfter,
  isBefore,
  getCalendarDays,
  getMinBookingDate,
  getMaxBookingDate,
  frLocale,
} from '@/lib/utils/date';
import { Button } from '@/components/ui/button';

const weekDays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

interface BookingCalendarProps {
  selectedDate: Date | null;
  onDateSelect: (date: Date) => void;
  blockedDates?: string[];
  closedDays?: number[];
  openDates?: string[]; // Dates with exceptional open slots
}

export function BookingCalendar({
  selectedDate,
  onDateSelect,
  blockedDates = [],
  closedDays = [0, 6],
  openDates = [],
}: BookingCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const minDate = getMinBookingDate(24);
  const maxDate = getMaxBookingDate(3);
  const calendarDays = getCalendarDays(currentMonth);

  const isDateDisabled = (date: Date): boolean => {
    const dateStr = format(date, 'yyyy-MM-dd');

    // Check if date has open slots FIRST - these override closed days
    const hasExceptionalOpening = openDates.includes(dateStr);

    // Max date check always applies
    if (isAfter(date, maxDate)) return true;

    // Min date check - but allow exceptional openings even if within 24h
    if (isBefore(date, minDate) && !hasExceptionalOpening) return true;

    // If date has open slots, it's NOT disabled (even if it's a weekend)
    if (hasExceptionalOpening) return false;

    // Otherwise, check if it's a closed day
    if (closedDays.includes(date.getDay())) return true;
    if (blockedDates.includes(dateStr)) return true;
    return false;
  };

  // Check if a date has exceptional open slots (for highlighting)
  const hasOpenSlots = (date: Date): boolean => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return openDates.includes(dateStr);
  };

  const goToPreviousMonth = () => {
    const prevMonth = subMonths(currentMonth, 1);
    if (isAfter(startOfMonth(prevMonth), minDate) || isSameMonth(prevMonth, minDate)) {
      setCurrentMonth(prevMonth);
    }
  };

  const goToNextMonth = () => {
    const nextMonth = addMonths(currentMonth, 1);
    if (isBefore(startOfMonth(nextMonth), maxDate)) {
      setCurrentMonth(nextMonth);
    }
  };

  const canGoPrevious = isAfter(startOfMonth(currentMonth), minDate);
  const canGoNext = isBefore(startOfMonth(addMonths(currentMonth, 1)), maxDate);

  return (
    <div className="bg-background rounded-xl border border-border p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={goToPreviousMonth}
          disabled={!canGoPrevious}
          className="h-9 w-9"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>

        <h3 className="font-serif text-lg font-medium capitalize">
          {format(currentMonth, 'MMMM yyyy', { locale: frLocale })}
        </h3>

        <Button
          variant="ghost"
          size="icon"
          onClick={goToNextMonth}
          disabled={!canGoNext}
          className="h-9 w-9"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Week days header */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map((day) => (
          <div
            key={day}
            className="text-center text-xs font-medium text-muted-foreground py-2"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((day, index) => {
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isSelected = selectedDate && isSameDay(day, selectedDate);
          const isDisabled = isDateDisabled(day);
          const isToday = isSameDay(day, new Date());
          const isOpen = hasOpenSlots(day);

          return (
            <button
              key={index}
              onClick={() => !isDisabled && isCurrentMonth && onDateSelect(day)}
              disabled={isDisabled || !isCurrentMonth}
              className={cn(
                'aspect-square flex items-center justify-center rounded-lg text-sm transition-all',
                !isCurrentMonth && 'text-muted-foreground/30',
                isCurrentMonth && !isDisabled && 'hover:bg-secondary',
                isCurrentMonth && isDisabled && 'text-muted-foreground/50 cursor-not-allowed',
                isSelected && 'bg-primary text-primary-foreground hover:bg-primary/90',
                isToday && !isSelected && 'ring-1 ring-primary/50',
                // Highlight dates with exceptional open slots
                isCurrentMonth && isOpen && !isSelected && 'bg-green-100 text-green-800 hover:bg-green-200 ring-1 ring-green-300'
              )}
            >
              {format(day, 'd')}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-6 flex flex-wrap gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-primary" />
          <span>Sélectionné</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded ring-1 ring-primary/50" />
          <span>Aujourd&apos;hui</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-green-100 ring-1 ring-green-300" />
          <span>Ouverture exceptionnelle</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-muted-foreground/20" />
          <span>Indisponible</span>
        </div>
      </div>
    </div>
  );
}
