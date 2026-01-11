import { notFound } from 'next/navigation';
import Link from 'next/link';
import { format, parseISO, addDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  ArrowLeft,
  Edit,
  Send,
  Download,
  CheckCircle,
  XCircle,
  FileText,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getQuote } from '@/lib/actions/quotes.actions';
import { QuotePreview } from '@/components/admin/quote-preview';
import { QuoteActions } from '@/components/admin/quote-actions';
import type { QuoteStatus } from '@/lib/types';

interface PageProps {
  params: Promise<{ id: string }>;
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
    icon: CheckCircle,
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

export default async function ViewDevisPage({ params }: PageProps) {
  const { id } = await params;
  const quote = await getQuote(id);

  if (!quote) {
    notFound();
  }

  const status = statusConfig[quote.status];
  const StatusIcon = status.icon;

  const createdDate = format(parseISO(quote.created_at), 'dd MMMM yyyy', {
    locale: fr,
  });
  const validUntil = format(
    addDays(parseISO(quote.created_at), quote.validity_days),
    'dd MMMM yyyy',
    { locale: fr }
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/devis">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-serif font-medium text-foreground">
                Devis {quote.quote_number}
              </h1>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${status.className}`}
              >
                <StatusIcon className="h-3.5 w-3.5" />
                {status.label}
              </span>
            </div>
            <p className="text-muted-foreground mt-1">
              Créé le {createdDate} • Valide jusqu&apos;au {validUntil}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/admin/devis/${id}/modifier`}>
            <Button variant="outline" className="gap-2">
              <Edit className="h-4 w-4" />
              Modifier
            </Button>
          </Link>
        </div>
      </div>

      {/* Actions */}
      <QuoteActions quote={quote} />

      {/* Preview */}
      <div className="bg-background rounded-xl border border-border p-4">
        <div className="border border-border rounded-lg overflow-hidden">
          <QuotePreview quote={quote} />
        </div>
      </div>
    </div>
  );
}
