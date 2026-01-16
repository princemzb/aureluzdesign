'use server';

import { revalidatePath } from 'next/cache';
import { InvoicesService } from '@/lib/services/invoices.service';
import { QuotesService } from '@/lib/services/quotes.service';
import type { Invoice } from '@/lib/types';

/**
 * Get all invoices
 */
export async function getInvoices(): Promise<Invoice[]> {
  return InvoicesService.getAll();
}

/**
 * Get invoice by ID
 */
export async function getInvoice(id: string): Promise<Invoice | null> {
  return InvoicesService.getById(id);
}

/**
 * Get invoice by quote ID
 */
export async function getInvoiceByQuoteId(quoteId: string): Promise<Invoice | null> {
  return InvoicesService.getByQuoteId(quoteId);
}

/**
 * Create invoice from a paid quote and generate PDF
 */
export async function createInvoiceFromQuote(
  quoteId: string,
  paymentIntentId: string
): Promise<{ success: boolean; invoice?: Invoice; error?: string }> {
  try {
    const quote = await QuotesService.getById(quoteId);
    if (!quote) {
      return { success: false, error: 'Devis non trouvé' };
    }

    // Create invoice
    const invoice = await InvoicesService.createFromQuote(quote, paymentIntentId);

    revalidatePath('/admin/factures');
    revalidatePath('/admin/devis');

    return { success: true, invoice };
  } catch (error) {
    console.error('Error in createInvoiceFromQuote:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Une erreur est survenue',
    };
  }
}

/**
 * Upload PDF for an invoice
 */
export async function uploadInvoicePdf(
  invoiceId: string,
  pdfBuffer: ArrayBuffer
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const invoice = await InvoicesService.getById(invoiceId);
    if (!invoice) {
      return { success: false, error: 'Facture non trouvée' };
    }

    const { url, path } = await InvoicesService.uploadPdf(invoice.invoice_number, pdfBuffer);
    await InvoicesService.updatePdfUrl(invoiceId, url, path);

    revalidatePath('/admin/factures');

    return { success: true, url };
  } catch (error) {
    console.error('Error in uploadInvoicePdf:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Une erreur est survenue',
    };
  }
}

/**
 * Mark invoice as sent
 */
export async function markInvoiceAsSent(
  id: string
): Promise<{ success: boolean; invoice?: Invoice; error?: string }> {
  try {
    const invoice = await InvoicesService.markAsSent(id);

    revalidatePath('/admin/factures');

    return { success: true, invoice };
  } catch (error) {
    console.error('Error in markInvoiceAsSent:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Une erreur est survenue',
    };
  }
}
