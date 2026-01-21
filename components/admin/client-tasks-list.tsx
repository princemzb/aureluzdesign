'use client';

import { useState } from 'react';
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
  MoreVertical,
  Trash2,
  Edit,
  MapPin,
  Paperclip,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils/cn';
import { updateTaskStatus, deleteTask } from '@/lib/actions/tasks.actions';
import { TaskFormModal } from './task-form-modal';
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

const statusConfig: Record<TaskStatus, { icon: typeof Clock; label: string; class: string }> = {
  pending: {
    icon: Clock,
    label: 'En attente',
    class: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  },
  in_progress: {
    icon: PlayCircle,
    label: 'En cours',
    class: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  },
  completed: {
    icon: CheckCircle2,
    label: 'Terminé',
    class: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  },
  cancelled: {
    icon: XCircle,
    label: 'Annulé',
    class: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  },
};

export function ClientTasksList({ clientId, tasks }: ClientTasksListProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

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

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    setIsUpdating(taskId);
    try {
      await updateTaskStatus(taskId, newStatus);
    } finally {
      setIsUpdating(null);
    }
  };

  const handleDelete = async (task: Task) => {
    if (!confirm('Supprimer cette tâche ?')) return;
    setIsUpdating(task.id);
    try {
      await deleteTask(task.id, clientId);
    } finally {
      setIsUpdating(null);
    }
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingTask(null);
  };

  return (
    <>
      <div>
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h3 className="font-medium">Tâches</h3>
          <Button size="sm" className="gap-2" onClick={() => setIsModalOpen(true)}>
            <Plus className="h-4 w-4" />
            Nouvelle tâche
          </Button>
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

              return (
                <div
                  key={task.id}
                  className={cn(
                    'p-4 transition-colors',
                    isUpdating === task.id && 'opacity-50',
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
                        <div>
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
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(task)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Modifier
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {task.status !== 'pending' && (
                              <DropdownMenuItem
                                onClick={() => handleStatusChange(task.id, 'pending')}
                              >
                                <Clock className="h-4 w-4 mr-2" />
                                Marquer en attente
                              </DropdownMenuItem>
                            )}
                            {task.status !== 'in_progress' && (
                              <DropdownMenuItem
                                onClick={() => handleStatusChange(task.id, 'in_progress')}
                              >
                                <PlayCircle className="h-4 w-4 mr-2" />
                                Marquer en cours
                              </DropdownMenuItem>
                            )}
                            {task.status !== 'completed' && (
                              <DropdownMenuItem
                                onClick={() => handleStatusChange(task.id, 'completed')}
                              >
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                Marquer terminé
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDelete(task)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Supprimer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
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
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <TaskFormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        clientId={clientId}
        task={editingTask}
      />
    </>
  );
}
