'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Edit,
  Trash2,
  MoreHorizontal,
  Send,
  XCircle,
  Clock,
  FileText,
  CreditCard,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { deleteQuote, updateQuoteStatus } from '@/lib/actions/quotes.actions';
import type { Quote, QuoteStatus } from '@/lib/types';

interface QuotesListProps {
  quotes: Quote[];
}

const statusConfig: Record<
  QuoteStatus,
  { label: string; icon: React.ElementType; className: string }
> = {
  draft: {
    label: 'Brouillon',
    icon: FileText,
    className: 'bg-gray-100 text-gray-700',
  },
  sent: {
    label: 'Envoyé',
    icon: Send,
    className: 'bg-blue-100 text-blue-700',
  },
  accepted: {
    label: 'Accepté',
    icon: Check,
    className: 'bg-indigo-100 text-indigo-700',
  },
  paid: {
    label: 'Payé',
    icon: CreditCard,
    className: 'bg-green-100 text-green-700',
  },
  rejected: {
    label: 'Refusé',
    icon: XCircle,
    className: 'bg-red-100 text-red-700',
  },
  expired: {
    label: 'Expiré',
    icon: Clock,
    className: 'bg-orange-100 text-orange-700',
  },
};

export function QuotesList({ quotes }: QuotesListProps) {
  const router = useRouter();
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const handleRowClick = (id: string) => {
    router.push(`/admin/devis/${id}`);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce devis ?')) return;

    setIsDeleting(id);
    await deleteQuote(id);
    setIsDeleting(null);
    setOpenMenu(null);
  };

  const handleStatusChange = async (id: string, status: QuoteStatus) => {
    await updateQuoteStatus(id, status);
    setOpenMenu(null);
  };

  return (
    <div className="bg-background rounded-xl border border-border">
      <div className="overflow-x-auto overflow-y-visible">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-secondary/30">
              <th className="text-left p-4 font-medium text-muted-foreground">
                N° Devis
              </th>
              <th className="text-left p-4 font-medium text-muted-foreground">
                Client
              </th>
              <th className="text-left p-4 font-medium text-muted-foreground">
                Date
              </th>
              <th className="text-right p-4 font-medium text-muted-foreground">
                Total TTC
              </th>
              <th className="text-left p-4 font-medium text-muted-foreground">
                Statut
              </th>
              <th className="text-right p-4 font-medium text-muted-foreground">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {quotes.map((quote) => {
              const status = statusConfig[quote.status];
              const StatusIcon = status.icon;

              return (
                <tr
                  key={quote.id}
                  className="border-b border-border last:border-0 hover:bg-secondary/30 cursor-pointer transition-colors"
                  onClick={() => handleRowClick(quote.id)}
                >
                  <td className="p-4">
                    <span className="font-mono font-medium text-primary">
                      {quote.quote_number}
                    </span>
                  </td>
                  <td className="p-4">
                    <div>
                      <p className="font-medium">{quote.client_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {quote.client_email}
                      </p>
                    </div>
                  </td>
                  <td className="p-4 text-muted-foreground">
                    {format(parseISO(quote.created_at), 'dd MMM yyyy', {
                      locale: fr,
                    })}
                  </td>
                  <td className="p-4 text-right font-medium">
                    {new Intl.NumberFormat('fr-FR', {
                      style: 'currency',
                      currency: 'EUR',
                    }).format(quote.total)}
                  </td>
                  <td className="p-4">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${status.className}`}
                    >
                      <StatusIcon className="h-3.5 w-3.5" />
                      {status.label}
                    </span>
                  </td>
                  <td className="p-4" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/admin/devis/${quote.id}/modifier`}>
                        <Button variant="ghost" size="icon" title="Modifier">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </Link>
                      <div className="relative">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            setOpenMenu(openMenu === quote.id ? null : quote.id)
                          }
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                        {openMenu === quote.id && (
                          <>
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => setOpenMenu(null)}
                            />
                            <div className="absolute right-0 top-full mt-1 w-48 bg-background border border-border rounded-lg shadow-lg z-20 py-1">
                              {quote.status === 'draft' && (
                                <button
                                  className="w-full px-4 py-2 text-left text-sm hover:bg-secondary flex items-center gap-2"
                                  onClick={() =>
                                    handleStatusChange(quote.id, 'sent')
                                  }
                                >
                                  <Send className="h-4 w-4" />
                                  Marquer comme envoyé
                                </button>
                              )}
                              {quote.status === 'sent' && (
                                <>
                                  <button
                                    className="w-full px-4 py-2 text-left text-sm hover:bg-secondary flex items-center gap-2 text-indigo-600"
                                    onClick={() =>
                                      handleStatusChange(quote.id, 'accepted')
                                    }
                                  >
                                    <Check className="h-4 w-4" />
                                    Marquer comme accepté
                                  </button>
                                  <button
                                    className="w-full px-4 py-2 text-left text-sm hover:bg-secondary flex items-center gap-2 text-red-600"
                                    onClick={() =>
                                      handleStatusChange(quote.id, 'rejected')
                                    }
                                  >
                                    <XCircle className="h-4 w-4" />
                                    Marquer comme refusé
                                  </button>
                                </>
                              )}
                              {quote.status === 'accepted' && (
                                <button
                                  className="w-full px-4 py-2 text-left text-sm hover:bg-secondary flex items-center gap-2 text-green-600"
                                  onClick={() =>
                                    handleStatusChange(quote.id, 'paid')
                                  }
                                >
                                  <CreditCard className="h-4 w-4" />
                                  Marquer comme payé
                                </button>
                              )}
                              <button
                                className="w-full px-4 py-2 text-left text-sm hover:bg-secondary flex items-center gap-2 text-red-600"
                                onClick={() => handleDelete(quote.id)}
                                disabled={isDeleting === quote.id}
                              >
                                <Trash2 className="h-4 w-4" />
                                {isDeleting === quote.id
                                  ? 'Suppression...'
                                  : 'Supprimer'}
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
