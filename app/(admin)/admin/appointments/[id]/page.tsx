import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Calendar, Clock, User, Mail, Phone, FileText, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getAppointmentById } from '@/lib/actions/admin.actions';
import { AppointmentActions } from '@/components/admin/appointment-actions';
import { format, parseISO } from '@/lib/utils/date';
import { APPOINTMENT_STATUSES, EVENT_TYPES } from '@/lib/utils/constants';
import { cn } from '@/lib/utils/cn';

interface AppointmentDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function AppointmentDetailPage({ params }: AppointmentDetailPageProps) {
  const { id } = await params;
  const appointment = await getAppointmentById(id);

  if (!appointment) {
    notFound();
  }

  const statusConfig = APPOINTMENT_STATUSES[appointment.status];
  const eventTypeLabel = EVENT_TYPES.find((t) => t.value === appointment.event_type)?.label || appointment.event_type;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="sm">
          <Link href="/admin/appointments">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Link>
        </Button>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-serif font-medium text-foreground">
            Demande de {appointment.client_name}
          </h1>
          <p className="text-muted-foreground mt-1">
            Reçue le {format(parseISO(appointment.created_at), 'dd/MM/yyyy à HH:mm')}
          </p>
        </div>
        <span
          className={cn(
            'inline-flex items-center px-3 py-1 rounded-full text-sm font-medium',
            appointment.status === 'pending' && 'bg-yellow-100 text-yellow-800',
            appointment.status === 'confirmed' && 'bg-green-100 text-green-800',
            appointment.status === 'cancelled' && 'bg-red-100 text-red-800'
          )}
        >
          {statusConfig.label}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Date & Time Card */}
          <div className="bg-background rounded-xl border border-border p-6">
            <h2 className="font-medium text-foreground mb-4 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Date et heure
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Date</p>
                <p className="text-lg font-medium text-foreground">
                  {format(parseISO(appointment.date), 'EEEE d MMMM yyyy')}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Horaire</p>
                <p className="text-lg font-medium text-foreground flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  {appointment.start_time} - {appointment.end_time}
                </p>
              </div>
            </div>
          </div>

          {/* Event Type Card */}
          <div className="bg-background rounded-xl border border-border p-6">
            <h2 className="font-medium text-foreground mb-4 flex items-center gap-2">
              <Tag className="h-5 w-5 text-primary" />
              Type d&apos;événement
            </h2>
            <p className="text-lg font-medium text-foreground">{eventTypeLabel}</p>
          </div>

          {/* Message Card */}
          {appointment.message && (
            <div className="bg-background rounded-xl border border-border p-6">
              <h2 className="font-medium text-foreground mb-4 flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Message du client
              </h2>
              <p className="text-foreground whitespace-pre-wrap">{appointment.message}</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Client Info Card */}
          <div className="bg-background rounded-xl border border-border p-6">
            <h2 className="font-medium text-foreground mb-4 flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Informations client
            </h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Nom</p>
                <p className="font-medium text-foreground">{appointment.client_name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <a
                  href={`mailto:${appointment.client_email}`}
                  className="font-medium text-primary hover:underline flex items-center gap-2"
                >
                  <Mail className="h-4 w-4" />
                  {appointment.client_email}
                </a>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Téléphone</p>
                <a
                  href={`tel:${appointment.client_phone}`}
                  className="font-medium text-primary hover:underline flex items-center gap-2"
                >
                  <Phone className="h-4 w-4" />
                  {appointment.client_phone}
                </a>
              </div>
            </div>
          </div>

          {/* Actions Card */}
          <div className="bg-background rounded-xl border border-border p-6">
            <h2 className="font-medium text-foreground mb-4">Actions</h2>
            <AppointmentActions
              appointmentId={appointment.id}
              currentStatus={appointment.status}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
