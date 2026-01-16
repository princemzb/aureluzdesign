'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  CreditCard,
  Send,
  Check,
  Clock,
  AlertCircle,
  Loader2,
  Copy,
  ExternalLink,
} from 'lucide-react';
import type { QuotePayment, QuotePaymentSummary } from '@/lib/types';

interface QuotePaymentsListProps {
  payments: QuotePayment[];
  summary: QuotePaymentSummary | null;
  quoteStatus: string;
  onSendPaymentRequest: (paymentId: string) => Promise<{ success: boolean; error?: string }>;
}

export function QuotePaymentsList({
  payments,
  summary,
  quoteStatus,
  onSendPaymentRequest,
}: QuotePaymentsListProps) {
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleSendRequest = async (paymentId: string) => {
    setSendingId(paymentId);
    try {
      const result = await onSendPaymentRequest(paymentId);
      if (!result.success) {
        alert(result.error || 'Erreur lors de l\'envoi');
      }
    } finally {
      setSendingId(null);
    }
  };

  const handleCopyLink = async (payment: QuotePayment) => {
    if (!payment.validation_token) return;
    const url = `${window.location.origin}/paiement/${payment.validation_token}`;
    await navigator.clipboard.writeText(url);
    setCopiedId(payment.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <Check className="w-4 h-4 text-green-600" />;
      case 'sent':
        return <Clock className="w-4 h-4 text-amber-600" />;
      case 'cancelled':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'paid':
        return 'Payé';
      case 'sent':
        return 'En attente';
      case 'cancelled':
        return 'Annulé';
      default:
        return 'À envoyer';
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'sent':
        return 'bg-amber-100 text-amber-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const canSendPayment = (payment: QuotePayment) => {
    // Can only send if quote is sent and payment is pending
    // Also, previous payments should be paid first
    if (quoteStatus !== 'sent' && quoteStatus !== 'accepted') return false;
    if (payment.status !== 'pending') return false;

    // Check if all previous payments are paid
    const previousPayments = payments.filter(
      (p) => p.payment_number < payment.payment_number
    );
    return previousPayments.every((p) => p.status === 'paid');
  };

  if (payments.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>Aucun échéancier défini</p>
        <p className="text-sm">L&apos;échéancier sera créé lors de l&apos;envoi du devis</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Progress summary */}
      {summary && (
        <div className="bg-muted/50 rounded-lg p-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">
              Progression ({summary.paid_payments}/{summary.total_payments} paiements)
            </span>
            <span className="font-medium">
              {summary.total_paid.toFixed(2)} EUR / {summary.total.toFixed(2)} EUR
            </span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${(summary.total_paid / summary.total) * 100}%` }}
            />
          </div>
          {summary.remaining_amount > 0 && (
            <p className="text-sm text-muted-foreground mt-2">
              Reste à payer: {summary.remaining_amount.toFixed(2)} EUR
            </p>
          )}
        </div>
      )}

      {/* Payment list */}
      <div className="divide-y divide-border">
        {payments.map((payment) => (
          <div key={payment.id} className="py-4 first:pt-0 last:pb-0">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-foreground">
                    {payment.label}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(payment.status)}`}
                  >
                    {getStatusIcon(payment.status)}
                    <span className="ml-1">{getStatusLabel(payment.status)}</span>
                  </span>
                </div>

                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  {payment.percentage && (
                    <span>{payment.percentage}% du total</span>
                  )}
                  {payment.due_date && (
                    <span>
                      Échéance: {format(new Date(payment.due_date), 'dd/MM/yyyy', { locale: fr })}
                    </span>
                  )}
                </div>

                {payment.paid_at && (
                  <p className="text-sm text-green-600 mt-1">
                    Payé le {format(new Date(payment.paid_at), 'dd/MM/yyyy à HH:mm', { locale: fr })}
                  </p>
                )}

                {payment.sent_at && !payment.paid_at && (
                  <p className="text-sm text-amber-600 mt-1">
                    Envoyé le {format(new Date(payment.sent_at), 'dd/MM/yyyy à HH:mm', { locale: fr })}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold text-foreground whitespace-nowrap">
                  {payment.amount.toFixed(2)} EUR
                </span>

                {/* Actions */}
                {payment.status === 'pending' && canSendPayment(payment) && (
                  <button
                    onClick={() => handleSendRequest(payment.id)}
                    disabled={sendingId === payment.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
                  >
                    {sendingId === payment.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    Envoyer
                  </button>
                )}

                {payment.status === 'sent' && payment.validation_token && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleCopyLink(payment)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-muted text-foreground rounded-lg text-sm hover:bg-muted/80"
                      title="Copier le lien"
                    >
                      {copiedId === payment.id ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                    <a
                      href={`/paiement/${payment.validation_token}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-muted text-foreground rounded-lg text-sm hover:bg-muted/80"
                      title="Ouvrir la page de paiement"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
