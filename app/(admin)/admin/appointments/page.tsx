import { getAppointments, updateAppointmentStatus } from '@/lib/actions/admin.actions';
import { AppointmentsManager } from '@/components/admin/appointments-manager';
import type { AppointmentStatus } from '@/lib/types';

export default async function AppointmentsPage() {
  const appointments = await getAppointments();

  async function handleUpdateStatus(id: string, status: AppointmentStatus) {
    'use server';
    await updateAppointmentStatus(id, status);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-serif font-medium text-foreground">
          Gestion des rendez-vous
        </h1>
        <p className="text-muted-foreground mt-1">
          Recherchez, filtrez et gérez tous vos rendez-vous.
        </p>
      </div>

      {/* Appointments manager */}
      <AppointmentsManager
        appointments={appointments}
        onUpdateStatus={handleUpdateStatus}
      />
    </div>
  );
}
