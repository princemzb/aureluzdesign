'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BookingCalendar } from './booking-calendar';
import { TimeSlots } from './time-slots';
import { BookingForm } from './booking-form';
import { BookingConfirmation } from './booking-confirmation';
import { format } from '@/lib/utils/date';
import { getAvailableSlots, getDatesWithOpenSlots } from '@/lib/actions/booking.actions';
import { trackFunnelStep } from '@/components/analytics/tracker';
import type { BookingFormData } from '@/lib/validators/booking.schema';
import type { TimeSlot } from '@/lib/types';

type BookingStep = 'date' | 'time' | 'form' | 'confirmation';

interface BookingWizardProps {
  blockedDates?: string[];
  closedDays?: number[];
  openDates?: string[];
  onSubmit?: (data: BookingFormData) => Promise<{ success: boolean; error?: string }>;
}

export function BookingWizard({
  blockedDates = [],
  closedDays = [0, 6],
  openDates: initialOpenDates = [],
  onSubmit,
}: BookingWizardProps) {
  const [step, setStep] = useState<BookingStep>('date');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedData, setSubmittedData] = useState<BookingFormData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [openDates, setOpenDates] = useState<string[]>(initialOpenDates);

  // Fetch open dates on mount
  useEffect(() => {
    const fetchOpenDates = async () => {
      try {
        const dates = await getDatesWithOpenSlots();
        setOpenDates(dates);
      } catch (err) {
        console.error('Error fetching open dates:', err);
      }
    };
    fetchOpenDates();
  }, []);

  // Fetch available slots when date changes
  useEffect(() => {
    if (selectedDate && step === 'time') {
      const fetchSlots = async () => {
        setIsLoadingSlots(true);
        try {
          const dateStr = format(selectedDate, 'yyyy-MM-dd');
          const result = await getAvailableSlots(dateStr);
          setAvailableSlots(result.slots.map(s => ({
            time: s.time,
            available: s.available,
            isExceptional: s.isExceptional
          })));
        } catch (err) {
          console.error('Error fetching slots:', err);
          setAvailableSlots([]);
        } finally {
          setIsLoadingSlots(false);
        }
      };
      fetchSlots();
    }
  }, [selectedDate, step]);

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setSelectedTime(null);
    setAvailableSlots([]);
    setStep('time');
    // Track funnel step
    trackFunnelStep('date_selected');
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
    setStep('form');
    // Track funnel steps
    trackFunnelStep('time_selected');
    trackFunnelStep('form_started');
  };

  const handleFormSubmit = async (data: BookingFormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      if (onSubmit) {
        const result = await onSubmit(data);
        if (!result.success) {
          setError(result.error || 'Une erreur est survenue');
          return;
        }
      }

      setSubmittedData(data);
      setStep('confirmation');
      // Track funnel steps
      trackFunnelStep('form_submitted');
      trackFunnelStep('confirmation_viewed');
    } catch {
      setError('Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const goBack = () => {
    if (step === 'time') {
      setStep('date');
      setSelectedTime(null);
    } else if (step === 'form') {
      setStep('time');
    }
  };

  const stepTitles = {
    date: 'Choisissez une date',
    time: 'Choisissez un créneau',
    form: 'Vos informations',
    confirmation: 'Confirmation',
  };

  return (
    <div className="space-y-8">
      {/* Step indicator */}
      {step !== 'confirmation' && (
        <div className="flex items-center justify-center gap-2">
          {(['date', 'time', 'form'] as const).map((s, index) => (
            <div key={s} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step === s
                    ? 'bg-primary text-primary-foreground'
                    : index < ['date', 'time', 'form'].indexOf(step)
                    ? 'bg-primary/20 text-primary'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {index + 1}
              </div>
              {index < 2 && (
                <div
                  className={`w-12 h-0.5 mx-2 ${
                    index < ['date', 'time', 'form'].indexOf(step)
                      ? 'bg-primary/20'
                      : 'bg-muted'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Back button */}
      {(step === 'time' || step === 'form') && (
        <Button variant="ghost" size="sm" onClick={goBack} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Retour
        </Button>
      )}

      {/* Step title */}
      {step !== 'confirmation' && (
        <h2 className="text-xl font-serif font-medium text-center">
          {stepTitles[step]}
        </h2>
      )}

      {/* Error message */}
      {error && (
        <div className="bg-destructive/10 text-destructive rounded-lg p-4 text-center">
          {error}
        </div>
      )}

      {/* Step content */}
      <div className="max-w-lg mx-auto">
        {step === 'date' && (
          <BookingCalendar
            selectedDate={selectedDate}
            onDateSelect={handleDateSelect}
            blockedDates={blockedDates}
            closedDays={closedDays}
            openDates={openDates}
          />
        )}

        {step === 'time' && selectedDate && (
          isLoadingSlots ? (
            <div className="bg-background rounded-xl border border-border p-12 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
              <p className="text-muted-foreground">Chargement des créneaux...</p>
            </div>
          ) : (
            <TimeSlots
              date={selectedDate}
              selectedTime={selectedTime}
              onTimeSelect={handleTimeSelect}
              availableSlots={availableSlots}
            />
          )
        )}

        {step === 'form' && selectedDate && selectedTime && (
          <div className="bg-background rounded-xl border border-border p-6">
            <BookingForm
              date={format(selectedDate, 'yyyy-MM-dd')}
              time={selectedTime}
              onSubmit={handleFormSubmit}
              isSubmitting={isSubmitting}
            />
          </div>
        )}

        {step === 'confirmation' && submittedData && (
          <BookingConfirmation
            clientName={submittedData.client_name.split(' ')[0]}
            date={submittedData.date}
            time={submittedData.start_time}
            eventType={submittedData.event_type}
          />
        )}
      </div>
    </div>
  );
}
