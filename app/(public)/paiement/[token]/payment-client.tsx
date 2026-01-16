'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  CreditCard,
  CheckCircle,
  Loader2,
  AlertCircle,
  FileText,
} from 'lucide-react';
import type { Quote, QuotePayment, QuotePaymentSummary } from '@/lib/types';
import { createPaymentCheckoutSession } from '@/lib/actions/quote-payments.actions';

interface PaymentClientProps {
  payment: QuotePayment;
  quote: Quote;
  allPayments: QuotePayment[];
  summary: QuotePaymentSummary | null;
  isPaid: boolean;
}

export function PaymentClient({
  payment,
  quote,
  allPayments,
  summary,
  isPaid,
}: PaymentClientProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePayment = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const baseUrl = window.location.origin;
      const result = await createPaymentCheckoutSession(payment.id, baseUrl);

      if (!result.success || !result.url) {
        throw new Error(result.error || 'Erreur lors de la création de la session de paiement');
      }

      window.location.href = result.url;
    } catch (err) {
      console.error('Payment error:', err);
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Payment progress */}
      {summary && allPayments.length > 1 && (
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="font-semibold text-foreground mb-4">Échéancier de paiement</h2>

          <div className="space-y-3">
            {allPayments.map((p) => (
              <div
                key={p.id}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  p.id === payment.id
                    ? 'bg-primary/10 border-2 border-primary'
                    : p.status === 'paid'
                    ? 'bg-green-50'
                    : 'bg-muted/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  {p.status === 'paid' ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : p.id === payment.id ? (
                    <CreditCard className="w-5 h-5 text-primary" />
                  ) : (
                    <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
                  )}
                  <div>
                    <p className="font-medium text-foreground">{p.label}</p>
                    {p.percentage && (
                      <p className="text-sm text-muted-foreground">{p.percentage}%</p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-foreground">{p.amount.toFixed(2)} EUR</p>
                  {p.status === 'paid' && p.paid_at && (
                    <p className="text-xs text-green-600">
                      Payé le {format(new Date(p.paid_at), 'dd/MM/yy', { locale: fr })}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Progress bar */}
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex justify-between text-sm text-muted-foreground mb-2">
              <span>Progression</span>
              <span>{summary.total_paid.toFixed(2)} / {summary.total.toFixed(2)} EUR</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${(summary.total_paid / summary.total) * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Quote summary */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
            <FileText className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">{quote.quote_number}</h2>
            <p className="text-sm text-muted-foreground">{quote.client_name}</p>
          </div>
        </div>

        {quote.event_type && (
          <p className="text-muted-foreground mb-2">
            Événement: {quote.event_type}
          </p>
        )}
        {quote.event_date && (
          <p className="text-muted-foreground">
            Date: {format(new Date(quote.event_date), 'dd MMMM yyyy', { locale: fr })}
          </p>
        )}
      </div>

      {/* Payment action */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        {isPaid ? (
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              {payment.label} confirmé
            </h3>
            <p className="text-2xl font-bold text-green-600 mb-2">
              {payment.amount.toFixed(2)} EUR
            </p>
            {payment.paid_at && (
              <p className="text-sm text-muted-foreground">
                Payé le {format(new Date(payment.paid_at), 'dd MMMM yyyy à HH:mm', { locale: fr })}
              </p>
            )}
          </div>
        ) : (
          <>
            <div className="text-center mb-6">
              <p className="text-sm text-muted-foreground mb-1">{payment.label}</p>
              <p className="text-4xl font-bold text-primary">
                {payment.amount.toFixed(2)} EUR
              </p>
              {payment.due_date && (
                <p className="text-sm text-muted-foreground mt-2">
                  À régler avant le {format(new Date(payment.due_date), 'dd MMMM yyyy', { locale: fr })}
                </p>
              )}
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
                  Payer {payment.amount.toFixed(2)} EUR
                </>
              )}
            </button>

            <p className="text-xs text-muted-foreground text-center mt-4">
              Paiement sécurisé par Stripe
            </p>
          </>
        )}
      </div>
    </div>
  );
}
