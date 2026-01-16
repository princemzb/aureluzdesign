import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { QuotesService } from '@/lib/services/quotes.service';
import { InvoicesService } from '@/lib/services/invoices.service';
import { Check } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface PageProps {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ session_id?: string }>; // Used by Stripe callback
}

export const metadata: Metadata = {
  title: 'Paiement confirmé - AureLuz Design',
  description: 'Votre paiement a été confirmé avec succès.',
  robots: 'noindex, nofollow',
};

export default async function PaymentSuccessPage({ params, searchParams }: PageProps) {
  const { token } = await params;
  const { session_id: _sessionId } = await searchParams; // eslint-disable-line @typescript-eslint/no-unused-vars

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(token)) {
    notFound();
  }

  const quote = await QuotesService.getByToken(token);

  if (!quote) {
    notFound();
  }

  // Try to get the invoice
  const invoice = await InvoicesService.getByQuoteId(quote.id);

  const paidDate = quote.paid_at
    ? format(new Date(quote.paid_at), 'dd MMMM yyyy à HH:mm', { locale: fr })
    : null;

  return (
    <div className="min-h-screen bg-background">
      <div className="section-padding">
        <div className="container-main">
          <div className="max-w-2xl mx-auto text-center">
            {/* Success Icon */}
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-8">
              <Check className="w-10 h-10 text-green-600" />
            </div>

            {/* Header */}
            <h1 className="text-3xl font-display font-semibold text-foreground mb-4">
              Paiement confirmé !
            </h1>
            <p className="text-lg text-foreground/70 mb-12">
              Merci pour votre confiance. Votre réservation est maintenant confirmée.
            </p>

            {/* Summary Card */}
            <div className="bg-white rounded-2xl shadow-lg p-8 mb-8 text-left">
              <h2 className="text-lg font-semibold text-foreground mb-6">
                Récapitulatif
              </h2>

              <div className="space-y-4">
                <div className="flex justify-between py-3 border-b border-gray-100">
                  <span className="text-muted-foreground">Devis</span>
                  <span className="font-medium">{quote.quote_number}</span>
                </div>

                {invoice && (
                  <div className="flex justify-between py-3 border-b border-gray-100">
                    <span className="text-muted-foreground">Facture</span>
                    <span className="font-medium">{invoice.invoice_number}</span>
                  </div>
                )}

                <div className="flex justify-between py-3 border-b border-gray-100">
                  <span className="text-muted-foreground">Client</span>
                  <span className="font-medium">{quote.client_name}</span>
                </div>

                {quote.event_type && (
                  <div className="flex justify-between py-3 border-b border-gray-100">
                    <span className="text-muted-foreground">Type d&apos;événement</span>
                    <span className="font-medium">{quote.event_type}</span>
                  </div>
                )}

                {quote.event_date && (
                  <div className="flex justify-between py-3 border-b border-gray-100">
                    <span className="text-muted-foreground">Date de l&apos;événement</span>
                    <span className="font-medium">
                      {format(new Date(quote.event_date), 'dd MMMM yyyy', { locale: fr })}
                    </span>
                  </div>
                )}

                {paidDate && (
                  <div className="flex justify-between py-3 border-b border-gray-100">
                    <span className="text-muted-foreground">Date du paiement</span>
                    <span className="font-medium">{paidDate}</span>
                  </div>
                )}

                <div className="flex justify-between py-4 bg-primary/5 rounded-lg px-4 -mx-4">
                  <span className="font-semibold text-foreground">Montant payé</span>
                  <span className="font-bold text-xl text-primary">
                    {(quote.paid_amount || quote.deposit_amount || 0).toFixed(2)} EUR
                  </span>
                </div>
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 rounded-xl p-6 mb-8 text-left">
              <h3 className="font-semibold text-blue-900 mb-2">
                Prochaines étapes
              </h3>
              <ul className="text-blue-800 text-sm space-y-2">
                <li>
                  Vous allez recevoir un email de confirmation avec votre facture.
                </li>
                <li>
                  Notre équipe vous contactera prochainement pour organiser les détails de votre événement.
                </li>
                <li>
                  Le solde sera à régler selon les conditions indiquées sur votre devis.
                </li>
              </ul>
            </div>

            {/* Back to Home */}
            <Link
              href="/"
              className="inline-flex items-center justify-center px-8 py-3 bg-secondary text-white rounded-full font-medium hover:bg-secondary/90 transition-colors"
            >
              Retour à l&apos;accueil
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
