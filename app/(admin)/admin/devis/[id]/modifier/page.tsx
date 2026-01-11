import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getQuote } from '@/lib/actions/quotes.actions';
import { QuoteForm } from '@/components/admin/quote-form';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ModifierDevisPage({ params }: PageProps) {
  const { id } = await params;
  const quote = await getQuote(id);

  if (!quote) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/admin/devis/${id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-serif font-medium text-foreground">
            Modifier le devis {quote.quote_number}
          </h1>
          <p className="text-muted-foreground mt-1">
            Modifiez les informations du devis
          </p>
        </div>
      </div>

      <QuoteForm quote={quote} mode="edit" />
    </div>
  );
}
