'use server';

import { revalidatePath } from 'next/cache';
import { QuotesService } from '@/lib/services/quotes.service';
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
