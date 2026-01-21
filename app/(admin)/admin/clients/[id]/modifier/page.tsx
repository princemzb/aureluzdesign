import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, UserCog } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getClient } from '@/lib/actions/clients.actions';
import { ClientForm } from '@/components/admin/client-form';

interface ModifierClientPageProps {
  params: Promise<{ id: string }>;
}

export default async function ModifierClientPage({ params }: ModifierClientPageProps) {
  const { id } = await params;
  const client = await getClient(id);

  if (!client) {
    notFound();
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/admin/clients/${id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <UserCog className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-serif font-medium text-foreground">
              Modifier le client
            </h1>
            <p className="text-muted-foreground mt-1">
              {client.name}
            </p>
          </div>
        </div>
      </div>

      {/* Formulaire */}
      <div className="max-w-2xl">
        <ClientForm client={client} />
      </div>
    </div>
  );
}
