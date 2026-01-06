'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Filter, Check, X, ChevronRight, Mail, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';
import { format, parseISO } from '@/lib/utils/date';
import { APPOINTMENT_STATUSES, EVENT_TYPES } from '@/lib/utils/constants';
import type { Appointment, AppointmentStatus } from '@/lib/types';

interface AppointmentsListProps {
  appointments: Appointment[];
  onUpdateStatus: (id: string, status: AppointmentStatus) => Promise<void>;
}

const STATUS_FILTERS = [
  { value: 'all', label: 'Tous', className: 'bg-secondary text-foreground' },
  { value: 'pending', label: 'En attente', className: 'bg-yellow-100 text-yellow-800' },
  { value: 'confirmed', label: 'Confirmés', className: 'bg-green-100 text-green-800' },
  { value: 'cancelled', label: 'Annulés', className: 'bg-red-100 text-red-800' },
] as const;

export function AppointmentsList({
  appointments,
  onUpdateStatus,
}: AppointmentsListProps) {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const filteredAppointments = statusFilter === 'all'
    ? appointments
    : appointments.filter((a) => a.status === statusFilter);

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

  // Count by status
  const counts = {
    all: appointments.length,
    pending: appointments.filter((a) => a.status === 'pending').length,
    confirmed: appointments.filter((a) => a.status === 'confirmed').length,
    cancelled: appointments.filter((a) => a.status === 'cancelled').length,
  };

  return (
    <div className="bg-background rounded-xl border border-border overflow-hidden">
      {/* Filter bar */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2 flex-wrap">
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

      {/* Table */}
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
                  {/* Client info */}
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-foreground">
                        {appointment.client_name}
                      </p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {appointment.client_email}
                        </span>
                      </div>
                      <span className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Phone className="h-3 w-3" />
                        {appointment.client_phone}
                      </span>
                    </div>
                  </td>

                  {/* Date & Time */}
                  <td className="px-6 py-4">
                    <p className="font-medium text-foreground">
                      {format(parseISO(appointment.date), 'dd/MM/yyyy')}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {appointment.start_time.slice(0, 5)} - {appointment.end_time.slice(0, 5)}
                    </p>
                  </td>

                  {/* Event type */}
                  <td className="px-6 py-4">
                    <p className="text-foreground">
                      {getEventTypeLabel(appointment.event_type)}
                    </p>
                  </td>

                  {/* Status */}
                  <td className="px-6 py-4">
                    {getStatusBadge(appointment.status)}
                  </td>

                  {/* Actions */}
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
            Aucun rendez-vous {statusFilter !== 'all' ? 'dans cette catégorie' : ''}.
          </p>
        </div>
      )}
    </div>
  );
}
