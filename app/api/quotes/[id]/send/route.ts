import { NextResponse } from 'next/server';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { format, parseISO, addDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Resend } from 'resend';
import { QuotesService } from '@/lib/services/quotes.service';
import { EVENT_TYPES } from '@/lib/utils/constants';
import fs from 'fs';
import path from 'path';

interface RouteParams {
  params: Promise<{ id: string }>;
}

const resend = new Resend(process.env.RESEND_API_KEY);

// Helper to format currency for PDF (WinAnsi encoding doesn't support narrow no-break space)
function formatCurrencyForPdf(amount: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })
    .format(amount)
    .replace(/\u202F/g, ' ')  // Replace narrow no-break space with regular space
    .replace(/\u00A0/g, ' '); // Replace no-break space with regular space
}

async function generatePdfBuffer(quote: Awaited<ReturnType<typeof QuotesService.getById>>): Promise<Buffer> {
  if (!quote) throw new Error('Quote not found');

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

  const { width, height } = page.getSize();
  const margin = 50;
  let y = height - margin;

  // Header - DEVIS text (right side)
  const headerY = y - 10;
  page.drawText('DEVIS', {
    x: width - margin - 80,
    y: headerY,
    size: 24,
    font: helveticaBold,
    color: gold,
  });

  // Try to load logo (left side, aligned with DEVIS)
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
      y: headerY,
      size: 18,
      font: helveticaBold,
      color: gold,
    });
  }

  page.drawText(quote.quote_number, {
    x: width - margin - 80,
    y: y - 30,
    size: 12,
    font: helvetica,
    color: black,
  });

  const createdDate = format(parseISO(quote.created_at), 'dd MMMM yyyy', { locale: fr });
  const validUntil = format(
    addDays(parseISO(quote.created_at), quote.validity_days),
    'dd MMMM yyyy',
    { locale: fr }
  );

  page.drawText(`Date : ${createdDate}`, {
    x: width - margin - 130,
    y: y - 50,
    size: 9,
    font: helvetica,
    color: gray,
  });

  page.drawText(`Validité : ${validUntil}`, {
    x: width - margin - 130,
    y: y - 62,
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
  page.drawText(quote.client_name || '—', {
    x: margin,
    y,
    size: 12,
    font: helveticaBold,
    color: black,
  });

  y -= 15;
  page.drawText(quote.client_email || '—', {
    x: margin,
    y,
    size: 10,
    font: helvetica,
    color: gray,
  });

  if (quote.client_phone) {
    y -= 15;
    page.drawText(quote.client_phone, {
      x: margin,
      y,
      size: 10,
      font: helvetica,
      color: gray,
    });
  }

  if (quote.event_date) {
    const eventTypeLabel =
      EVENT_TYPES.find((t) => t.value === quote.event_type)?.label || quote.event_type;
    const eventDateFormatted = format(parseISO(quote.event_date), 'dd MMMM yyyy', { locale: fr });
    y -= 20;
    page.drawText(
      `Événement : ${eventTypeLabel ? eventTypeLabel + ' - ' : ''}${eventDateFormatted}`,
      {
        x: margin,
        y,
        size: 10,
        font: helvetica,
        color: gray,
      }
    );
  }

  // Table
  y -= 40;
  const tableLeft = margin;
  const tableWidth = width - 2 * margin;
  const colWidths = [tableWidth * 0.5, tableWidth * 0.12, tableWidth * 0.19, tableWidth * 0.19];
  const rowHeight = 25;

  // Header row
  page.drawRectangle({
    x: tableLeft,
    y: y - rowHeight,
    width: tableWidth,
    height: rowHeight,
    color: darkGray,
  });

  const headers = ['Description', 'Qté', 'Prix unit. HT', 'Total HT'];
  let xPos = tableLeft + 8;
  headers.forEach((header, i) => {
    page.drawText(header, {
      x: xPos,
      y: y - 17,
      size: 9,
      font: helveticaBold,
      color: white,
    });
    xPos += colWidths[i];
  });

  y -= rowHeight;

  // Data rows
  quote.items.forEach((item, index) => {
    const rowY = y - rowHeight;

    if (index % 2 === 0) {
      page.drawRectangle({
        x: tableLeft,
        y: rowY,
        width: tableWidth,
        height: rowHeight,
        color: lightGray,
      });
    }

    let xPos = tableLeft + 8;
    const description = item.description || '—';
    const truncatedDesc = description.length > 45 ? description.substring(0, 45) + '...' : description;

    page.drawText(truncatedDesc, {
      x: xPos,
      y: rowY + 8,
      size: 9,
      font: helvetica,
      color: black,
    });
    xPos += colWidths[0];

    page.drawText(item.quantity.toString(), {
      x: xPos + 15,
      y: rowY + 8,
      size: 9,
      font: helvetica,
      color: black,
    });
    xPos += colWidths[1];

    page.drawText(
      formatCurrencyForPdf(item.unit_price),
      { x: xPos, y: rowY + 8, size: 9, font: helvetica, color: black }
    );
    xPos += colWidths[2];

    page.drawText(
      formatCurrencyForPdf(item.total),
      { x: xPos, y: rowY + 8, size: 9, font: helveticaBold, color: black }
    );

    y -= rowHeight;
  });

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
  page.drawText(
    formatCurrencyForPdf(quote.subtotal),
    { x: totalsX + totalsWidth - 60, y, size: 10, font: helveticaBold, color: black }
  );

  y -= 18;
  page.drawText(`TVA (${quote.vat_rate}%)`, {
    x: totalsX,
    y,
    size: 10,
    font: helvetica,
    color: gray,
  });
  page.drawText(
    formatCurrencyForPdf(quote.vat_amount),
    { x: totalsX + totalsWidth - 60, y, size: 10, font: helveticaBold, color: black }
  );

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
  page.drawText(
    formatCurrencyForPdf(quote.total),
    { x: totalsX + totalsWidth - 65, y, size: 11, font: helveticaBold, color: white }
  );

  // Notes
  if (quote.notes) {
    y -= 50;
    page.drawText('CONDITIONS', {
      x: margin,
      y,
      size: 10,
      font: helveticaBold,
      color: gold,
    });

    y -= 18;
    const words = quote.notes.split(' ');
    let line = '';
    const maxWidth = 80;

    words.forEach((word) => {
      if ((line + ' ' + word).length > maxWidth) {
        page.drawText(line, { x: margin, y, size: 9, font: helvetica, color: gray });
        y -= 12;
        line = word;
      } else {
        line = line ? line + ' ' + word : word;
      }
    });

    if (line) {
      page.drawText(line, { x: margin, y, size: 9, font: helvetica, color: gray });
    }
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

// Check if email is Gmail
function isGmailAddress(email: string): boolean {
  return email.toLowerCase().includes('@gmail.com');
}

// Convert plain text to HTML with clickable links
function textToHtml(text: string): string {
  // Escape HTML entities
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Convert URLs to clickable links
  html = html.replace(
    /(https?:\/\/[^\s]+)/g,
    '<a href="$1" style="color: #c9a227; text-decoration: underline;">$1</a>'
  );

  // Convert line breaks to <br>
  html = html.replace(/\n/g, '<br>');

  return html;
}

// Remove URLs from text (for design version where we have buttons)
function removeUrls(text: string): string {
  return text
    .replace(/Découvrez nos réalisations :\n?/g, '')
    .replace(/- Site web : https?:\/\/[^\s]+\n?/g, '')
    .replace(/- Instagram : https?:\/\/[^\s]+\n?/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const quote = await QuotesService.getById(id);

    if (!quote) {
      return NextResponse.json({ error: 'Devis non trouvé' }, { status: 404 });
    }

    // Get custom subject and body from request
    let customSubject: string | undefined;
    let customBody: string | undefined;

    try {
      const body = await request.json();
      customSubject = body.subject;
      customBody = body.body;
    } catch {
      // No body provided, use defaults
    }

    // Generate PDF
    const pdfBuffer = await generatePdfBuffer(quote);

    // Use custom or default subject
    const emailSubject = customSubject || `Votre devis ${quote.quote_number} - AureLuz Design`;

    // Validation link (for acceptance, not direct payment)
    const paymentLink = quote.validation_token
      ? `${process.env.NEXT_PUBLIC_APP_URL || 'https://aureluzdesign.fr'}/devis/${quote.validation_token}`
      : null;

    // Check if Gmail for template selection
    const isGmail = isGmailAddress(quote.client_email);

    // For design version, remove URLs from body (we'll show buttons instead)
    const bodyForDesign = customBody ? removeUrls(customBody) : customBody;

    // Convert body to HTML
    const emailBodyHtml = customBody
      ? textToHtml(isGmail ? customBody : (bodyForDesign || customBody))
      : `Bonjour ${quote.client_name},<br><br>
         Merci pour votre intérêt pour nos services de décoration événementielle.<br><br>
         Veuillez trouver ci-joint votre devis personnalisé <strong>${quote.quote_number}</strong>.`;

    // Design template (non-Gmail) with buttons
    const designTemplate = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #FDF8F3;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #FDF8F3; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">

                <!-- Header -->
                <tr>
                  <td style="padding: 40px 40px 20px; text-align: center; border-bottom: 2px solid #c9a227;">
                    <img src="https://aureluzdesign.fr/images/aureluz-design-logo-decoration-evenementielle.png" alt="AureLuz Design" style="height: 60px; width: auto;" />
                  </td>
                </tr>

                <!-- Content -->
                <tr>
                  <td style="padding: 40px;">
                    <p style="color: #4a4a4a; font-size: 16px; line-height: 1.8; margin: 0 0 30px;">
                      ${emailBodyHtml}
                    </p>

                    <!-- Accept Quote Button -->
                    ${paymentLink ? `
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 30px;">
                      <tr>
                        <td align="center" style="padding: 25px; background-color: #f9f9f9; border-radius: 12px;">
                          <p style="color: #666; font-size: 14px; margin: 0 0 15px;">
                            Consultez le détail de votre devis et confirmez votre accord
                          </p>
                          <a href="${paymentLink}" style="display: inline-block; background: linear-gradient(135deg, #c9a227 0%, #d4af37 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 50px; font-weight: 600; font-size: 16px;">
                            Consulter et accepter le devis
                          </a>
                        </td>
                      </tr>
                    </table>
                    ` : ''}

                    <!-- Other Buttons -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 20px;">
                      <tr>
                        <td align="center" style="padding-bottom: 15px;">
                          <a href="https://aureluzdesign.fr/gallery" style="display: inline-block; background-color: #1a1a1a; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 500; font-size: 13px;">
                            Découvrir nos réalisations
                          </a>
                        </td>
                      </tr>
                      <tr>
                        <td align="center">
                          <a href="https://instagram.com/aureluz_design" style="display: inline-block;">
                            <img src="https://cdn-icons-png.flaticon.com/512/174/174855.png" alt="Instagram" style="width: 32px; height: 32px;" />
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="padding: 30px 40px; background-color: #1a1a1a; border-radius: 0 0 12px 12px; text-align: center;">
                    <p style="color: #c9a227; font-size: 14px; margin: 0 0 10px; font-weight: 600;">
                      AureLuz Design - Décoration sur mesure
                    </p>
                    <p style="color: #999; font-size: 12px; margin: 0;">
                      contact@aureluzdesign.fr | www.aureluzdesign.fr
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    // Simple template (Gmail) with text links
    const gmailTemplate = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 20px; font-family: Arial, sans-serif; background-color: #FDF8F3;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 30px; border-radius: 8px;">
          <tr>
            <td style="text-align: center; padding-bottom: 20px; border-bottom: 2px solid #c9a227;">
              <span style="font-size: 24px; font-weight: bold; color: #c9a227;">AureLuz Design</span>
              <br>
              <span style="font-size: 12px; color: #666;">Décoration sur mesure</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px 0;">
              <p style="color: #333; font-size: 15px; line-height: 1.8; margin: 0;">
                ${emailBodyHtml}
              </p>
            </td>
          </tr>
          ${paymentLink ? `
          <tr>
            <td style="padding: 20px 0; text-align: center; background-color: #f9f9f9; border-radius: 8px;">
              <p style="color: #666; font-size: 14px; margin: 0 0 8px;">Consultez le détail et confirmez votre accord</p>
              <p style="margin: 0;"><strong>→ <a href="${paymentLink}" style="color: #c9a227;">Consulter et accepter le devis</a></strong></p>
            </td>
          </tr>
          ` : ''}
          <tr>
            <td style="padding-top: 20px; border-top: 1px solid #eee; text-align: center;">
              <p style="color: #666; font-size: 12px; margin: 0;">
                AureLuz Design - Décoration sur mesure
                <br>
                contact@aureluzdesign.fr | www.aureluzdesign.fr
              </p>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    // Send email with PDF attachment
    const { error } = await resend.emails.send({
      from: 'AureLuz Design <contact@aureluzdesign.fr>',
      to: quote.client_email,
      subject: emailSubject,
      html: isGmail ? gmailTemplate : designTemplate,
      attachments: [
        {
          filename: `devis-${quote.quote_number}.pdf`,
          content: pdfBuffer,
        },
      ],
    });

    if (error) {
      console.error('Error sending email:', error);
      return NextResponse.json(
        { error: 'Erreur lors de l\'envoi de l\'email' },
        { status: 500 }
      );
    }

    // Update quote status to 'sent'
    await QuotesService.updateStatus(quote.id, 'sent');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error sending quote:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'envoi du devis' },
      { status: 500 }
    );
  }
}
