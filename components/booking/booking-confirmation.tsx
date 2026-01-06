import { CheckCircle, Calendar, Clock, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { format, parseISO, frLocale } from '@/lib/utils/date';

interface BookingConfirmationProps {
  clientName: string;
  date: string;
  time: string;
  eventType: string;
}

export function BookingConfirmation({
  clientName,
  date,
  time,
  eventType: _eventType,
}: BookingConfirmationProps) {
  const formattedDate = format(parseISO(date), 'EEEE d MMMM yyyy', {
    locale: frLocale,
  });

  return (
    <div className="text-center space-y-8">
      {/* Success icon */}
      <div className="flex justify-center">
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>
      </div>

      {/* Title */}
      <div className="space-y-2">
        <h2 className="font-serif text-2xl font-medium text-foreground">
          Demande envoyée !
        </h2>
        <p className="text-muted-foreground">
          Merci {clientName}, votre demande de rendez-vous a bien été reçue.
        </p>
      </div>

      {/* Appointment details */}
      <div className="bg-secondary/50 rounded-xl p-6 space-y-4 max-w-sm mx-auto">
        <div className="flex items-center gap-3 text-left">
          <Calendar className="w-5 h-5 text-primary flex-shrink-0" />
          <div>
            <p className="text-sm text-muted-foreground">Date</p>
            <p className="font-medium capitalize">{formattedDate}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-left">
          <Clock className="w-5 h-5 text-primary flex-shrink-0" />
          <div>
            <p className="text-sm text-muted-foreground">Heure</p>
            <p className="font-medium">{time} - {parseInt(time) + 1}:00</p>
          </div>
        </div>
      </div>

      {/* Next steps */}
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Nous reviendrons vers vous par email dans les plus brefs délais
          pour confirmer votre rendez-vous.
        </p>

        <Button asChild>
          <Link href="/">
            Retour à l&apos;accueil
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
