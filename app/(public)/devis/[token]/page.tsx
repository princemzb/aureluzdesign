import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { QuotesService } from '@/lib/services/quotes.service';
import { QuoteValidationClient } from '@/components/quotes/quote-validation-client';

interface PageProps {
  params: Promise<{ token: string }>;
}

export const metadata: Metadata = {
  title: 'Valider votre devis - AureLuz Design',
  description: 'Consultez et validez votre devis personnalisé AureLuz Design.',
  robots: 'noindex, nofollow',
};

export default async function QuoteValidationPage({ params }: PageProps) {
  const { token } = await params;

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(token)) {
    notFound();
  }

  const quote = await QuotesService.getByToken(token);

  if (!quote) {
    notFound();
  }

  // Check if quote is in a valid state for viewing
  // 'sent' = waiting for acceptance, 'accepted' = waiting for payment, 'paid' = payment received
  const isValidStatus = quote.status === 'sent' || quote.status === 'accepted' || quote.status === 'paid';
  if (!isValidStatus) {
    // Quote was modified, cancelled, or rejected - link is no longer valid
    notFound();
  }

  // Check if quote is expired
  const isExpired = quote.expires_at ? new Date(quote.expires_at) < new Date() : false;

  // Check if quote is already paid
  const isPaid = !!quote.paid_at || quote.status === 'paid';

  return (
    <div className="min-h-screen bg-background">
      <div className="section-padding">
        <div className="container-main">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="text-center mb-12">
              <p className="text-sm uppercase tracking-[0.2em] text-primary font-medium mb-4">
                Devis {quote.quote_number}
              </p>
              <h1 className="section-title">
                {isPaid
                  ? 'Devis accepté'
                  : isExpired
                  ? 'Devis expiré'
                  : 'Validez votre devis'}
              </h1>
              {!isPaid && !isExpired && (
                <p className="section-subtitle mx-auto">
                  {quote.status === 'sent'
                    ? 'Consultez le détail de votre devis et confirmez votre accord.'
                    : 'Votre devis a été accepté. Procédez au paiement de l\'acompte pour confirmer votre commande.'}
                </p>
              )}
            </div>

            <QuoteValidationClient
              quote={quote}
              isExpired={isExpired}
              isPaid={isPaid}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
