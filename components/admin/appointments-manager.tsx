'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  Filter,
  Calendar as CalendarIcon,
  List,
  Download,
  Check,
  X,
  ChevronRight,
  ChevronLeft,
  Mail,
  Phone,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';
import {
  format,
  parseISO,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  addMonths,
  subMonths,
  getDay,
  frLocale,
} from '@/lib/utils/date';
import { APPOINTMENT_STATUSES, EVENT_TYPES } from '@/lib/utils/constants';
import type { Appointment, AppointmentStatus } from '@/lib/types';

interface AppointmentsManagerProps {
  appointments: Appointment[];
  onUpdateStatus: (id: string, status: AppointmentStatus) => Promise<void>;
}

type ViewMode = 'list' | 'calendar';

const STATUS_FILTERS = [
  { value: 'all', label: 'Tous', className: 'bg-secondary text-foreground' },
  { value: 'pending', label: 'En attente', className: 'bg-yellow-100 text-yellow-800' },
  { value: 'confirmed', label: 'Confirmés', className: 'bg-green-100 text-green-800' },
  { value: 'cancelled', label: 'Annulés', className: 'bg-red-100 text-red-800' },
] as const;

export function AppointmentsManager({
  appointments,
  onUpdateStatus,
}: AppointmentsManagerProps) {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [loadingId, setLoadingId] = useState<string | null>(null);

  // Filter appointments
  const filteredAppointments = useMemo(() => {
    return appointments.filter((appointment) => {
      // Status filter
      if (statusFilter !== 'all' && appointment.status !== statusFilter) {
        return false;
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          appointment.client_name.toLowerCase().includes(query) ||
          appointment.client_email.toLowerCase().includes(query) ||
          appointment.client_phone.includes(query)
        );
      }

      return true;
    });
  }, [appointments, statusFilter, searchQuery]);

  // Count by status
  const counts = useMemo(() => ({
    all: appointments.length,
    pending: appointments.filter((a) => a.status === 'pending').length,
    confirmed: appointments.filter((a) => a.status === 'confirmed').length,
    cancelled: appointments.filter((a) => a.status === 'cancelled').length,
  }), [appointments]);

  const handleRowClick = (appointmentId: string) => {
    router.push(`/admin/appointments/${appointmentId}`);
  };

  const handleStatusChange = async (e: React.MouseEvent, id: string, status: AppointmentStatus) => {
    e.stopPropagation();
    setLoadingId(id);
    try {
      await onUpdateStatus(id, status);
    } finally {
      setLoadingId(null);
    }
  };

  const getStatusBadge = (status: AppointmentStatus) => {
    const config = APPOINTMENT_STATUSES[status];
    return (
      <span
        className={cn(
          'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
          status === 'pending' && 'bg-yellow-100 text-yellow-800',
          status === 'confirmed' && 'bg-green-100 text-green-800',
          status === 'cancelled' && 'bg-red-100 text-red-800'
        )}
      >
        {config.label}
      </span>
    );
  };

  const getEventTypeLabel = (type: string) => {
    return EVENT_TYPES.find((t) => t.value === type)?.label || type;
  };

  // Export to CSV
  const exportToCSV = () => {
    const headers = ['Nom', 'Email', 'Téléphone', 'Date', 'Heure', 'Type', 'Statut', 'Message'];
    const rows = filteredAppointments.map((a) => [
      a.client_name,
      a.client_email,
      a.client_phone,
      format(parseISO(a.date), 'dd/MM/yyyy'),
      `${a.start_time.slice(0, 5)} - ${a.end_time.slice(0, 5)}`,
      getEventTypeLabel(a.event_type),
      APPOINTMENT_STATUSES[a.status].label,
      a.message || '',
    ]);

    const csvContent = [
      headers.join(';'),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(';')),
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `rendez-vous-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  // Calendar helpers
  const calendarDays = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start, end });

    // Add padding days for the start of the month
    const startDay = getDay(start);
    const paddingDays = startDay === 0 ? 6 : startDay - 1; // Monday = 0

    return { days, paddingDays };
  }, [currentMonth]);

  const getAppointmentsForDay = (day: Date) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    return filteredAppointments.filter((a) => a.date === dateStr);
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="bg-background rounded-xl border border-border p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Rechercher par nom, email ou téléphone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {/* View toggle & Export */}
          <div className="flex items-center gap-2">
            <div className="flex items-center border border-border rounded-lg p-1">
              <button
                onClick={() => setViewMode('list')}
                className={cn(
                  'p-2 rounded-md transition-colors',
                  viewMode === 'list'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
                title="Vue liste"
              >
                <List className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('calendar')}
                className={cn(
                  'p-2 rounded-md transition-colors',
                  viewMode === 'calendar'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
                title="Vue calendrier"
              >
                <CalendarIcon className="h-4 w-4" />
              </button>
            </div>

            <Button variant="outline" size="sm" onClick={exportToCSV}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Status filters */}
        <div className="flex items-center gap-2 mt-4 flex-wrap">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground mr-2">Filtrer:</span>
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter.value}
              onClick={() => setStatusFilter(filter.value)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-medium transition-all',
                statusFilter === filter.value
                  ? cn(filter.className, 'ring-2 ring-offset-2 ring-primary/50')
                  : 'bg-secondary/50 text-muted-foreground hover:bg-secondary'
              )}
            >
              {filter.label} ({counts[filter.value as keyof typeof counts]})
            </button>
          ))}
        </div>
      </div>

      {/* List View */}
      {viewMode === 'list' && (
        <div className="bg-background rounded-xl border border-border overflow-hidden">
          {filteredAppointments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-secondary/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Client
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Date & Heure
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Statut
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredAppointments.map((appointment) => (
                    <tr
                      key={appointment.id}
                      onClick={() => handleRowClick(appointment.id)}
                      className="hover:bg-secondary/30 cursor-pointer transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-foreground">
                            {appointment.client_name}
                          </p>
                          <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            {appointment.client_email}
                          </div>
                          <div className="flex items-center gap-1 mt-0.5 text-sm text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            {appointment.client_phone}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-foreground">
                          {format(parseISO(appointment.date), 'dd/MM/yyyy')}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {appointment.start_time.slice(0, 5)} - {appointment.end_time.slice(0, 5)}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-foreground">
                          {getEventTypeLabel(appointment.event_type)}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(appointment.status)}
                      </td>
                      <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          {appointment.status === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                onClick={(e) => handleStatusChange(e, appointment.id, 'confirmed')}
                                disabled={loadingId === appointment.id}
                              >
                                <Check className="h-4 w-4 mr-1" />
                                Accepter
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={(e) => handleStatusChange(e, appointment.id, 'cancelled')}
                                disabled={loadingId === appointment.id}
                              >
                                <X className="h-4 w-4 mr-1" />
                                Refuser
                              </Button>
                            </>
                          )}
                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center">
              <p className="text-muted-foreground">
                {searchQuery
                  ? 'Aucun résultat pour cette recherche.'
                  : 'Aucun rendez-vous dans cette catégorie.'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Calendar View */}
      {viewMode === 'calendar' && (
        <div className="bg-background rounded-xl border border-border overflow-hidden">
          {/* Calendar header */}
          <div className="p-4 border-b border-border flex items-center justify-between">
            <button
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="p-2 hover:bg-secondary rounded-lg transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <h3 className="font-medium text-foreground capitalize">
              {format(currentMonth, 'MMMM yyyy', { locale: frLocale })}
            </h3>
            <button
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="p-2 hover:bg-secondary rounded-lg transition-colors"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          {/* Calendar grid */}
          <div className="p-4">
            {/* Day headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((day) => (
                <div
                  key={day}
                  className="text-center text-xs font-medium text-muted-foreground py-2"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar days */}
            <div className="grid grid-cols-7 gap-1">
              {/* Padding days */}
              {Array.from({ length: calendarDays.paddingDays }).map((_, i) => (
                <div key={`pad-${i}`} className="min-h-[100px]" />
              ))}

              {/* Actual days */}
              {calendarDays.days.map((day) => {
                const dayAppointments = getAppointmentsForDay(day);
                const isToday = isSameDay(day, new Date());

                return (
                  <div
                    key={day.toISOString()}
                    className={cn(
                      'min-h-[100px] border border-border rounded-lg p-2',
                      isToday && 'bg-primary/5 border-primary'
                    )}
                  >
                    <div
                      className={cn(
                        'text-sm font-medium mb-1',
                        isToday ? 'text-primary' : 'text-foreground'
                      )}
                    >
                      {format(day, 'd')}
                    </div>
                    <div className="space-y-1">
                      {dayAppointments.slice(0, 3).map((appointment) => (
                        <button
                          key={appointment.id}
                          onClick={() => handleRowClick(appointment.id)}
                          className={cn(
                            'w-full text-left text-xs p-1 rounded truncate',
                            appointment.status === 'pending' && 'bg-yellow-100 text-yellow-800',
                            appointment.status === 'confirmed' && 'bg-green-100 text-green-800',
                            appointment.status === 'cancelled' && 'bg-red-100 text-red-800 line-through'
                          )}
                          title={`${appointment.start_time.slice(0, 5)} - ${appointment.client_name}`}
                        >
                          {appointment.start_time.slice(0, 5)} {appointment.client_name.split(' ')[0]}
                        </button>
                      ))}
                      {dayAppointments.length > 3 && (
                        <div className="text-xs text-muted-foreground text-center">
                          +{dayAppointments.length - 3} autres
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
