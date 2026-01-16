import Link from 'next/link';
import { Plus, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getQuotes, getQuoteStats } from '@/lib/actions/quotes.actions';
import { QuotesList } from '@/components/admin/quotes-list';

export default async function DevisPage() {
  const [quotes, stats] = await Promise.all([getQuotes(), getQuoteStats()]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif font-medium text-foreground">
            Devis
          </h1>
          <p className="text-muted-foreground mt-1">
            {stats.total} devis • {stats.accepted + stats.paid} confirmé{(stats.accepted + stats.paid) > 1 ? 's' : ''}
          </p>
        </div>
        <Link href="/admin/devis/nouveau">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Nouveau devis
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-background rounded-xl border border-border p-4">
          <p className="text-sm text-muted-foreground">Brouillons</p>
          <p className="text-2xl font-semibold mt-1">{stats.draft}</p>
        </div>
        <div className="bg-background rounded-xl border border-border p-4">
          <p className="text-sm text-muted-foreground">Envoyés</p>
          <p className="text-2xl font-semibold mt-1">{stats.sent}</p>
        </div>
        <div className="bg-background rounded-xl border border-border p-4">
          <p className="text-sm text-muted-foreground">Acceptés</p>
          <p className="text-2xl font-semibold mt-1 text-blue-600">{stats.accepted}</p>
        </div>
        <div className="bg-background rounded-xl border border-border p-4">
          <p className="text-sm text-muted-foreground">Payés</p>
          <p className="text-2xl font-semibold mt-1 text-green-600">{stats.paid}</p>
        </div>
        <div className="bg-background rounded-xl border border-border p-4">
          <p className="text-sm text-muted-foreground">CA confirmé</p>
          <p className="text-2xl font-semibold mt-1">
            {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(stats.totalRevenue)}
          </p>
        </div>
      </div>

      {/* Liste des devis */}
      {quotes.length === 0 ? (
        <div className="bg-background rounded-xl border border-border p-12 text-center">
          <div className="w-12 h-12 mx-auto bg-secondary rounded-full flex items-center justify-center">
            <FileText className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-lg font-medium">Aucun devis</h3>
          <p className="text-muted-foreground mt-1">
            Créez votre premier devis pour commencer.
          </p>
          <Link href="/admin/devis/nouveau">
            <Button className="mt-4 gap-2">
              <Plus className="h-4 w-4" />
              Créer un devis
            </Button>
          </Link>
        </div>
      ) : (
        <QuotesList quotes={quotes} />
      )}
    </div>
  );
}
