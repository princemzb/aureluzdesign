import { createAdminClient } from '@/lib/supabase/server';
import type {
  QuotePayment,
  CreateQuotePaymentInput,
  UpdateQuotePaymentInput,
  QuotePaymentSummary,
  PaymentScheduleItem,
} from '@/lib/types';
import { getStripeClient } from '@/lib/stripe/client';

export class QuotePaymentsService {
  /**
   * Get all payments for a quote
   */
  static async getByQuoteId(quoteId: string): Promise<QuotePayment[]> {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('quote_payments')
      .select('*')
      .eq('quote_id', quoteId)
      .order('payment_number', { ascending: true });

    if (error) {
      console.error('Error fetching quote payments:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Get a payment by ID
   */
  static async getById(id: string): Promise<QuotePayment | null> {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('quote_payments')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching quote payment:', error);
      return null;
    }

    return data;
  }

  /**
   * Get a payment by its validation token (for public access)
   */
  static async getByToken(token: string): Promise<QuotePayment | null> {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('quote_payments')
      .select('*')
      .eq('validation_token', token)
      .single();

    if (error) {
      console.error('Error fetching payment by token:', error);
      return null;
    }

    return data;
  }

  /**
   * Create a new payment for a quote
   */
  static async create(input: CreateQuotePaymentInput): Promise<QuotePayment> {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('quote_payments')
      .insert({
        quote_id: input.quote_id,
        payment_number: input.payment_number,
        label: input.label,
        description: input.description || null,
        amount: input.amount,
        percentage: input.percentage || null,
        due_date: input.due_date || null,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating quote payment:', error);
      throw new Error('Erreur lors de la création de l\'échéance');
    }

    return data;
  }

  /**
   * Update a payment
   */
  static async update(id: string, input: UpdateQuotePaymentInput): Promise<QuotePayment> {
    const supabase = createAdminClient();

    const updateData: Record<string, unknown> = {};
    if (input.label !== undefined) updateData.label = input.label;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.amount !== undefined) updateData.amount = input.amount;
    if (input.percentage !== undefined) updateData.percentage = input.percentage;
    if (input.due_date !== undefined) updateData.due_date = input.due_date;
    if (input.status !== undefined) updateData.status = input.status;

    const { data, error } = await supabase
      .from('quote_payments')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating quote payment:', error);
      throw new Error('Erreur lors de la mise à jour de l\'échéance');
    }

    return data;
  }

  /**
   * Delete a payment
   */
  static async delete(id: string): Promise<void> {
    const supabase = createAdminClient();

    const { error } = await supabase
      .from('quote_payments')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting quote payment:', error);
      throw new Error('Erreur lors de la suppression de l\'échéance');
    }
  }

  /**
   * Create default payment schedule for a quote (deposit + balance)
   */
  static async createDefaultSchedule(quoteId: string): Promise<QuotePayment[]> {
    const supabase = createAdminClient();

    // Call the database function
    const { error } = await supabase.rpc('create_default_payment_schedule', {
      p_quote_id: quoteId,
    });

    if (error) {
      console.error('Error creating default payment schedule:', error);
      throw new Error('Erreur lors de la création de l\'échéancier');
    }

    return this.getByQuoteId(quoteId);
  }

  /**
   * Create custom payment schedule for a quote
   */
  static async createCustomSchedule(
    quoteId: string,
    quoteTotal: number,
    schedule: PaymentScheduleItem[]
  ): Promise<QuotePayment[]> {
    const supabase = createAdminClient();

    // Delete existing pending payments
    await supabase
      .from('quote_payments')
      .delete()
      .eq('quote_id', quoteId)
      .eq('status', 'pending');

    // Create new payments based on schedule
    const payments: QuotePayment[] = [];
    for (let i = 0; i < schedule.length; i++) {
      const item = schedule[i];
      const amount = Math.round((quoteTotal * item.percentage / 100) * 100) / 100;

      const { data, error } = await supabase
        .from('quote_payments')
        .insert({
          quote_id: quoteId,
          payment_number: i + 1,
          label: item.label,
          amount,
          percentage: item.percentage,
          status: 'pending',
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating payment installment:', error);
        throw new Error('Erreur lors de la création de l\'échéance');
      }

      payments.push(data);
    }

    return payments;
  }

  /**
   * Get payment summary for a quote
   */
  static async getSummary(quoteId: string): Promise<QuotePaymentSummary | null> {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('quote_payment_summary')
      .select('*')
      .eq('quote_id', quoteId)
      .single();

    if (error) {
      console.error('Error fetching payment summary:', error);
      return null;
    }

    return data;
  }

  /**
   * Mark payment as sent and generate validation token
   */
  static async markAsSent(paymentId: string): Promise<QuotePayment> {
    const supabase = createAdminClient();

    const newToken = crypto.randomUUID();

    const { data, error } = await supabase
      .from('quote_payments')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        validation_token: newToken,
      })
      .eq('id', paymentId)
      .select()
      .single();

