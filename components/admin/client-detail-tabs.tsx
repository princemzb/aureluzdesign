'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  FileText,
  CheckSquare,
  Calendar,
  Receipt,
  Plus,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';
import { ClientTasksList } from './client-tasks-list';
import { ClientAgenda } from './client-agenda';
import type { Quote, Task, Appointment } from '@/lib/types';

interface ClientDetailTabsProps {
  clientId: string;
  quotes: Quote[];
  tasks: Task[];
  appointments: Appointment[];
}

type TabId = 'devis' | 'taches' | 'agenda' | 'factures';

const tabs: { id: TabId; label: string; icon: typeof FileText }[] = [
  { id: 'devis', label: 'Devis', icon: FileText },
  { id: 'taches', label: 'Tâches', icon: CheckSquare },
  { id: 'agenda', label: 'Agenda', icon: Calendar },
  { id: 'factures', label: 'Factures', icon: Receipt },
];

export function ClientDetailTabs({
  clientId,
  quotes,
  tasks,
  appointments,
}: ClientDetailTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>('devis');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
      sent: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      accepted: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      paid: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
      rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      expired: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    };
    const labels: Record<string, string> = {
      draft: 'Brouillon',
      sent: 'Envoyé',
      accepted: 'Accepté',
      paid: 'Payé',
      rejected: 'Refusé',
      expired: 'Expiré',
    };
    return (
      <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', styles[status])}>
        {labels[status] || status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Tabs navigation */}
      <div className="flex gap-2 border-b border-border overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const count =
            tab.id === 'devis'
              ? quotes.length
              : tab.id === 'taches'
              ? tasks.length
              : null;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap',
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
              {count !== null && count > 0 && (
                <span className="ml-1 bg-secondary px-1.5 py-0.5 rounded text-xs">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="bg-background rounded-xl border border-border">
        {/* DEVIS TAB */}
        {activeTab === 'devis' && (
          <div>
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h3 className="font-medium">Devis du client</h3>
              <Link href={`/admin/devis/nouveau?client=${clientId}`}>
                <Button size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Nouveau devis
                </Button>
              </Link>
            </div>
            {quotes.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                Aucun devis pour ce client
              </div>
            ) : (
              <div className="divide-y divide-border">
                {quotes.map((quote) => (
                  <Link
                    key={quote.id}
                    href={`/admin/devis/${quote.id}`}
                    className="flex items-center justify-between p-4 hover:bg-secondary/50 transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{quote.quote_number}</span>
                        {getStatusBadge(quote.status)}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {quote.event_type && `${quote.event_type} • `}
                        {formatDate(quote.event_date)}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-medium">{formatCurrency(quote.total)}</span>
                      <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TACHES TAB */}
        {activeTab === 'taches' && (
          <ClientTasksList clientId={clientId} tasks={tasks} />
        )}

        {/* AGENDA TAB */}
        {activeTab === 'agenda' && (
          <ClientAgenda clientId={clientId} tasks={tasks} appointments={appointments} />
        )}

        {/* FACTURES TAB */}
        {activeTab === 'factures' && (
          <div>
            <div className="p-4 border-b border-border">
              <h3 className="font-medium">Factures du client</h3>
            </div>
            <div className="p-8 text-center text-muted-foreground">
              Les factures apparaîtront ici après chaque paiement validé.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
