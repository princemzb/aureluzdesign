'use server';

import { revalidatePath } from 'next/cache';
import { QuotePaymentsService } from '@/lib/services/quote-payments.service';
import { QuotesService } from '@/lib/services/quotes.service';
import { sendPaymentRequestEmail } from '@/lib/services/email.service';
import type { CreateQuotePaymentInput, UpdateQuotePaymentInput } from '@/lib/types';

export async function getQuotePayments(quoteId: string) {
  try {
    const payments = await QuotePaymentsService.getByQuoteId(quoteId);
    return { success: true, data: payments };
  } catch (error) {
    console.error('Error getting quote payments:', error);
    return { success: false, error: 'Erreur lors de la récupération des échéances' };
  }
}

export async function getQuotePaymentSummary(quoteId: string) {
  try {
    const summary = await QuotePaymentsService.getSummary(quoteId);
    return { success: true, data: summary };
  } catch (error) {
    console.error('Error getting payment summary:', error);
    return { success: false, error: 'Erreur lors de la récupération du résumé' };
  }
}

export async function createQuotePayment(input: CreateQuotePaymentInput) {
  try {
    const payment = await QuotePaymentsService.create(input);
    revalidatePath('/admin/devis');
    revalidatePath(`/admin/devis/${input.quote_id}`);
    return { success: true, data: payment };
  } catch (error) {
    console.error('Error creating quote payment:', error);
    return { success: false, error: 'Erreur lors de la création de l\'échéance' };
  }
}

export async function updateQuotePayment(paymentId: string, input: UpdateQuotePaymentInput) {
  try {
    const payment = await QuotePaymentsService.update(paymentId, input);
    revalidatePath('/admin/devis');
    return { success: true, data: payment };
  } catch (error) {
    console.error('Error updating quote payment:', error);
    return { success: false, error: 'Erreur lors de la mise à jour de l\'échéance' };
  }
}

export async function deleteQuotePayment(paymentId: string) {
  try {
    await QuotePaymentsService.delete(paymentId);
    revalidatePath('/admin/devis');
    return { success: true };
  } catch (error) {
    console.error('Error deleting quote payment:', error);
    return { success: false, error: 'Erreur lors de la suppression de l\'échéance' };
  }
}

export async function createDefaultPaymentSchedule(quoteId: string) {
  try {
    const payments = await QuotePaymentsService.createDefaultSchedule(quoteId);
    revalidatePath('/admin/devis');
    revalidatePath(`/admin/devis/${quoteId}`);
    return { success: true, data: payments };
  } catch (error) {
    console.error('Error creating default payment schedule:', error);
    return { success: false, error: 'Erreur lors de la création de l\'échéancier' };
  }
}

export async function sendPaymentRequest(paymentId: string) {
  try {
    // Mark payment as sent (generates validation token)
    const payment = await QuotePaymentsService.markAsSent(paymentId);

    // Get quote info
    const quote = await QuotesService.getById(payment.quote_id);
    if (!quote) {
      return { success: false, error: 'Devis non trouvé' };
    }

    // Get payment summary
    const summary = await QuotePaymentsService.getSummary(payment.quote_id);

    // Send email
    const emailResult = await sendPaymentRequestEmail(quote, payment, summary);
    if (!emailResult.success) {
      console.error('Failed to send payment request email:', emailResult.error);
      // Don't fail the whole operation if email fails
    }

    revalidatePath('/admin/devis');
    revalidatePath(`/admin/devis/${payment.quote_id}`);

    return { success: true, data: payment };
  } catch (error) {
    console.error('Error sending payment request:', error);
    return { success: false, error: 'Erreur lors de l\'envoi de la demande de paiement' };
  }
}

export async function createPaymentCheckoutSession(paymentId: string, baseUrl: string) {
  try {
    const payment = await QuotePaymentsService.getById(paymentId);
    if (!payment) {
      return { success: false, error: 'Échéance non trouvée' };
    }

    const successUrl = `${baseUrl}/paiement/${payment.validation_token}/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${baseUrl}/paiement/${payment.validation_token}`;

    const { url } = await QuotePaymentsService.createCheckoutSession(
      paymentId,
      successUrl,
      cancelUrl
    );

    return { success: true, url };
  } catch (error) {
    console.error('Error creating payment checkout session:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur lors de la création de la session',
    };
  }
}

export async function recalculatePaymentAmounts(quoteId: string) {
  try {
    const payments = await QuotePaymentsService.recalculateAmounts(quoteId);
    revalidatePath('/admin/devis');
    revalidatePath(`/admin/devis/${quoteId}`);
    return { success: true, data: payments };
  } catch (error) {
    console.error('Error recalculating payment amounts:', error);
    return { success: false, error: 'Erreur lors du recalcul des montants' };
  }
}
