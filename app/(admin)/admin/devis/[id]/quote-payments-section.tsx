'use client';

import { useRouter } from 'next/navigation';
import { QuotePaymentsList } from '@/components/admin/quote-payments-list';
import { sendPaymentRequest } from '@/lib/actions/quote-payments.actions';
import type { QuotePayment, QuotePaymentSummary } from '@/lib/types';

interface QuotePaymentsSectionProps {
  payments: QuotePayment[];
  summary: QuotePaymentSummary | null;
  quoteStatus: string;
}

export function QuotePaymentsSection({
  payments,
  summary,
  quoteStatus,
}: QuotePaymentsSectionProps) {
  const router = useRouter();

  const handleSendPaymentRequest = async (paymentId: string) => {
    const result = await sendPaymentRequest(paymentId);
    if (result.success) {
      router.refresh();
    }
    return result;
  };

  return (
    <QuotePaymentsList
      payments={payments}
      summary={summary}
      quoteStatus={quoteStatus}
      onSendPaymentRequest={handleSendPaymentRequest}
    />
  );
}
