import type { Metadata } from 'next';
import { BookingWizard } from '@/components/booking/booking-wizard';
import { createAppointment, getDatesWithOpenSlots } from '@/lib/actions/booking.actions';
import { getClosedDays } from '@/lib/actions/business-hours.actions';

export const metadata: Metadata = {
  title: 'Réserver une consultation',
  description:
    'Réservez une consultation gratuite d\'une heure avec AureLuz pour discuter de votre projet de décoration événementielle.',
};

export default async function BookingPage() {
  // Pre-fetch data on server for immediate availability
  const [openDates, closedDays] = await Promise.all([
    getDatesWithOpenSlots(),
    getClosedDays(),
  ]);

  return (
    <div className="section-padding">
      <div className="container-main">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <p className="text-sm uppercase tracking-[0.2em] text-primary font-medium mb-4">
              Réservation
            </p>
            <h1 className="section-title">Réserver une consultation</h1>
            <p className="section-subtitle mx-auto">
              Choisissez un créneau qui vous convient pour une consultation
              gratuite d&apos;une heure. Nous discuterons de votre projet et de
              vos envies.
            </p>
          </div>

          {/* Booking wizard */}
          <BookingWizard
            closedDays={closedDays}
            openDates={openDates}
            onSubmit={createAppointment}
          />
        </div>
      </div>
    </div>
  );
}
