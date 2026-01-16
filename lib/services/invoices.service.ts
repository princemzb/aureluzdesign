import { createAdminClient } from '@/lib/supabase/server';
import type { Invoice, CreateInvoiceInput, Quote } from '@/lib/types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fs from 'fs';
import path from 'path';

// Helper to format currency for PDF (WinAnsi encoding doesn't support narrow no-break space)
function formatCurrencyForPdf(amount: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })
    .format(amount)
    .replace(/\u202F/g, ' ')
    .replace(/\u00A0/g, ' ');
}

export class InvoicesService {
  /**
   * Get all invoices
   */
  static async getAll(): Promise<Invoice[]> {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching invoices:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Get invoice by ID
   */
  static async getById(id: string): Promise<Invoice | null> {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching invoice:', error);
      return null;
    }

    return data;
  }

  /**
   * Get invoice by quote ID
   */
  static async getByQuoteId(quoteId: string): Promise<Invoice | null> {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('quote_id', quoteId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching invoice by quote ID:', error);
      return null;
    }

    return data || null;
  }

  /**
   * Create an invoice
   */
  static async create(input: CreateInvoiceInput): Promise<Invoice> {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('invoices')
      .insert({
        quote_id: input.quote_id,
        client_name: input.client_name,
        client_email: input.client_email,
        amount: input.amount,
        vat_amount: input.vat_amount || 0,
        total_amount: input.total_amount,
        payment_method: input.payment_method || 'stripe',
        stripe_payment_intent_id: input.stripe_payment_intent_id || null,
        notes: input.notes || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating invoice:', error);
      throw new Error('Erreur lors de la création de la facture');
    }

    return data;
  }

  /**
   * Update invoice PDF URL
   */
  static async updatePdfUrl(id: string, pdfUrl: string, storagePath: string): Promise<Invoice> {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('invoices')
      .update({
        pdf_url: pdfUrl,
        pdf_storage_path: storagePath,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating invoice PDF URL:', error);
      throw new Error('Erreur lors de la mise à jour de la facture');
    }

    return data;
  }

  /**
   * Mark invoice as sent
   */
  static async markAsSent(id: string): Promise<Invoice> {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('invoices')
      .update({ sent_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error marking invoice as sent:', error);
      throw new Error('Erreur lors de la mise à jour de la facture');
    }

    return data;
  }

  /**
   * Upload PDF to Supabase Storage
   */
  static async uploadPdf(invoiceNumber: string, pdfBuffer: ArrayBuffer): Promise<{ url: string; path: string }> {
    const supabase = createAdminClient();

    const filename = `${invoiceNumber}.pdf`;
    const storagePath = `invoices/${filename}`;

    const { error: uploadError } = await supabase.storage
      .from('photos')
      .upload(storagePath, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (uploadError) {
      console.error('Error uploading invoice PDF:', uploadError);
      throw new Error('Erreur lors de l\'upload de la facture');
    }

    const { data: urlData } = supabase.storage
      .from('photos')
      .getPublicUrl(storagePath);

    return {
      url: urlData.publicUrl,
      path: storagePath,
    };
  }

  /**
   * Create invoice from a paid quote
   */
  static async createFromQuote(quote: Quote, paymentIntentId: string): Promise<Invoice> {
    // Calculate amounts for the deposit invoice
    const depositAmount = quote.paid_amount || quote.deposit_amount || 0;
    const vatRate = quote.vat_rate || 0;
    const amountHT = depositAmount / (1 + vatRate / 100);
    const vatAmount = depositAmount - amountHT;

    // Create invoice
    const invoice = await this.create({
      quote_id: quote.id,
      client_name: quote.client_name,
      client_email: quote.client_email,
      amount: Math.round(amountHT * 100) / 100,
      vat_amount: Math.round(vatAmount * 100) / 100,
      total_amount: depositAmount,
      payment_method: 'stripe',
      stripe_payment_intent_id: paymentIntentId,
      notes: `Acompte de ${quote.deposit_percent}% pour le devis ${quote.quote_number}`,
    });

    return invoice;
  }

  /**
   * Generate invoice PDF buffer using pdf-lib
   */
  static async generatePdfBuffer(invoice: Invoice, quote: Quote): Promise<Buffer> {
    // Create PDF document
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]); // A4 size

    // Load fonts
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Colors
    const gold = rgb(201 / 255, 162 / 255, 39 / 255);
    const black = rgb(0, 0, 0);
    const gray = rgb(0.4, 0.4, 0.4);
    const darkGray = rgb(0.1, 0.1, 0.1);
    const lightGray = rgb(0.95, 0.95, 0.95);
    const white = rgb(1, 1, 1);
    const green = rgb(0.2, 0.6, 0.3);

    const { width, height } = page.getSize();
    const margin = 50;
    let y = height - margin;

    // Format currency (use helper that handles special characters)
    const formatCurrency = formatCurrencyForPdf;

    // Try to load logo
    try {
      const logoPath = path.join(
        process.cwd(),
        'public',
        'images',
        'aureluz-design-logo-decoration-evenementielle.png'
      );
      const logoBytes = fs.readFileSync(logoPath);
      const logoImage = await pdfDoc.embedPng(logoBytes);
      const logoScale = 0.3;
      const logoDims = logoImage.scale(logoScale);
      page.drawImage(logoImage, {
        x: margin,
        y: y - logoDims.height + 45,
        width: logoDims.width,
        height: logoDims.height,
      });
    } catch {
      page.drawText('AureLuz Design', {
        x: margin,
        y: y - 20,
        size: 18,
        font: helveticaBold,
        color: gold,
      });
    }

    // Header - FACTURE
    page.drawText('FACTURE', {
      x: width - margin - 100,
      y: y - 10,
      size: 24,
      font: helveticaBold,
      color: gold,
    });

    page.drawText(invoice.invoice_number, {
      x: width - margin - 100,
      y: y - 30,
      size: 12,
      font: helvetica,
      color: black,
    });

    const invoiceDate = format(new Date(invoice.created_at), 'dd MMMM yyyy', { locale: fr });
    page.drawText(`Date : ${invoiceDate}`, {
      x: width - margin - 130,
      y: y - 50,
      size: 9,
      font: helvetica,
      color: gray,
    });

    // Line
    y -= 100;
    page.drawLine({
      start: { x: margin, y },
      end: { x: width - margin, y },
      thickness: 2,
      color: gold,
    });

    // Client info
    y -= 30;
    page.drawText('CLIENT', {
      x: margin,
      y,
      size: 10,
      font: helveticaBold,
      color: gold,
    });

    y -= 20;
    page.drawText(invoice.client_name || '—', {
      x: margin,
      y,
      size: 12,
      font: helveticaBold,
      color: black,
    });

    y -= 15;
    page.drawText(invoice.client_email || '—', {
      x: margin,
      y,
      size: 10,
      font: helvetica,
      color: gray,
    });

    // Quote reference
    y -= 25;
    page.drawText(`Devis de référence : ${quote.quote_number}`, {
      x: margin,
      y,
      size: 10,
      font: helvetica,
      color: gray,
    });

    if (quote.event_date) {
      const eventDate = format(new Date(quote.event_date), 'dd MMMM yyyy', { locale: fr });
      y -= 15;
      page.drawText(`Événement : ${eventDate}`, {
        x: margin,
        y,
        size: 10,
        font: helvetica,
        color: gray,
      });
    }

    // Table
    y -= 40;
    const tableLeft = margin;
    const tableWidth = width - 2 * margin;
    const colWidths = [tableWidth * 0.7, tableWidth * 0.3];
    const rowHeight = 30;

    // Header row
    page.drawRectangle({
      x: tableLeft,
      y: y - rowHeight,
      width: tableWidth,
      height: rowHeight,
      color: darkGray,
    });

    page.drawText('Description', {
      x: tableLeft + 10,
      y: y - 20,
      size: 10,
      font: helveticaBold,
      color: white,
    });

    page.drawText('Montant', {
      x: tableLeft + colWidths[0] + 10,
      y: y - 20,
      size: 10,
      font: helveticaBold,
      color: white,
    });

    y -= rowHeight;

    // Data row
    page.drawRectangle({
      x: tableLeft,
      y: y - rowHeight,
      width: tableWidth,
      height: rowHeight,
      color: lightGray,
    });

    const description = `Acompte de ${quote.deposit_percent || 30}% sur le devis ${quote.quote_number}`;
    page.drawText(description, {
      x: tableLeft + 10,
      y: y - 20,
      size: 10,
      font: helvetica,
      color: black,
    });

    page.drawText(formatCurrency(invoice.amount), {
      x: tableLeft + colWidths[0] + 10,
      y: y - 20,
      size: 10,
      font: helveticaBold,
      color: black,
    });

    y -= rowHeight;

    // Totals
    y -= 30;
    const totalsX = width - margin - 180;
    const totalsWidth = 180;

    page.drawText('Sous-total HT', {
      x: totalsX,
      y,
      size: 10,
      font: helvetica,
      color: gray,
    });
    page.drawText(formatCurrency(invoice.amount), {
      x: totalsX + totalsWidth - 60,
      y,
      size: 10,
      font: helveticaBold,
      color: black,
    });

    y -= 18;
    page.drawText(`TVA (${quote.vat_rate}%)`, {
      x: totalsX,
      y,
      size: 10,
      font: helvetica,
      color: gray,
    });
    page.drawText(formatCurrency(invoice.vat_amount), {
      x: totalsX + totalsWidth - 60,
      y,
      size: 10,
      font: helveticaBold,
      color: black,
    });

    y -= 25;
    page.drawRectangle({
      x: totalsX - 10,
      y: y - 8,
      width: totalsWidth + 20,
      height: 28,
      color: gold,
    });
    page.drawText('Total TTC', {
      x: totalsX,
      y,
      size: 11,
      font: helveticaBold,
      color: white,
    });
    page.drawText(formatCurrency(invoice.total_amount), {
      x: totalsX + totalsWidth - 65,
      y,
      size: 11,
      font: helveticaBold,
      color: white,
    });

    // Payment confirmation box
    y -= 60;
    page.drawRectangle({
      x: margin,
      y: y - 50,
      width: tableWidth,
      height: 50,
      color: rgb(0.95, 1, 0.95),
      borderColor: green,
      borderWidth: 1,
    });

    page.drawText('✓ PAIEMENT REÇU', {
      x: margin + 15,
      y: y - 20,
      size: 12,
      font: helveticaBold,
      color: green,
    });

    page.drawText(`Paiement par carte bancaire reçu le ${invoiceDate}`, {
      x: margin + 15,
      y: y - 38,
      size: 9,
      font: helvetica,
      color: gray,
    });

    if (invoice.stripe_payment_intent_id) {
      page.drawText(`Référence : ${invoice.stripe_payment_intent_id}`, {
        x: margin + 300,
        y: y - 38,
        size: 8,
        font: helvetica,
        color: gray,
      });
    }

    // Footer
    const footerY = 50;
    page.drawLine({
      start: { x: margin, y: footerY + 20 },
      end: { x: width - margin, y: footerY + 20 },
      thickness: 0.5,
      color: gray,
    });

    page.drawText('AureLuz Design - Décoration sur mesure', {
      x: width / 2 - 80,
      y: footerY,
      size: 9,
      font: helveticaBold,
      color: gold,
    });

    page.drawText('contact@aureluzdesign.fr | www.aureluzdesign.fr', {
      x: width / 2 - 90,
      y: footerY - 12,
      size: 8,
      font: helvetica,
      color: gray,
    });

    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  }

  /**
   * Generate invoice HTML for PDF conversion
   */
  static generateInvoiceHtml(invoice: Invoice, quote: Quote): string {
    const invoiceDate = format(new Date(invoice.created_at), 'dd MMMM yyyy', { locale: fr });

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 12px; line-height: 1.5; color: #333; padding: 40px; }
          .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
          .logo { font-size: 24px; font-weight: bold; color: #c9a227; }
          .company-info { text-align: right; font-size: 11px; color: #666; }
          .invoice-title { font-size: 28px; font-weight: bold; color: #1a1a1a; margin-bottom: 30px; }
          .info-section { display: flex; justify-content: space-between; margin-bottom: 40px; }
          .client-info, .invoice-info { width: 45%; }
          .section-title { font-size: 11px; font-weight: bold; color: #666; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px; }
          .info-value { font-size: 14px; margin-bottom: 5px; }
          .table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
          .table th { background: #f5f5f5; padding: 12px; text-align: left; font-weight: 600; border-bottom: 2px solid #ddd; }
          .table td { padding: 12px; border-bottom: 1px solid #eee; }
          .table .amount { text-align: right; }
          .totals { width: 300px; margin-left: auto; }
          .total-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
          .total-row.final { font-size: 16px; font-weight: bold; border-top: 2px solid #333; border-bottom: none; padding-top: 12px; }
          .footer { margin-top: 60px; padding-top: 20px; border-top: 1px solid #eee; font-size: 10px; color: #999; text-align: center; }
          .payment-info { background: #f9f9f9; padding: 20px; border-radius: 8px; margin-top: 30px; }
          .payment-title { font-weight: bold; margin-bottom: 10px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="logo">AureLuz Design</div>
            <p>Décoration Événementielle</p>
          </div>
          <div class="company-info">
            <p>AureLuz Design</p>
            <p>SIRET: XXX XXX XXX XXXXX</p>
            <p>contact@aureluzdesign.fr</p>
            <p>+33 6 61 43 43 65</p>
          </div>
        </div>

        <h1 class="invoice-title">Facture ${invoice.invoice_number}</h1>

        <div class="info-section">
          <div class="client-info">
            <div class="section-title">Facturé à</div>
            <div class="info-value"><strong>${invoice.client_name}</strong></div>
            <div class="info-value">${invoice.client_email}</div>
          </div>
          <div class="invoice-info">
            <div class="section-title">Informations</div>
            <div class="info-value"><strong>Date:</strong> ${invoiceDate}</div>
            <div class="info-value"><strong>Devis:</strong> ${quote.quote_number}</div>
            ${quote.event_date ? `<div class="info-value"><strong>Événement:</strong> ${format(new Date(quote.event_date), 'dd/MM/yyyy', { locale: fr })}</div>` : ''}
          </div>
        </div>

        <table class="table">
          <thead>
            <tr>
              <th>Description</th>
              <th class="amount">Montant</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                Acompte de ${quote.deposit_percent}% sur le devis ${quote.quote_number}
                ${quote.event_type ? `<br><small style="color: #666;">${quote.event_type}</small>` : ''}
              </td>
              <td class="amount">${invoice.amount.toFixed(2)} EUR</td>
            </tr>
          </tbody>
        </table>

        <div class="totals">
          <div class="total-row">
            <span>Sous-total HT</span>
            <span>${invoice.amount.toFixed(2)} EUR</span>
          </div>
          <div class="total-row">
            <span>TVA (${quote.vat_rate}%)</span>
            <span>${invoice.vat_amount.toFixed(2)} EUR</span>
          </div>
          <div class="total-row final">
            <span>Total TTC</span>
            <span>${invoice.total_amount.toFixed(2)} EUR</span>
          </div>
        </div>

        <div class="payment-info">
          <div class="payment-title">Paiement reçu</div>
          <p>Cette facture a été payée par carte bancaire via Stripe le ${invoiceDate}.</p>
          <p>Référence paiement: ${invoice.stripe_payment_intent_id || 'N/A'}</p>
        </div>

        <div class="footer">
          <p>AureLuz Design - Décoration Événementielle</p>
          <p>Merci pour votre confiance !</p>
        </div>
      </body>
      </html>
    `;
  }
}
