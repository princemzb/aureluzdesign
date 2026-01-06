'use client';

import { useState } from 'react';
import { Check, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { updateAppointmentStatus } from '@/lib/actions/admin.actions';

interface PendingAppointmentActionsProps {
  appointmentId: string;
}

export function PendingAppointmentActions({ appointmentId }: PendingAppointmentActionsProps) {
  const [isLoading, setIsLoading] = useState<'confirmed' | 'cancelled' | null>(null);

  const handleAction = async (e: React.MouseEvent, status: 'confirmed' | 'cancelled') => {
    e.preventDefault();
    e.stopPropagation();

    setIsLoading(status);
    try {
      await updateAppointmentStatus(appointmentId, status);
    } finally {
      setIsLoading(null);
    }
  };

  return (
    <div className="flex items-center gap-1">
      <Button
        size="sm"
        variant="ghost"
        className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
        onClick={(e) => handleAction(e, 'confirmed')}
        disabled={isLoading !== null}
        title="Accepter"
      >
        {isLoading === 'confirmed' ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Check className="h-4 w-4" />
        )}
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
        onClick={(e) => handleAction(e, 'cancelled')}
        disabled={isLoading !== null}
        title="Refuser"
      >
        {isLoading === 'cancelled' ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <X className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}
