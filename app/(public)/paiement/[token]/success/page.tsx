import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Check } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { QuotePaymentsService } from '@/lib/services/quote-payments.service';
import { QuotesService } from '@/lib/services/quotes.service';

interface PageProps {
  params: Promise<{ token: string }>;
}

export const metadata: Metadata = {
  title: 'Paiement confirmé - AureLuz Design',
  description: 'Votre paiement a été confirmé avec succès.',
  robots: 'noindex, nofollow',
};

export default async function PaymentSuccessPage({ params }: PageProps) {
  const { token } = await params;

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(token)) {
    notFound();
  }

  const payment = await QuotePaymentsService.getByToken(token);
  if (!payment) {
    notFound();
  }

  const quote = await QuotesService.getById(payment.quote_id);
  if (!quote) {
    notFound();
  }

  const summary = await QuotePaymentsService.getSummary(payment.quote_id);
  const isFullyPaid = summary?.payment_status === 'fully_paid';

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
              {isFullyPaid ? 'Paiement complet reçu !' : 'Paiement confirmé !'}
            </h1>
            <p className="text-lg text-muted-foreground mb-12">
              {isFullyPaid
                ? 'Tous les paiements ont été reçus. Merci pour votre confiance !'
                : 'Merci pour votre paiement. Nous vous contacterons pour la suite.'}
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

                <div className="flex justify-between py-3 border-b border-gray-100">
                  <span className="text-muted-foreground">Client</span>
                  <span className="font-medium">{quote.client_name}</span>
                </div>

                <div className="flex justify-between py-3 border-b border-gray-100">
                  <span className="text-muted-foreground">Paiement</span>
                  <span className="font-medium">{payment.label}</span>
                </div>

                {payment.paid_at && (
                  <div className="flex justify-between py-3 border-b border-gray-100">
                    <span className="text-muted-foreground">Date du paiement</span>
                    <span className="font-medium">
                      {format(new Date(payment.paid_at), 'dd MMMM yyyy à HH:mm', { locale: fr })}
                    </span>
                  </div>
                )}

                <div className="flex justify-between py-4 bg-primary/5 rounded-lg px-4 -mx-4">
                  <span className="font-semibold text-foreground">Montant payé</span>
                  <span className="font-bold text-xl text-primary">
                    {payment.amount.toFixed(2)} EUR
                  </span>
                </div>
              </div>

              {/* Progress */}
              {summary && (
                <div className="mt-6 pt-6 border-t border-gray-100">
                  <div className="flex justify-between text-sm text-muted-foreground mb-2">
                    <span>Progression des paiements</span>
                    <span>{summary.paid_payments}/{summary.total_payments}</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${(summary.total_paid / summary.total) * 100}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-sm mt-2">
                    <span className="text-green-600">{summary.total_paid.toFixed(2)} EUR payés</span>
                    {summary.remaining_amount > 0 && (
                      <span className="text-muted-foreground">
                        {summary.remaining_amount.toFixed(2)} EUR restants
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 rounded-xl p-6 mb-8 text-left">
              <h3 className="font-semibold text-blue-900 mb-2">
                {isFullyPaid ? 'Et maintenant ?' : 'Prochaines étapes'}
              </h3>
              <ul className="text-blue-800 text-sm space-y-2">
                <li>
                  Vous allez recevoir un email de confirmation avec votre facture.
                </li>
                {isFullyPaid ? (
                  <li>
                    Notre équipe va vous contacter pour finaliser les détails de votre événement.
                  </li>
                ) : (
                  <li>
                    Nous vous contacterons pour le prochain paiement selon l&apos;échéancier convenu.
                  </li>
                )}
              </ul>
            </div>

            {/* Back to Home */}
            <Link
              href="/"
              className="inline-flex items-center justify-center px-8 py-3 bg-green-600 text-white rounded-full font-medium hover:bg-green-700 transition-colors"
            >
              Retour à l&apos;accueil
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
