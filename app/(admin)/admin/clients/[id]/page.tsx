import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, User, Edit, Mail, Phone, Building2, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getClient } from '@/lib/actions/clients.actions';
import { getClientTasks } from '@/lib/actions/tasks.actions';
import { getAppointmentsByClientEmail } from '@/lib/actions/admin.actions';
import { ClientDetailTabs } from '@/components/admin/client-detail-tabs';
import { QuotesService } from '@/lib/services/quotes.service';
import { ClientsService } from '@/lib/services/clients.service';

interface ClientDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ClientDetailPage({ params }: ClientDetailPageProps) {
  const { id } = await params;

  const [client, tasks, stats] = await Promise.all([
    getClient(id),
    getClientTasks(id),
    ClientsService.getClientStats(id),
  ]);

  if (!client) {
    notFound();
  }

  // Récupérer les devis et rendez-vous du client
  const [clientQuotes, appointments] = await Promise.all([
    QuotesService.getByClientId(id),
    getAppointmentsByClientEmail(client.email),
  ]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/clients">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <User className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-serif font-medium text-foreground">
                {client.name}
              </h1>
              {client.company && (
                <p className="text-muted-foreground flex items-center gap-1 mt-1">
                  <Building2 className="h-4 w-4" />
                  {client.company}
                </p>
              )}
            </div>
          </div>
        </div>
        <Link href={`/admin/clients/${id}/modifier`}>
          <Button variant="outline" className="gap-2">
            <Edit className="h-4 w-4" />
            Modifier
          </Button>
        </Link>
      </div>

      {/* Informations client */}
      <div className="bg-background rounded-xl border border-border p-6">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="flex items-center gap-3">
            <Mail className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <a
                href={`mailto:${client.email}`}
                className="text-foreground hover:text-primary transition-colors"
              >
                {client.email}
              </a>
            </div>
          </div>
          {client.phone && (
            <div className="flex items-center gap-3">
              <Phone className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Téléphone</p>
                <a
                  href={`tel:${client.phone}`}
                  className="text-foreground hover:text-primary transition-colors"
                >
                  {client.phone}
                </a>
              </div>
            </div>
          )}
          {client.address && (
            <div className="flex items-center gap-3">
              <MapPin className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Adresse</p>
                <p className="text-foreground">{client.address}</p>
              </div>
            </div>
          )}
        </div>
        {client.notes && (
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-sm text-muted-foreground mb-1">Notes</p>
            <p className="text-foreground whitespace-pre-wrap">{client.notes}</p>
          </div>
        )}
      </div>

      {/* Stats rapides */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-background rounded-xl border border-border p-4">
          <p className="text-sm text-muted-foreground">Devis</p>
          <p className="text-2xl font-semibold mt-1">{stats.quotes_count}</p>
        </div>
        <div className="bg-background rounded-xl border border-border p-4">
          <p className="text-sm text-muted-foreground">Tâches</p>
          <p className="text-2xl font-semibold mt-1">{stats.tasks_count}</p>
        </div>
        <div className="bg-background rounded-xl border border-border p-4">
          <p className="text-sm text-muted-foreground">En attente</p>
          <p className="text-2xl font-semibold mt-1 text-amber-600">{stats.pending_tasks}</p>
        </div>
        <div className="bg-background rounded-xl border border-border p-4">
          <p className="text-sm text-muted-foreground">CA total</p>
          <p className="text-2xl font-semibold mt-1 text-green-600">
            {new Intl.NumberFormat('fr-FR', {
              style: 'currency',
              currency: 'EUR',
            }).format(stats.total_amount)}
          </p>
        </div>
      </div>

      {/* Onglets */}
      <ClientDetailTabs
        clientId={id}
        quotes={clientQuotes}
        tasks={tasks}
        appointments={appointments}
      />
    </div>
  );
}
