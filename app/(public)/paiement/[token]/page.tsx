import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { QuotePaymentsService } from '@/lib/services/quote-payments.service';
import { QuotesService } from '@/lib/services/quotes.service';
import { PaymentClient } from './payment-client';

interface PageProps {
  params: Promise<{ token: string }>;
}

export const metadata: Metadata = {
  title: 'Paiement - AureLuz Design',
  description: 'Procédez au paiement de votre échéance.',
  robots: 'noindex, nofollow',
};

export default async function PaymentPage({ params }: PageProps) {
  const { token } = await params;

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(token)) {
    notFound();
  }

  // Get payment by token
  const payment = await QuotePaymentsService.getByToken(token);
  if (!payment) {
    notFound();
  }

  // Check payment status
  if (payment.status === 'paid') {
    // Already paid - show success
  } else if (payment.status !== 'sent') {
    // Not in a payable state
    notFound();
  }

  // Get quote info
  const quote = await QuotesService.getById(payment.quote_id);
  if (!quote) {
    notFound();
  }

  // Get all payments for progress display
  const allPayments = await QuotePaymentsService.getByQuoteId(payment.quote_id);
  const summary = await QuotePaymentsService.getSummary(payment.quote_id);

  const isPaid = payment.status === 'paid';

  return (
    <div className="min-h-screen bg-background">
      <div className="section-padding">
        <div className="container-main">
          <div className="max-w-2xl mx-auto">
            {/* Header */}
            <div className="text-center mb-12">
              <p className="text-sm uppercase tracking-[0.2em] text-primary font-medium mb-4">
                Devis {quote.quote_number}
              </p>
              <h1 className="section-title">
                {isPaid ? 'Paiement confirmé' : payment.label}
              </h1>
              {!isPaid && (
                <p className="section-subtitle mx-auto">
                  Procédez au paiement sécurisé par carte bancaire.
                </p>
              )}
            </div>

            <PaymentClient
              payment={payment}
              quote={quote}
              allPayments={allPayments}
              summary={summary}
              isPaid={isPaid}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
