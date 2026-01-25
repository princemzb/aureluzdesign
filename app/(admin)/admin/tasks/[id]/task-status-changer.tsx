'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Clock, Play, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { updateTaskStatus } from '@/lib/actions/tasks.actions';
import { cn } from '@/lib/utils/cn';
import type { TaskStatus } from '@/lib/types';

interface TaskStatusChangerProps {
  taskId: string;
  currentStatus: TaskStatus;
}

const STATUS_CONFIG: Record<TaskStatus, { label: string; icon: typeof Check; color: string; activeRing: string }> = {
  pending: { label: 'En attente', icon: Clock, color: 'bg-gray-100 text-gray-700 border-gray-300', activeRing: 'ring-gray-300' },
  in_progress: { label: 'En cours', icon: Play, color: 'bg-amber-100 text-amber-800 border-amber-400 font-semibold', activeRing: 'ring-amber-400 ring-2' },
  completed: { label: 'Terminé', icon: Check, color: 'bg-green-100 text-green-700 border-green-300', activeRing: 'ring-green-300' },
  cancelled: { label: 'Annulé', icon: X, color: 'bg-red-100 text-red-700 border-red-300', activeRing: 'ring-red-300' },
};

const STATUS_ORDER: TaskStatus[] = ['pending', 'in_progress', 'completed', 'cancelled'];

export function TaskStatusChanger({ taskId, currentStatus }: TaskStatusChangerProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<TaskStatus>(currentStatus);

  const handleStatusChange = async (newStatus: TaskStatus) => {
    if (newStatus === currentStatus || isLoading) return;

    setIsLoading(true);
    setSelectedStatus(newStatus);

    try {
      const result = await updateTaskStatus(taskId, newStatus);
      if (result.success) {
        router.refresh();
      } else {
        setSelectedStatus(currentStatus);
      }
    } catch {
      setSelectedStatus(currentStatus);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {STATUS_ORDER.map((status) => {
        const config = STATUS_CONFIG[status];
        const Icon = config.icon;
        const isActive = selectedStatus === status;

        return (
          <Button
            key={status}
            variant="outline"
            size="sm"
            onClick={() => handleStatusChange(status)}
            disabled={isLoading}
            className={cn(
              'gap-2 transition-all',
              isActive && config.color,
              isActive && 'ring-offset-2',
              isActive && config.activeRing
            )}
          >
            {isLoading && selectedStatus === status ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Icon className="h-4 w-4" />
            )}
            {config.label}
          </Button>
        );
      })}
    </div>
  );
}
