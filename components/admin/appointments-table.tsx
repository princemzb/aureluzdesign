'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, X, Mail, Phone, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';
import { format, parseISO } from '@/lib/utils/date';
import { APPOINTMENT_STATUSES, EVENT_TYPES } from '@/lib/utils/constants';
import type { Appointment, AppointmentStatus } from '@/lib/types';

interface AppointmentsTableProps {
  appointments: Appointment[];
  onUpdateStatus: (id: string, status: AppointmentStatus) => Promise<void>;
}

export function AppointmentsTable({
  appointments,
  onUpdateStatus,
}: AppointmentsTableProps) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleRowClick = (appointmentId: string) => {
    router.push(`/admin/appointments/${appointmentId}`);
  };

  const handleStatusChange = async (id: string, status: AppointmentStatus) => {
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

  if (appointments.length === 0) {
    return (
      <div className="bg-background rounded-xl border border-border p-12 text-center">
        <p className="text-muted-foreground">Aucun rendez-vous à afficher.</p>
      </div>
    );
  }

  return (
    <div className="bg-background rounded-xl border border-border overflow-hidden">
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
            {appointments.map((appointment) => (
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
                      <a
                        href={`mailto:${appointment.client_email}`}
                        className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1"
                      >
                        <Mail className="h-3 w-3" />
                        {appointment.client_email}
                      </a>
                    </div>
                    <a
                      href={`tel:${appointment.client_phone}`}
                      className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1 mt-0.5"
                    >
                      <Phone className="h-3 w-3" />
                      {appointment.client_phone}
                    </a>
                  </div>
                </td>

                {/* Date & Time */}
                <td className="px-6 py-4">
                  <p className="font-medium text-foreground">
                    {format(parseISO(appointment.date), 'dd/MM/yyyy')}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {appointment.start_time} - {appointment.end_time}
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
                          onClick={() =>
                            handleStatusChange(appointment.id, 'confirmed')
                          }
                          disabled={loadingId === appointment.id}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Accepter
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() =>
                            handleStatusChange(appointment.id, 'cancelled')
                          }
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
    </div>
  );
}
