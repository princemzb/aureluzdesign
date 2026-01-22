import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getClient } from '@/lib/actions/clients.actions';
import { TaskCreateForm } from './task-create-form';

interface TaskCreatePageProps {
  searchParams: Promise<{ client?: string }>;
}

export default async function TaskCreatePage({ searchParams }: TaskCreatePageProps) {
  const { client: clientId } = await searchParams;

  if (!clientId) {
    redirect('/admin/clients');
  }

  const client = await getClient(clientId);

  if (!client) {
    redirect('/admin/clients');
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/admin/clients/${clientId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-serif font-medium text-foreground">
            Nouvelle tâche
          </h1>
          <p className="text-muted-foreground mt-1">
            Pour {client.name}
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-2xl">
        <TaskCreateForm clientId={clientId} />
      </div>
    </div>
  );
}
