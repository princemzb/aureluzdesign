import Link from 'next/link';
import { ArrowRight, Calendar, Check, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatsCards } from '@/components/admin/stats-cards';
import { getAppointmentStats, getAppointments } from '@/lib/actions/admin.actions';
import { format, parseISO } from '@/lib/utils/date';
import { EVENT_TYPES } from '@/lib/utils/constants';
import { PendingAppointmentActions } from '@/components/admin/pending-appointment-actions';

export default async function AdminDashboard() {
  const [stats, pendingAppointments] = await Promise.all([
    getAppointmentStats(),
    getAppointments({ status: 'pending' }),
  ]);

  const getEventTypeLabel = (type: string) => {
    return EVENT_TYPES.find((t) => t.value === type)?.label || type;
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-serif font-medium text-foreground">
          Tableau de bord
        </h1>
        <p className="text-muted-foreground mt-1">
          Bienvenue dans votre espace d&apos;administration.
        </p>
      </div>

      {/* Stats */}
      <StatsCards stats={stats} />

      {/* Pending appointments */}
      <div className="bg-background rounded-xl border border-border">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Calendar className="h-5 w-5 text-yellow-700" />
            </div>
            <div>
              <h2 className="font-medium text-foreground">
                Demandes en attente
              </h2>
              <p className="text-sm text-muted-foreground">
                {stats.pending} demande{stats.pending > 1 ? 's' : ''} à traiter
              </p>
            </div>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/appointments">
              Gestion avancée
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>

        {pendingAppointments.length > 0 ? (
          <div className="divide-y divide-border">
            {pendingAppointments.map((appointment) => (
              <div
                key={appointment.id}
                className="p-4 flex items-center justify-between hover:bg-secondary/30 transition-colors"
              >
                <Link
                  href={`/admin/appointments/${appointment.id}`}
                  className="flex items-center gap-4 flex-1"
                >
                  <div className="text-center min-w-[60px]">
                    <p className="text-2xl font-semibold text-foreground">
                      {format(parseISO(appointment.date), 'dd')}
                    </p>
                    <p className="text-xs text-muted-foreground uppercase">
                      {format(parseISO(appointment.date), 'MMM')}
                    </p>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">
                      {appointment.client_name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {appointment.start_time.slice(0, 5)} • {getEventTypeLabel(appointment.event_type)}
                    </p>
                  </div>
                </Link>
                <div className="flex items-center gap-2">
                  <PendingAppointmentActions appointmentId={appointment.id} />
                  <Link href={`/admin/appointments/${appointment.id}`}>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <Check className="h-6 w-6 text-green-600" />
            </div>
            <p className="text-foreground font-medium">Tout est à jour !</p>
            <p className="text-muted-foreground text-sm mt-1">
              Aucune demande en attente de traitement.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
