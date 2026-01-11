import { NextResponse } from 'next/server';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { format, parseISO, addDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { QuotesService } from '@/lib/services/quotes.service';
import { EVENT_TYPES } from '@/lib/utils/constants';
import fs from 'fs';
import path from 'path';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const quote = await QuotesService.getById(id);

    if (!quote) {
      return NextResponse.json({ error: 'Devis non trouvé' }, { status: 404 });
    }

    // Create PDF document
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]); // A4 size

    // Load fonts
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Colors
    const gold = rgb(201 / 255, 162 / 255, 39 / 255); // #c9a227
    const black = rgb(0, 0, 0);
    const gray = rgb(0.4, 0.4, 0.4);
    const darkGray = rgb(0.1, 0.1, 0.1);
    const lightGray = rgb(0.95, 0.95, 0.95);
    const white = rgb(1, 1, 1);

    // Page dimensions
    const { width, height } = page.getSize();
    const margin = 50;
    let y = height - margin;

    // Try to load and embed logo
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
    } catch (logoError) {
      // If logo fails, just use text
      page.drawText('AureLuz Design', {
        x: margin,
        y: y - 20,
        size: 18,
        font: helveticaBold,
        color: gold,
      });
    }

    // Header - Quote info (right side)
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

    const createdDate = quote.created_at
      ? format(parseISO(quote.created_at), 'dd MMMM yyyy', { locale: fr })
      : format(new Date(), 'dd MMMM yyyy', { locale: fr });

    const validUntil = quote.created_at
      ? format(
          addDays(parseISO(quote.created_at), quote.validity_days),
          'dd MMMM yyyy',
          { locale: fr }
        )
      : format(addDays(new Date(), quote.validity_days), 'dd MMMM yyyy', {
          locale: fr,
        });

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

    // Horizontal line
    y -= 100;
    page.drawLine({
      start: { x: margin, y },
      end: { x: width - margin, y },
      thickness: 2,
      color: gold,
    });

    // Client info section
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
        EVENT_TYPES.find((t) => t.value === quote.event_type)?.label ||
        quote.event_type;
      const eventDateFormatted = format(
        parseISO(quote.event_date),
        'dd MMMM yyyy',
        { locale: fr }
      );
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

    // Table header
    y -= 40;
    const tableTop = y;
    const tableLeft = margin;
    const tableWidth = width - 2 * margin;
    const colWidths = [tableWidth * 0.5, tableWidth * 0.12, tableWidth * 0.19, tableWidth * 0.19];
    const rowHeight = 25;

    // Header row background
    page.drawRectangle({
      x: tableLeft,
      y: y - rowHeight,
      width: tableWidth,
      height: rowHeight,
      color: darkGray,
    });

    // Header text
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

    // Table rows
    quote.items.forEach((item, index) => {
      const rowY = y - rowHeight;

      // Alternating row background
      if (index % 2 === 0) {
        page.drawRectangle({
          x: tableLeft,
          y: rowY,
          width: tableWidth,
          height: rowHeight,
          color: lightGray,
        });
      }

      // Row data
      let xPos = tableLeft + 8;

      // Description (truncate if too long)
      const description = item.description || '—';
      const maxDescLength = 45;
      const truncatedDesc =
        description.length > maxDescLength
          ? description.substring(0, maxDescLength) + '...'
          : description;
      page.drawText(truncatedDesc, {
        x: xPos,
        y: rowY + 8,
        size: 9,
        font: helvetica,
        color: black,
      });
      xPos += colWidths[0];

      // Quantity
      page.drawText(item.quantity.toString(), {
        x: xPos + 15,
        y: rowY + 8,
        size: 9,
        font: helvetica,
        color: black,
      });
      xPos += colWidths[1];

      // Unit price
      page.drawText(
        new Intl.NumberFormat('fr-FR', {
          style: 'currency',
          currency: 'EUR',
        }).format(item.unit_price),
        {
          x: xPos,
          y: rowY + 8,
          size: 9,
          font: helvetica,
          color: black,
        }
      );
      xPos += colWidths[2];

      // Total
      page.drawText(
        new Intl.NumberFormat('fr-FR', {
          style: 'currency',
          currency: 'EUR',
        }).format(item.total),
        {
          x: xPos,
          y: rowY + 8,
          size: 9,
          font: helveticaBold,
          color: black,
        }
      );

      y -= rowHeight;
    });

    // Totals section
    y -= 30;
    const totalsX = width - margin - 180;
    const totalsWidth = 180;

    // Subtotal
    page.drawText('Sous-total HT', {
      x: totalsX,
      y,
      size: 10,
      font: helvetica,
      color: gray,
    });
    page.drawText(
      new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR',
      }).format(quote.subtotal),
      {
        x: totalsX + totalsWidth - 60,
        y,
        size: 10,
        font: helveticaBold,
        color: black,
      }
    );

    // VAT
    y -= 18;
    page.drawText(`TVA (${quote.vat_rate}%)`, {
      x: totalsX,
      y,
      size: 10,
      font: helvetica,
      color: gray,
    });
    page.drawText(
      new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR',
      }).format(quote.vat_amount),
      {
        x: totalsX + totalsWidth - 60,
        y,
        size: 10,
        font: helveticaBold,
        color: black,
      }
    );

    // Total TTC (with gold background)
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
      new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR',
      }).format(quote.total),
      {
        x: totalsX + totalsWidth - 65,
        y,
        size: 11,
        font: helveticaBold,
        color: white,
      }
    );

    // Notes section
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
      // Split notes into lines
      const words = quote.notes.split(' ');
      let line = '';
      const maxWidth = 80; // characters per line

      words.forEach((word) => {
        if ((line + ' ' + word).length > maxWidth) {
          page.drawText(line, {
            x: margin,
            y,
            size: 9,
            font: helvetica,
            color: gray,
          });
          y -= 12;
          line = word;
        } else {
          line = line ? line + ' ' + word : word;
        }
      });

      if (line) {
        page.drawText(line, {
          x: margin,
          y,
          size: 9,
          font: helvetica,
          color: gray,
        });
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

    // Generate PDF bytes
    const pdfBytes = await pdfDoc.save();

    // Return PDF
    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="devis-${quote.quote_number}.pdf"`,
      },
    });
  } catch (error) {
    console.error('Error generating PDF:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la génération du PDF' },
      { status: 500 }
    );
  }
}
