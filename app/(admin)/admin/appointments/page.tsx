import { getAppointments, updateAppointmentStatus } from '@/lib/actions/admin.actions';
import { getTasks } from '@/lib/actions/tasks.actions';
import { AppointmentsManager } from '@/components/admin/appointments-manager';
import type { AppointmentStatus } from '@/lib/types';

export default async function AppointmentsPage() {
  const [appointments, tasksResult] = await Promise.all([
    getAppointments(),
    getTasks({ limit: 1000 }), // Récupérer toutes les tâches pour le calendrier
  ]);
  const tasks = tasksResult.tasks;

  async function handleUpdateStatus(id: string, status: AppointmentStatus) {
    'use server';
    await updateAppointmentStatus(id, status);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-serif font-medium text-foreground">
          Agenda
        </h1>
        <p className="text-muted-foreground mt-1">
          Visualisez tous vos rendez-vous et tâches sur le calendrier.
        </p>
      </div>

      {/* Appointments manager */}
      <AppointmentsManager
        appointments={appointments}
        tasks={tasks}
        onUpdateStatus={handleUpdateStatus}
      />
    </div>
  );
}
