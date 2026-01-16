import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { getStripeClient } from '@/lib/stripe/client';
import { QuotesService } from '@/lib/services/quotes.service';
import { QuotePaymentsService } from '@/lib/services/quote-payments.service';
import { InvoicesService } from '@/lib/services/invoices.service';
import { sendInvoiceEmail, sendPaymentConfirmationEmail } from '@/lib/services/email.service';

export async function POST(request: Request) {
  const stripe = getStripeClient();
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get('stripe-signature');

  if (!signature) {
    console.error('Missing Stripe signature');
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('Missing STRIPE_WEBHOOK_SECRET');
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  console.log(`📥 Stripe webhook received: ${event.type}`);

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutSessionCompleted(session);
        break;
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log(`💳 Payment intent succeeded: ${paymentIntent.id}`);
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log(`❌ Payment intent failed: ${paymentIntent.id}`);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  console.log(`✅ Checkout session completed: ${session.id}`);

  const paymentId = session.metadata?.payment_id;
  const quoteId = session.metadata?.quote_id;
  const paymentIntentId = session.payment_intent as string;
  const amountPaid = (session.amount_total || 0) / 100; // Convert from cents

  // New payment system (quote_payments table)
  if (paymentId) {
    await handlePaymentCompleted(paymentId, paymentIntentId, amountPaid, session);
    return;
  }

  // Legacy payment system (direct quote payment)
  if (quoteId) {
    await handleLegacyQuotePayment(quoteId, paymentIntentId, amountPaid);
    return;
  }

  console.error('No payment_id or quote_id in session metadata');
}

async function handlePaymentCompleted(
  paymentId: string,
  paymentIntentId: string,
  amountPaid: number,
  _session: Stripe.Checkout.Session
) {
  console.log(`📝 Processing payment ${paymentId}`);
  console.log(`   Amount: ${amountPaid} EUR`);
  console.log(`   Payment Intent: ${paymentIntentId}`);

  try {
    // 1. Mark payment as paid
    const payment = await QuotePaymentsService.markAsPaid(paymentId, paymentIntentId);
    console.log(`✅ Payment ${payment.label} marked as paid`);

    // 2. Get quote info
    const quote = await QuotesService.getById(payment.quote_id);
    if (!quote) {
      console.error('Quote not found for payment');
      return;
    }

    // 3. Get payment summary
    const summary = await QuotePaymentsService.getSummary(payment.quote_id);

    // 4. Create invoice for this payment
    const invoice = await InvoicesService.create({
      quote_id: quote.id,
      client_name: quote.client_name,
      client_email: quote.client_email,
      amount: payment.amount,
      vat_amount: 0, // TVA already included in payment amount
      total_amount: payment.amount,
      payment_method: 'stripe',
      stripe_payment_intent_id: paymentIntentId,
      notes: `${payment.label} - Devis ${quote.quote_number}`,
    });
    console.log(`✅ Invoice ${invoice.invoice_number} created`);

    // 5. Send confirmation email
    try {
      await sendPaymentConfirmationEmail(quote, payment, invoice, summary);
      await InvoicesService.markAsSent(invoice.id);
      console.log(`📧 Payment confirmation email sent to ${quote.client_email}`);
    } catch (emailError) {
      console.error('Error sending confirmation email:', emailError);
    }

  } catch (error) {
    console.error('Error handling payment completion:', error);
    throw error;
  }
}

async function handleLegacyQuotePayment(
  quoteId: string,
  paymentIntentId: string,
  amountPaid: number
) {
  console.log(`📝 Processing legacy payment for quote ${quoteId}`);
  console.log(`   Amount: ${amountPaid} EUR`);
  console.log(`   Payment Intent: ${paymentIntentId}`);

  try {
    // 1. Mark quote as paid
    const quote = await QuotesService.markAsPaid(quoteId, paymentIntentId, amountPaid);
    console.log(`✅ Quote ${quote.quote_number} marked as paid`);

    // 2. Create invoice
    const invoice = await InvoicesService.createFromQuote(quote, paymentIntentId);
    console.log(`✅ Invoice ${invoice.invoice_number} created`);

    // 3. Send invoice email
    try {
      await sendInvoiceEmail(quote, invoice);
      await InvoicesService.markAsSent(invoice.id);
      console.log(`📧 Invoice email sent to ${quote.client_email}`);
    } catch (emailError) {
      console.error('Error sending invoice email:', emailError);
    }

  } catch (error) {
    console.error('Error handling legacy checkout completion:', error);
    throw error;
  }
}
