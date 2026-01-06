'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, X, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { updateAppointmentStatus, deleteAppointment } from '@/lib/actions/admin.actions';
import type { AppointmentStatus } from '@/lib/types';

interface AppointmentActionsProps {
  appointmentId: string;
  currentStatus: AppointmentStatus;
}

export function AppointmentActions({ appointmentId, currentStatus }: AppointmentActionsProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState<string | null>(null);

  const handleStatusChange = async (status: AppointmentStatus) => {
    setIsLoading(status);
    try {
      const result = await updateAppointmentStatus(appointmentId, status);
      if (result.success) {
        router.refresh();
      } else {
        alert(result.error || 'Une erreur est survenue');
      }
    } finally {
      setIsLoading(null);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette demande ? Cette action est irréversible.')) {
      return;
    }

    setIsLoading('delete');
    try {
      const result = await deleteAppointment(appointmentId);
      if (result.success) {
        router.push('/admin/appointments');
      } else {
        alert(result.error || 'Une erreur est survenue');
      }
    } finally {
      setIsLoading(null);
    }
  };

  return (
    <div className="space-y-3">
      {currentStatus === 'pending' && (
        <>
          <Button
            className="w-full bg-green-600 hover:bg-green-700 text-white"
            onClick={() => handleStatusChange('confirmed')}
            disabled={isLoading !== null}
          >
            {isLoading === 'confirmed' ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Check className="h-4 w-4 mr-2" />
            )}
            Confirmer le RDV
          </Button>
          <Button
            variant="outline"
            className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={() => handleStatusChange('cancelled')}
            disabled={isLoading !== null}
          >
            {isLoading === 'cancelled' ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <X className="h-4 w-4 mr-2" />
            )}
            Refuser le RDV
          </Button>
        </>
      )}

      {currentStatus === 'confirmed' && (
        <Button
          variant="outline"
          className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
          onClick={() => handleStatusChange('cancelled')}
          disabled={isLoading !== null}
        >
          {isLoading === 'cancelled' ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <X className="h-4 w-4 mr-2" />
          )}
          Annuler le RDV
        </Button>
      )}

      {currentStatus === 'cancelled' && (
        <Button
          variant="outline"
          className="w-full"
          onClick={() => handleStatusChange('pending')}
          disabled={isLoading !== null}
        >
          {isLoading === 'pending' ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : null}
          Remettre en attente
        </Button>
      )}

      <hr className="my-4" />

      <Button
        variant="ghost"
        className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
        onClick={handleDelete}
        disabled={isLoading !== null}
      >
        {isLoading === 'delete' ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <Trash2 className="h-4 w-4 mr-2" />
        )}
        Supprimer la demande
      </Button>
    </div>
  );
}
