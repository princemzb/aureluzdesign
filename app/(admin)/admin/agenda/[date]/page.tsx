import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Calendar, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getAppointments } from '@/lib/actions/admin.actions';
import { getTasks } from '@/lib/actions/tasks.actions';
import { format, parseISO, frLocale } from '@/lib/utils/date';
import { cn } from '@/lib/utils/cn';
import { APPOINTMENT_STATUSES, EVENT_TYPES } from '@/lib/utils/constants';
import type { Appointment, TaskPriority } from '@/lib/types';

interface DayViewPageProps {
  params: Promise<{ date: string }>;
}

const PRIORITY_COLORS: Record<TaskPriority, { bg: string; border: string; text: string }> = {
  urgent: { bg: 'bg-red-50', border: 'border-red-500', text: 'text-red-700' },
  high: { bg: 'bg-orange-50', border: 'border-orange-500', text: 'text-orange-700' },
  normal: { bg: 'bg-blue-50', border: 'border-blue-500', text: 'text-blue-700' },
  low: { bg: 'bg-gray-50', border: 'border-gray-400', text: 'text-gray-600' },
};

const HOURS = Array.from({ length: 12 }, (_, i) => i + 8); // 8h à 19h

export default async function DayViewPage({ params }: DayViewPageProps) {
  const { date } = await params;

  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    notFound();
  }

  const parsedDate = parseISO(date);
  if (isNaN(parsedDate.getTime())) {
    notFound();
  }

  // Fetch appointments and tasks for this date
  const [allAppointments, tasksResult] = await Promise.all([
    getAppointments(),
    getTasks({ pageSize: 1000 }),
  ]);

  const appointments = allAppointments.filter((a) => a.date === date);
  const tasks = tasksResult.tasks.filter((t) => t.due_date?.split('T')[0] === date);

  const getEventTypeLabel = (type: string) => {
    return EVENT_TYPES.find((t) => t.value === type)?.label || type;
  };

  // Calculate position and height for appointments
  const getAppointmentStyle = (appointment: Appointment) => {
    const startHour = parseInt(appointment.start_time.split(':')[0]);
    const startMin = parseInt(appointment.start_time.split(':')[1]);
    const endHour = parseInt(appointment.end_time.split(':')[0]);
    const endMin = parseInt(appointment.end_time.split(':')[1]);

    const top = ((startHour - 8) * 60 + startMin) * (80 / 60); // 80px par heure
    const height = ((endHour - startHour) * 60 + (endMin - startMin)) * (80 / 60);

    return { top: `${top}px`, height: `${height}px` };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/appointments">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Calendar className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-serif font-medium text-foreground capitalize">
                {format(parsedDate, 'EEEE d MMMM yyyy', { locale: frLocale })}
              </h1>
              <p className="text-muted-foreground mt-1">
                {appointments.length} rendez-vous · {tasks.length} tâche{tasks.length > 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Timeline */}
        <div className="lg:col-span-2 bg-background rounded-xl border border-border overflow-hidden">
          <div className="p-4 border-b border-border">
            <h2 className="font-medium text-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Planning de la journée
            </h2>
          </div>

          <div className="p-4">
            <div className="relative">
              {/* Time grid */}
              {HOURS.map((hour) => (
                <div key={hour} className="flex border-t border-border" style={{ height: '80px' }}>
                  <div className="w-16 flex-shrink-0 pr-2 text-right">
                    <span className="text-xs text-muted-foreground -mt-2 block">
                      {hour}:00
                    </span>
                  </div>
                  <div className="flex-1 relative" />
                </div>
              ))}

              {/* Appointments overlay */}
              <div className="absolute left-16 right-0 top-0">
                {appointments.map((appointment) => {
                  const style = getAppointmentStyle(appointment);
                  return (
                    <Link
                      key={appointment.id}
                      href={`/admin/appointments/${appointment.id}`}
                      style={style}
                      className={cn(
                        'absolute left-1 right-1 rounded-lg p-2 border-l-4 transition-shadow hover:shadow-md',
                        appointment.status === 'pending' && 'bg-yellow-50 border-yellow-500',
                        appointment.status === 'confirmed' && 'bg-green-50 border-green-500',
                        appointment.status === 'cancelled' && 'bg-red-50 border-red-500 opacity-50'
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium text-foreground text-sm truncate">
                            {appointment.client_name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {appointment.start_time.slice(0, 5)} - {appointment.end_time.slice(0, 5)}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {getEventTypeLabel(appointment.event_type)}
                          </p>
                        </div>
                        <span
                          className={cn(
                            'px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0',
                            appointment.status === 'pending' && 'bg-yellow-100 text-yellow-800',
                            appointment.status === 'confirmed' && 'bg-green-100 text-green-800',
                            appointment.status === 'cancelled' && 'bg-red-100 text-red-800'
                          )}
                        >
                          {APPOINTMENT_STATUSES[appointment.status].label}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Tasks sidebar */}
        <div className="bg-background rounded-xl border border-border overflow-hidden h-fit">
          <div className="p-4 border-b border-border">
            <h2 className="font-medium text-foreground">
              Tâches du jour ({tasks.length})
            </h2>
          </div>

          {tasks.length > 0 ? (
            <div className="divide-y divide-border">
              {tasks.map((task) => {
                const colors = PRIORITY_COLORS[task.priority];
                return (
                  <Link
                    key={task.id}
                    href={`/admin/tasks/${task.id}`}
                    className={cn(
                      'block p-4 border-l-4 transition-shadow hover:shadow-md',
                      colors.bg,
                      colors.border,
                      task.status === 'completed' && 'opacity-50'
                    )}
                  >
                    <p className={cn('font-medium', colors.text, task.status === 'completed' && 'line-through')}>
                      {task.name}
                    </p>
                    {task.location && (
                      <p className="text-sm text-muted-foreground mt-1">
                        📍 {task.location}
                      </p>
                    )}
                    {task.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {task.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <span className={cn(
                        'px-2 py-0.5 rounded-full text-xs font-medium',
                        task.status === 'pending' && 'bg-gray-100 text-gray-700',
                        task.status === 'in_progress' && 'bg-blue-100 text-blue-700',
                        task.status === 'completed' && 'bg-green-100 text-green-700',
                        task.status === 'cancelled' && 'bg-red-100 text-red-700'
                      )}>
                        {task.status === 'pending' && 'À faire'}
                        {task.status === 'in_progress' && 'En cours'}
                        {task.status === 'completed' && 'Terminé'}
                        {task.status === 'cancelled' && 'Annulé'}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              Aucune tâche prévue ce jour
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
