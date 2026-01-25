import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Pencil,
  User,
  Flame,
  ArrowUp,
  Minus,
  ArrowDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getTaskWithClientAndDetails, updateTaskAutoComplete } from '@/lib/actions/tasks.actions';
import { format, parseISO, frLocale } from '@/lib/utils/date';
import { cn } from '@/lib/utils/cn';
import { TaskStatusChanger } from './task-status-changer';
import { TaskDetailsSection } from './task-details-section';
import { TaskSubtasksSection } from './task-subtasks-section';
import type { TaskPriority } from '@/lib/types';

interface TaskDetailPageProps {
  params: Promise<{ id: string }>;
}

const PRIORITY_CONFIG: Record<TaskPriority, { label: string; icon: typeof Flame; color: string }> = {
  urgent: { label: 'Urgent', icon: Flame, color: 'text-red-600 bg-red-50 border-red-200' },
  high: { label: 'Haute', icon: ArrowUp, color: 'text-orange-600 bg-orange-50 border-orange-200' },
  normal: { label: 'Normale', icon: Minus, color: 'text-blue-600 bg-blue-50 border-blue-200' },
  low: { label: 'Basse', icon: ArrowDown, color: 'text-gray-600 bg-gray-50 border-gray-200' },
};

export default async function TaskDetailPage({ params }: TaskDetailPageProps) {
  const { id } = await params;
  const task = await getTaskWithClientAndDetails(id);

  if (!task) {
    notFound();
  }

  const priorityConfig = PRIORITY_CONFIG[task.priority];
  const PriorityIcon = priorityConfig.icon;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/admin/clients/${task.client_id}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-serif font-medium text-foreground">
              {task.name}
            </h1>
            <Link
              href={`/admin/clients/${task.client_id}`}
              className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 mt-1"
            >
              <User className="h-4 w-4" />
              {task.client.name}
            </Link>
          </div>
        </div>
        <Link href={`/admin/tasks/${id}/modifier`}>
          <Button variant="outline" className="gap-2">
            <Pencil className="h-4 w-4" />
            Modifier
          </Button>
        </Link>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status & Priority */}
          <div className="bg-background rounded-xl border border-border p-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                {/* Priority badge */}
                <div className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-full border',
                  priorityConfig.color
                )}>
                  <PriorityIcon className="h-4 w-4" />
                  <span className="text-sm font-medium">Priorité {priorityConfig.label}</span>
                </div>
              </div>

              {/* Status changer */}
              <TaskStatusChanger taskId={task.id} currentStatus={task.status} />
            </div>
          </div>

          {/* Info cards */}
          <div className="grid sm:grid-cols-2 gap-4">
            {/* Date */}
            <div className="bg-background rounded-xl border border-border p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Date limite</p>
                  <p className="font-medium text-foreground">
                    {task.due_date
                      ? format(parseISO(task.due_date), 'EEEE d MMMM yyyy', { locale: frLocale })
                      : 'Non définie'}
                  </p>
                </div>
              </div>
            </div>

            {/* Time slot */}
            <div className="bg-background rounded-xl border border-border p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Clock className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Créneau horaire</p>
                  <p className="font-medium text-foreground">
                    {task.start_time && task.end_time
                      ? `${task.start_time.slice(0, 5)} - ${task.end_time.slice(0, 5)}`
                      : 'Non défini'}
                  </p>
                </div>
              </div>
            </div>

            {/* Location */}
            {task.location && (
              <div className="bg-background rounded-xl border border-border p-4 sm:col-span-2">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <MapPin className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Lieu</p>
                    <p className="font-medium text-foreground">{task.location}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          {task.description && (
            <div className="bg-background rounded-xl border border-border p-6">
              <h2 className="font-medium text-foreground mb-3">Description</h2>
              <p className="text-muted-foreground whitespace-pre-wrap">{task.description}</p>
            </div>
          )}

          {/* Subtasks section */}
          <TaskSubtasksSection
            taskId={task.id}
            initialSubtasks={task.subtasks}
            autoComplete={task.auto_complete}
            onAutoCompleteChange={async (value) => {
              'use server';
              await updateTaskAutoComplete(task.id, value);
            }}
          />

          {/* Details section */}
          <TaskDetailsSection taskId={task.id} initialDetails={task.details} />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Metadata */}
          <div className="bg-background rounded-xl border border-border p-6">
            <h2 className="font-medium text-foreground mb-4">Informations</h2>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Créée le</dt>
                <dd className="text-foreground">
                  {format(parseISO(task.created_at), 'dd/MM/yyyy HH:mm')}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Modifiée le</dt>
                <dd className="text-foreground">
                  {format(parseISO(task.updated_at), 'dd/MM/yyyy HH:mm')}
                </dd>
              </div>
              {task.completed_at && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Terminée le</dt>
                  <dd className="text-foreground">
                    {format(parseISO(task.completed_at), 'dd/MM/yyyy HH:mm')}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {/* Quick actions */}
          <div className="bg-background rounded-xl border border-border p-6">
            <h2 className="font-medium text-foreground mb-4">Actions rapides</h2>
            <div className="space-y-2">
              <Link href={`/admin/clients/${task.client_id}`} className="block">
                <Button variant="outline" className="w-full justify-start gap-2">
                  <User className="h-4 w-4" />
                  Voir le client
                </Button>
              </Link>
              <Link href={`/admin/tasks/${id}/modifier`} className="block">
                <Button variant="outline" className="w-full justify-start gap-2">
                  <Pencil className="h-4 w-4" />
                  Modifier la tâche
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
