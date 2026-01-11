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
      y: y - logoDims.height,
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

  // Header
  page.drawText('DEVIS', {
    x: width - margin - 80,
    y: y - 10,
    size: 24,
    font: helveticaBold,
    color: gold,
  });

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
      new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(item.unit_price),
      { x: xPos, y: rowY + 8, size: 9, font: helvetica, color: black }
    );
    xPos += colWidths[2];

    page.drawText(
      new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(item.total),
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
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(quote.subtotal),
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
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(quote.vat_amount),
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
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(quote.total),
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

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const quote = await QuotesService.getById(id);

    if (!quote) {
      return NextResponse.json({ error: 'Devis non trouvé' }, { status: 404 });
    }

    // Generate PDF
    const pdfBuffer = await generatePdfBuffer(quote);

    // Format total for email
    const formattedTotal = new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(quote.total);

    const validUntil = format(
      addDays(parseISO(quote.created_at), quote.validity_days),
      'dd MMMM yyyy',
      { locale: fr }
    );

    // Send email with PDF attachment
    const { error } = await resend.emails.send({
      from: 'AureLuz Design <contact@aureluzdesign.fr>',
      to: quote.client_email,
      subject: `Votre devis ${quote.quote_number} - AureLuz Design`,
      html: `
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
                      <h1 style="color: #1a1a1a; font-size: 24px; margin: 0 0 20px; font-weight: 600;">
                        Bonjour ${quote.client_name},
                      </h1>

                      <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                        Merci pour votre intérêt pour nos services de décoration événementielle.
                      </p>

                      <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin: 0 0 30px;">
                        Veuillez trouver ci-joint votre devis personnalisé <strong>${quote.quote_number}</strong>.
                      </p>

                      <!-- Quote Summary -->
                      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f5f0; border-radius: 8px; margin-bottom: 30px;">
                        <tr>
                          <td style="padding: 25px;">
                            <table width="100%" cellpadding="0" cellspacing="0">
                              <tr>
                                <td style="color: #666; font-size: 14px; padding-bottom: 10px;">Montant total TTC</td>
                              </tr>
                              <tr>
                                <td style="color: #c9a227; font-size: 28px; font-weight: 700;">${formattedTotal}</td>
                              </tr>
                              <tr>
                                <td style="color: #666; font-size: 13px; padding-top: 15px;">
                                  Devis valable jusqu'au ${validUntil}
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>

                      <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin: 0 0 30px;">
                        N'hésitez pas à me contacter si vous avez des questions ou souhaitez discuter de votre projet.
                      </p>

                      <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin: 0;">
                        À très bientôt,<br/>
                        <strong style="color: #c9a227;">Karine</strong><br/>
                        <span style="color: #666; font-size: 14px;">AureLuz Design</span>
                      </p>
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
      `,
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
