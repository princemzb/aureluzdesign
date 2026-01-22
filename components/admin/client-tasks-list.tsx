'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Plus,
  Flame,
  ArrowUp,
  Minus,
  ArrowDown,
  Clock,
  PlayCircle,
  CheckCircle2,
  XCircle,
  Trash2,
  Edit,
  MapPin,
  Paperclip,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';
import { updateTaskStatus, deleteTask } from '@/lib/actions/tasks.actions';
import type { Task, TaskStatus, TaskPriority } from '@/lib/types';

interface ClientTasksListProps {
  clientId: string;
  tasks: Task[];
}

const priorityConfig: Record<TaskPriority, { icon: typeof Flame; label: string; class: string }> = {
  urgent: {
    icon: Flame,
    label: 'Urgent',
    class: 'text-red-500',
  },
  high: {
    icon: ArrowUp,
    label: 'Haute',
    class: 'text-orange-500',
  },
  normal: {
    icon: Minus,
    label: 'Normale',
    class: 'text-gray-500',
  },
  low: {
    icon: ArrowDown,
    label: 'Basse',
    class: 'text-blue-500',
  },
};

const statusConfig: Record<TaskStatus, { icon: typeof Clock; label: string; class: string; buttonClass: string }> = {
  pending: {
    icon: Clock,
    label: 'En attente',
    class: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    buttonClass: 'hover:bg-gray-100 text-gray-600',
  },
  in_progress: {
    icon: PlayCircle,
    label: 'En cours',
    class: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    buttonClass: 'hover:bg-blue-100 text-blue-600',
  },
  completed: {
    icon: CheckCircle2,
    label: 'Terminé',
    class: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    buttonClass: 'hover:bg-green-100 text-green-600',
  },
  cancelled: {
    icon: XCircle,
    label: 'Annulé',
    class: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    buttonClass: 'hover:bg-red-100 text-red-600',
  },
};

export function ClientTasksList({ clientId, tasks }: ClientTasksListProps) {
  const router = useRouter();
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const formatDate = (date: string | null) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const isOverdue = (task: Task) => {
    if (!task.due_date || task.status === 'completed' || task.status === 'cancelled') {
      return false;
    }
    return new Date(task.due_date) < new Date();
  };

  const handleStatusChange = async (e: React.MouseEvent, taskId: string, newStatus: TaskStatus) => {
    e.preventDefault();
    e.stopPropagation();
    setIsUpdating(taskId);
    try {
      await updateTaskStatus(taskId, newStatus);
      router.refresh();
    } finally {
      setIsUpdating(null);
    }
  };

  const handleDelete = async (e: React.MouseEvent, task: Task) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('Supprimer cette tâche ?')) return;
    setDeletingId(task.id);
    try {
      await deleteTask(task.id, clientId);
      router.refresh();
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h3 className="font-medium">Tâches</h3>
        <Link href={`/admin/tasks/nouveau?client=${clientId}`}>
          <Button size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            Nouvelle tâche
          </Button>
        </Link>
      </div>

      {tasks.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground">
          Aucune tâche pour ce client
        </div>
      ) : (
        <div className="divide-y divide-border">
          {tasks.map((task) => {
            const priority = priorityConfig[task.priority];
            const status = statusConfig[task.status];
            const PriorityIcon = priority.icon;
            const StatusIcon = status.icon;
            const overdue = isOverdue(task);
            const isLoading = isUpdating === task.id || deletingId === task.id;

            return (
              <Link
                key={task.id}
                href={`/admin/tasks/${task.id}`}
                className={cn(
                  'block p-4 transition-colors hover:bg-secondary/30',
                  isLoading && 'opacity-50 pointer-events-none',
                  task.status === 'completed' && 'opacity-60'
                )}
              >
                <div className="flex items-start gap-3">
                  {/* Priority indicator */}
                  <div className={cn('mt-1', priority.class)}>
                    <PriorityIcon className="h-4 w-4" />
                  </div>

                  {/* Task content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h4 className={cn(
                          'font-medium',
                          task.status === 'completed' && 'line-through'
                        )}>
                          {task.name}
                        </h4>
                        {task.description && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {task.description}
                          </p>
                        )}
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    </div>

                    {/* Meta info */}
                    <div className="flex flex-wrap items-center gap-3 mt-2 text-sm">
                      <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', status.class)}>
                        <StatusIcon className="h-3 w-3 inline mr-1" />
                        {status.label}
                      </span>

                      {task.due_date && (
                        <span className={cn(
                          'flex items-center gap-1',
                          overdue ? 'text-red-500' : 'text-muted-foreground'
                        )}>
                          <Clock className="h-3.5 w-3.5" />
                          {formatDate(task.due_date)}
                          {overdue && ' (en retard)'}
                        </span>
                      )}

                      {task.location && (
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5" />
                          {task.location}
                        </span>
                      )}

                      {task.attachments && task.attachments.length > 0 && (
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Paperclip className="h-3.5 w-3.5" />
                          {task.attachments.length} fichier{task.attachments.length > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-wrap items-center gap-1 mt-3">
                      {/* Status buttons */}
                      {task.status !== 'pending' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => handleStatusChange(e, task.id, 'pending')}
                          disabled={isLoading}
                          className={cn('h-7 px-2 text-xs', statusConfig.pending.buttonClass)}
                        >
                          <Clock className="h-3.5 w-3.5 mr-1" />
                          En attente
                        </Button>
                      )}
                      {task.status !== 'in_progress' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => handleStatusChange(e, task.id, 'in_progress')}
                          disabled={isLoading}
                          className={cn('h-7 px-2 text-xs', statusConfig.in_progress.buttonClass)}
                        >
                          <PlayCircle className="h-3.5 w-3.5 mr-1" />
                          En cours
                        </Button>
                      )}
                      {task.status !== 'completed' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => handleStatusChange(e, task.id, 'completed')}
                          disabled={isLoading}
                          className={cn('h-7 px-2 text-xs', statusConfig.completed.buttonClass)}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                          Terminé
                        </Button>
                      )}

                      {/* Edit & Delete */}
                      <div className="flex-1" />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          router.push(`/admin/tasks/${task.id}/modifier`);
                        }}
                        disabled={isLoading}
                        className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                      >
                        <Edit className="h-3.5 w-3.5 mr-1" />
                        Modifier
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => handleDelete(e, task)}
                        disabled={isLoading}
                        className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
                      >
                        {deletingId === task.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
