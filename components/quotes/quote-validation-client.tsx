'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  FileText,
  Calendar,
  User,
  Mail,
  Phone,
  CreditCard,
  AlertCircle,
  CheckCircle,
  Loader2,
  Check,
} from 'lucide-react';
import type { Quote } from '@/lib/types';
import { createQuoteCheckoutSession, acceptQuote } from '@/lib/actions/quotes.actions';

interface QuoteValidationClientProps {
  quote: Quote;
  isExpired: boolean;
  isPaid: boolean;
}

export function QuoteValidationClient({
  quote,
  isExpired,
  isPaid,
}: QuoteValidationClientProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentQuote, setCurrentQuote] = useState(quote);

  const isAccepted = currentQuote.status === 'accepted';
  const isSent = currentQuote.status === 'sent';

  const depositAmount =
    currentQuote.deposit_amount ||
    Math.round(currentQuote.total * (currentQuote.deposit_percent || 30)) / 100;

  const handleAccept = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await acceptQuote(currentQuote.id);

      if (!result.success || !result.quote) {
        throw new Error(result.error || 'Erreur lors de l\'acceptation du devis');
      }

      // Update local state to show payment button
      setCurrentQuote(result.quote);
      setIsLoading(false);
    } catch (err) {
      console.error('Accept error:', err);
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
      setIsLoading(false);
    }
  };

  const handlePayment = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const baseUrl = window.location.origin;
      const result = await createQuoteCheckoutSession(currentQuote.id, baseUrl);

      if (!result.success || !result.url) {
        throw new Error(result.error || 'Erreur lors de la création de la session de paiement');
      }

      // Redirect to Stripe Checkout
      window.location.href = result.url;
    } catch (err) {
      console.error('Payment error:', err);
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
      setIsLoading(false);
    }
  };

  // Status banner
  const StatusBanner = () => {
    if (isPaid) {
      return (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-8 flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold text-green-800">Devis accepté et payé</p>
            <p className="text-sm text-green-700">
              Ce devis a été validé le{' '}
              {currentQuote.paid_at
                ? format(new Date(currentQuote.paid_at), 'dd MMMM yyyy', { locale: fr })
                : 'récemment'}
              . Merci pour votre confiance !
            </p>
          </div>
        </div>
      );
    }

    if (isAccepted) {
      return (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-8 flex items-start gap-3">
          <Check className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold text-blue-800">Devis accepté</p>
            <p className="text-sm text-blue-700">
              Vous avez accepté ce devis
              {currentQuote.accepted_at &&
                ` le ${format(new Date(currentQuote.accepted_at), 'dd MMMM yyyy', { locale: fr })}`}
              . Vous pouvez maintenant procéder au paiement de l&apos;acompte.
            </p>
          </div>
        </div>
      );
    }

    if (isExpired) {
      return (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-8 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold text-amber-800">Devis expiré</p>
            <p className="text-sm text-amber-700">
              Ce devis a expiré le{' '}
              {currentQuote.expires_at
                ? format(new Date(currentQuote.expires_at), 'dd MMMM yyyy', { locale: fr })
                : 'récemment'}
              . Veuillez nous contacter pour obtenir un nouveau devis.
            </p>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="grid lg:grid-cols-3 gap-8">
      {/* Main Content - Quote Details */}
      <div className="lg:col-span-2 space-y-6">
        <StatusBanner />

        {/* Quote Info Card */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">{currentQuote.quote_number}</h2>
              <p className="text-sm text-muted-foreground">
                Créé le{' '}
                {format(new Date(currentQuote.created_at), 'dd MMMM yyyy', { locale: fr })}
              </p>
            </div>
          </div>

          {/* Client Info */}
          <div className="grid sm:grid-cols-2 gap-4 pb-6 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <User className="w-4 h-4 text-muted-foreground" />
              <span className="text-foreground">{currentQuote.client_name}</span>
            </div>
            <div className="flex items-center gap-3">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <span className="text-foreground">{currentQuote.client_email}</span>
            </div>
            {currentQuote.client_phone && (
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <span className="text-foreground">{currentQuote.client_phone}</span>
              </div>
            )}
            {currentQuote.event_date && (
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-foreground">
                  {format(new Date(currentQuote.event_date), 'dd MMMM yyyy', { locale: fr })}
                </span>
              </div>
            )}
          </div>

          {/* Items */}
          <div className="py-6">
            <h3 className="font-semibold text-foreground mb-4">Détail des prestations</h3>
            <div className="space-y-3">
              {currentQuote.items.map((item) => (
                <div
                  key={item.id}
                  className="flex justify-between items-start py-3 border-b border-gray-50 last:border-0"
                >
                  <div className="flex-1">
                    <p className="text-foreground font-medium">{item.description}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.quantity} x {item.unit_price.toFixed(2)} EUR
                    </p>
                  </div>
                  <p className="font-semibold text-foreground">
                    {item.total.toFixed(2)} EUR
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="pt-4 border-t border-gray-200 space-y-2">
            <div className="flex justify-between text-muted-foreground">
              <span>Sous-total HT</span>
              <span>{currentQuote.subtotal.toFixed(2)} EUR</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>TVA ({currentQuote.vat_rate}%)</span>
              <span>{currentQuote.vat_amount.toFixed(2)} EUR</span>
            </div>
            <div className="flex justify-between text-lg font-bold text-foreground pt-2">
              <span>Total TTC</span>
              <span>{currentQuote.total.toFixed(2)} EUR</span>
            </div>
          </div>

          {/* Notes */}
          {currentQuote.notes && (
            <div className="mt-6 pt-6 border-t border-gray-100">
              <h3 className="font-semibold text-foreground mb-2">Conditions</h3>
              <p className="text-muted-foreground text-sm whitespace-pre-wrap">
                {currentQuote.notes}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Sidebar - Action */}
      <div className="lg:col-span-1">
        <div className="bg-white rounded-2xl shadow-lg p-6 sticky top-8">
          <h3 className="font-semibold text-foreground mb-4">
            {isPaid ? 'Paiement effectué' : isAccepted ? 'Payer l\'acompte' : 'Accepter ce devis'}
          </h3>

          {/* Step 1: Accept quote (status = sent) */}
          {isSent && !isExpired && (
            <>
              <div className="bg-primary/5 rounded-xl p-4 mb-6">
                <p className="text-sm text-muted-foreground mb-1">Montant total TTC</p>
                <p className="text-3xl font-bold text-primary">
                  {currentQuote.total.toFixed(2)} EUR
                </p>
                {currentQuote.payment_schedule && currentQuote.payment_schedule.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-primary/10">
                    <p className="text-xs text-muted-foreground mb-2">Échéancier de paiement :</p>
                    {currentQuote.payment_schedule.map((payment, index) => (
                      <div key={index} className="flex justify-between text-xs text-muted-foreground">
                        <span>{payment.label} ({payment.percentage}%)</span>
                        <span>{((currentQuote.total * payment.percentage) / 100).toFixed(2)} EUR</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <button
                onClick={handleAccept}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white font-semibold py-4 px-6 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Acceptation...
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    Accepter le devis
                  </>
                )}
              </button>

              <p className="text-xs text-muted-foreground text-center mt-4">
                En acceptant, vous serez invité à régler l&apos;acompte
              </p>
            </>
          )}

          {/* Step 2: Pay deposit (status = accepted) */}
          {isAccepted && !isPaid && !isExpired && (
            <>
              <div className="bg-primary/5 rounded-xl p-4 mb-6">
                <p className="text-sm text-muted-foreground mb-1">
                  Acompte à régler ({currentQuote.deposit_percent}%)
                </p>
                <p className="text-3xl font-bold text-primary">
                  {depositAmount.toFixed(2)} EUR
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  sur un total de {currentQuote.total.toFixed(2)} EUR
                </p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <button
                onClick={handlePayment}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white font-semibold py-4 px-6 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Redirection...
                  </>
                ) : (
                  <>
                    <CreditCard className="w-5 h-5" />
                    Payer l&apos;acompte
                  </>
                )}
              </button>

              <p className="text-xs text-muted-foreground text-center mt-4">
                Paiement sécurisé par Stripe
              </p>
            </>
          )}

          {isPaid && (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <p className="text-muted-foreground mb-2">Montant payé</p>
              <p className="text-2xl font-bold text-green-600">
                {(currentQuote.paid_amount || depositAmount).toFixed(2)} EUR
              </p>
              {currentQuote.paid_at && (
                <p className="text-sm text-muted-foreground mt-2">
                  le {format(new Date(currentQuote.paid_at), 'dd/MM/yyyy', { locale: fr })}
                </p>
              )}
            </div>
          )}

          {isExpired && !isPaid && (
            <div className="text-center">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-amber-600" />
              </div>
              <p className="text-muted-foreground">
                Ce devis n&apos;est plus valide. Veuillez nous contacter pour
                obtenir un nouveau devis.
              </p>
              <a
                href="mailto:contact@aureluzdesign.fr"
                className="inline-block mt-4 text-primary hover:underline"
              >
                contact@aureluzdesign.fr
              </a>
            </div>
          )}

          {/* Validity info */}
          {!isPaid && !isExpired && currentQuote.expires_at && (
            <div className="mt-6 pt-4 border-t border-gray-100">
              <p className="text-xs text-muted-foreground text-center">
                Ce devis est valide jusqu&apos;au{' '}
                {format(new Date(currentQuote.expires_at), 'dd MMMM yyyy', { locale: fr })}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
