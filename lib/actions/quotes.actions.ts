'use server';

import { revalidatePath } from 'next/cache';
import { QuotesService } from '@/lib/services/quotes.service';
import { InvoicesService } from '@/lib/services/invoices.service';
import type { Quote, CreateQuoteInput, UpdateQuoteInput, QuoteStatus } from '@/lib/types';

export async function getQuotes(): Promise<Quote[]> {
  return QuotesService.getAll();
}

export async function getQuote(id: string): Promise<Quote | null> {
  return QuotesService.getById(id);
}

export async function createQuote(
  input: CreateQuoteInput
): Promise<{ success: boolean; quote?: Quote; error?: string }> {
  try {
    const quote = await QuotesService.create(input);

    revalidatePath('/admin/devis');

    return { success: true, quote };
  } catch (error) {
    console.error('Error in createQuote:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Une erreur est survenue',
    };
  }
}

export async function updateQuote(
  id: string,
  input: UpdateQuoteInput
): Promise<{ success: boolean; quote?: Quote; error?: string }> {
  try {
    const quote = await QuotesService.update(id, input);

    revalidatePath('/admin/devis');
    revalidatePath(`/admin/devis/${id}`);

    return { success: true, quote };
  } catch (error) {
    console.error('Error in updateQuote:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Une erreur est survenue',
    };
  }
}

export async function deleteQuote(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await QuotesService.delete(id);

    revalidatePath('/admin/devis');

    return { success: true };
  } catch (error) {
    console.error('Error in deleteQuote:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Une erreur est survenue',
    };
  }
}

export async function updateQuoteStatus(
  id: string,
  status: QuoteStatus
): Promise<{ success: boolean; quote?: Quote; error?: string }> {
  try {
    const quote = await QuotesService.updateStatus(id, status);

    revalidatePath('/admin/devis');
    revalidatePath(`/admin/devis/${id}`);

    return { success: true, quote };
  } catch (error) {
    console.error('Error in updateQuoteStatus:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Une erreur est survenue',
    };
  }
}

export async function getQuoteStats() {
  return QuotesService.getStats();
}

// ============================================
// Payment-related actions
// ============================================

/**
 * Get quote by validation token (for public access)
 */
export async function getQuoteByToken(
  token: string
): Promise<{ success: boolean; quote?: Quote; error?: string }> {
  try {
    const quote = await QuotesService.getByToken(token);

    if (!quote) {
      return { success: false, error: 'Devis non trouvé' };
    }

    return { success: true, quote };
  } catch (error) {
    console.error('Error in getQuoteByToken:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Une erreur est survenue',
    };
  }
}

/**
 * Accept a quote (client action)
 * This marks the quote as accepted and triggers a confirmation email with payment link
 */
export async function acceptQuote(
  quoteId: string
): Promise<{ success: boolean; quote?: Quote; error?: string }> {
  try {
    const quote = await QuotesService.markAsAccepted(quoteId);

    revalidatePath('/admin/devis');
    revalidatePath(`/admin/devis/${quoteId}`);

    return { success: true, quote };
  } catch (error) {
    console.error('Error in acceptQuote:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Une erreur est survenue',
    };
  }
}

/**
 * Create Stripe checkout session for quote payment
 */
export async function createQuoteCheckoutSession(
  quoteId: string,
  baseUrl: string
): Promise<{ success: boolean; sessionId?: string; url?: string; error?: string }> {
  try {
    const quote = await QuotesService.getById(quoteId);
    if (!quote) {
      return { success: false, error: 'Devis non trouvé' };
    }

    const successUrl = `${baseUrl}/devis/${quote.validation_token}/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${baseUrl}/devis/${quote.validation_token}`;

    const { sessionId, url } = await QuotesService.createCheckoutSession(
      quoteId,
      successUrl,
      cancelUrl
    );

    return { success: true, sessionId, url };
  } catch (error) {
    console.error('Error in createQuoteCheckoutSession:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Une erreur est survenue',
    };
  }
}

/**
 * Update deposit percentage for a quote
 */
export async function updateQuoteDepositPercent(
  id: string,
  depositPercent: number
): Promise<{ success: boolean; quote?: Quote; error?: string }> {
  try {
    const quote = await QuotesService.updateDepositPercent(id, depositPercent);

    revalidatePath('/admin/devis');
    revalidatePath(`/admin/devis/${id}`);

    return { success: true, quote };
  } catch (error) {
    console.error('Error in updateQuoteDepositPercent:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Une erreur est survenue',
    };
  }
}

/**
 * Get invoice for a quote
 */
export async function getQuoteInvoice(quoteId: string) {
  return InvoicesService.getByQuoteId(quoteId);
}
