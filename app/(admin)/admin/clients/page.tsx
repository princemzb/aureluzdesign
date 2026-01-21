import Link from 'next/link';
import { Plus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getClients } from '@/lib/actions/clients.actions';
import { ClientsList } from '@/components/admin/clients-list';

interface ClientsPageProps {
  searchParams: Promise<{ page?: string; search?: string }>;
}

export default async function ClientsPage({ searchParams }: ClientsPageProps) {
  const params = await searchParams;
  const page = params.page ? parseInt(params.page, 10) : 1;
  const search = params.search || '';

  const { clients, total, totalPages } = await getClients({
    page,
    pageSize: 10,
    search,
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-serif font-medium text-foreground">
              Clients
            </h1>
            <p className="text-muted-foreground mt-1">
              {total} client{total > 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <Link href="/admin/clients/nouveau">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Nouveau client
          </Button>
        </Link>
      </div>

      {/* Liste des clients */}
      {clients.length === 0 && !search ? (
        <div className="bg-background rounded-xl border border-border p-12 text-center">
          <div className="w-12 h-12 mx-auto bg-secondary rounded-full flex items-center justify-center">
            <Users className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-lg font-medium">Aucun client</h3>
          <p className="text-muted-foreground mt-1">
            Ajoutez votre premier client pour commencer.
          </p>
          <Link href="/admin/clients/nouveau">
            <Button className="mt-4 gap-2">
              <Plus className="h-4 w-4" />
              Ajouter un client
            </Button>
          </Link>
        </div>
      ) : (
        <ClientsList
          clients={clients}
          currentPage={page}
          totalPages={totalPages}
          total={total}
          search={search}
        />
      )}
    </div>
  );
}
