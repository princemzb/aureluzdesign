import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getTaskWithClient } from '@/lib/actions/tasks.actions';
import { TaskEditForm } from './task-edit-form';

interface TaskEditPageProps {
  params: Promise<{ id: string }>;
}

export default async function TaskEditPage({ params }: TaskEditPageProps) {
  const { id } = await params;
  const task = await getTaskWithClient(id);

  if (!task) {
    notFound();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/admin/tasks/${id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-serif font-medium text-foreground">
            Modifier la tâche
          </h1>
          <p className="text-muted-foreground mt-1">
            {task.name}
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-2xl">
        <TaskEditForm task={task} />
      </div>
    </div>
  );
}