    if (error) {
      console.error('Error marking payment as sent:', error);
      throw new Error('Erreur lors de l\'envoi de la demande de paiement');
    }

    return data;
  }

  /**
   * Create Stripe Checkout Session for a payment
   */
  static async createCheckoutSession(
    paymentId: string,
    successUrl: string,
    cancelUrl: string
  ): Promise<{ sessionId: string; url: string }> {
    const supabase = createAdminClient();

    // Get the payment with quote info
    const payment = await this.getById(paymentId);
    if (!payment) {
      throw new Error('Échéance non trouvée');
    }

    if (payment.status !== 'sent') {
      throw new Error('Cette échéance ne peut pas être payée dans son état actuel');
    }

    if (payment.paid_at) {
      throw new Error('Cette échéance a déjà été payée');
    }

    // Get quote info for the checkout
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select('quote_number, client_email, event_type')
      .eq('id', payment.quote_id)
      .single();

    if (quoteError || !quote) {
      throw new Error('Devis non trouvé');
    }

    const stripe = getStripeClient();

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: `${payment.label} - Devis ${quote.quote_number}`,
              description: payment.description || `${payment.label} (${payment.percentage}%)`,
            },
            unit_amount: Math.round(payment.amount * 100),
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: quote.client_email,
      metadata: {
        payment_id: paymentId,
        quote_id: payment.quote_id,
        quote_number: quote.quote_number,
        payment_label: payment.label,
      },
    });

    // Save session ID to payment
    await supabase
      .from('quote_payments')
      .update({ stripe_session_id: session.id })
      .eq('id', paymentId);

    return {
      sessionId: session.id,
      url: session.url!,
    };
  }

  /**
   * Mark payment as paid
   */
  static async markAsPaid(
    paymentId: string,
    paymentIntentId: string
  ): Promise<QuotePayment> {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('quote_payments')
      .update({
        status: 'paid',
        paid_at: new Date().toISOString(),
        stripe_payment_intent_id: paymentIntentId,
      })
      .eq('id', paymentId)
      .select()
      .single();

    if (error) {
      console.error('Error marking payment as paid:', error);
      throw new Error('Erreur lors de la mise à jour de l\'échéance');
    }

    // Check if all payments are done to update quote status
    const summary = await this.getSummary(data.quote_id);
    if (summary?.payment_status === 'fully_paid') {
      await supabase
        .from('quotes')
        .update({ status: 'accepted' })
        .eq('id', data.quote_id);
    }

    return data;
  }

  /**
   * Get next unpaid payment for a quote
   */
  static async getNextUnpaid(quoteId: string): Promise<QuotePayment | null> {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('quote_payments')
      .select('*')
      .eq('quote_id', quoteId)
      .in('status', ['pending', 'sent'])
      .order('payment_number', { ascending: true })
      .limit(1)
      .single();

    if (error) {
      return null;
    }

    return data;
  }

  /**
   * Recalculate payment amounts when quote total changes
   */
  static async recalculateAmounts(quoteId: string): Promise<QuotePayment[]> {
    const supabase = createAdminClient();

    // Get quote total
    const { data: quote } = await supabase
      .from('quotes')
      .select('total')
      .eq('id', quoteId)
      .single();

    if (!quote) {
      throw new Error('Devis non trouvé');
    }

    // Get all pending payments
    const payments = await this.getByQuoteId(quoteId);

    for (const payment of payments) {
      if (payment.status === 'pending' && payment.percentage) {
        const newAmount = Math.round(quote.total * payment.percentage / 100 * 100) / 100;
        await this.update(payment.id, { amount: newAmount });
      }
    }

    return this.getByQuoteId(quoteId);
  }
}
