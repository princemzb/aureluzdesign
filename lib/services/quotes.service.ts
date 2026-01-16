import { createAdminClient } from '@/lib/supabase/server';
import type { Quote, QuoteItem, CreateQuoteInput, UpdateQuoteInput, QuoteStatus } from '@/lib/types';
import { getStripeClient } from '@/lib/stripe/client';
import { QuotePaymentsService } from './quote-payments.service';

export class QuotesService {
  // Générer un ID unique pour les items
  private static generateItemId(): string {
    return Math.random().toString(36).substring(2, 11);
  }

  // Calculer les totaux
  private static calculateTotals(
    items: Omit<QuoteItem, 'id' | 'total'>[],
    vatRate: number
  ): { items: QuoteItem[]; subtotal: number; vatAmount: number; total: number } {
    const processedItems: QuoteItem[] = items.map((item) => ({
      ...item,
      id: this.generateItemId(),
      total: item.quantity * item.unit_price,
    }));

    const subtotal = processedItems.reduce((sum, item) => sum + item.total, 0);
    const vatAmount = subtotal * (vatRate / 100);
    const total = subtotal + vatAmount;

    return {
      items: processedItems,
      subtotal: Math.round(subtotal * 100) / 100,
      vatAmount: Math.round(vatAmount * 100) / 100,
      total: Math.round(total * 100) / 100,
    };
  }

  static async getAll(): Promise<Quote[]> {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('quotes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching quotes:', error);
      return [];
    }

    return data || [];
  }

  static async getById(id: string): Promise<Quote | null> {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('quotes')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching quote:', error);
      return null;
    }

    return data;
  }

  static async create(input: CreateQuoteInput): Promise<Quote> {
    const supabase = createAdminClient();

    const { items, subtotal, vatAmount, total } = this.calculateTotals(
      input.items,
      input.vat_rate
    );

    // Échéancier par défaut si non fourni
    const defaultSchedule = [
      { label: 'Acompte', percentage: 30 },
      { label: 'Solde', percentage: 70 },
    ];

    const { data, error } = await supabase
      .from('quotes')
      .insert({
        client_name: input.client_name,
        client_email: input.client_email,
        client_phone: input.client_phone || null,
        event_date: input.event_date || null,
        event_type: input.event_type || null,
        items,
        vat_rate: input.vat_rate,
        subtotal,
        vat_amount: vatAmount,
        total,
        notes: input.notes || null,
        validity_days: input.validity_days || 30,
        status: 'draft',
        deposit_percent: input.deposit_percent || input.payment_schedule?.[0]?.percentage || 30,
        payment_schedule: input.payment_schedule || defaultSchedule,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating quote:', error);
      throw new Error('Erreur lors de la création du devis');
    }

    return data;
  }

  static async update(id: string, input: UpdateQuoteInput): Promise<Quote> {
    const supabase = createAdminClient();

    const updateData: Record<string, unknown> = {};

    if (input.client_name) updateData.client_name = input.client_name;
    if (input.client_email) updateData.client_email = input.client_email;
    if (input.client_phone !== undefined) updateData.client_phone = input.client_phone || null;
    if (input.event_date !== undefined) updateData.event_date = input.event_date || null;
    if (input.event_type !== undefined) updateData.event_type = input.event_type || null;
    if (input.notes !== undefined) updateData.notes = input.notes || null;
    if (input.validity_days) updateData.validity_days = input.validity_days;
    if (input.status) updateData.status = input.status;
    if (input.deposit_percent !== undefined) updateData.deposit_percent = input.deposit_percent;
    if (input.payment_schedule) updateData.payment_schedule = input.payment_schedule;

    // Invalidate payment link when quote content is modified
    // (status changes don't invalidate, only content changes)
    const contentChanged = input.client_name || input.client_email || input.items ||
                           input.vat_rate !== undefined || input.notes !== undefined ||
                           input.event_date !== undefined || input.event_type !== undefined;
    if (contentChanged && !input.status) {
      updateData.validation_token = null; // Invalidate old link
      updateData.status = 'draft'; // Reset to draft when content changes
    }

    // Recalculer les totaux si les items ou le taux de TVA changent
    if (input.items || input.vat_rate !== undefined) {
      const currentQuote = await this.getById(id);
      if (!currentQuote) throw new Error('Devis non trouvé');

      const itemsToUse = input.items || currentQuote.items;
      const vatRateToUse = input.vat_rate ?? currentQuote.vat_rate;

      const { items, subtotal, vatAmount, total } = this.calculateTotals(
        itemsToUse,
        vatRateToUse
      );

      updateData.items = items;
      updateData.vat_rate = vatRateToUse;
      updateData.subtotal = subtotal;
      updateData.vat_amount = vatAmount;
      updateData.total = total;
    }

    const { data, error } = await supabase
      .from('quotes')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating quote:', error);
      throw new Error('Erreur lors de la mise à jour du devis');
    }

    return data;
  }

  static async delete(id: string): Promise<void> {
    const supabase = createAdminClient();

    const { error } = await supabase.from('quotes').delete().eq('id', id);

    if (error) {
      console.error('Error deleting quote:', error);
      throw new Error('Erreur lors de la suppression du devis');
    }
  }

  static async markAsSent(id: string): Promise<Quote> {
    const supabase = createAdminClient();

    const quote = await this.getById(id);
    if (!quote) throw new Error('Devis non trouvé');

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + quote.validity_days);

    // Generate new validation token each time quote is sent
    // This ensures modified quotes get a new link
    const newToken = crypto.randomUUID();

    const { data, error } = await supabase
      .from('quotes')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
        validation_token: newToken, // New token = new payment link
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error marking quote as sent:', error);
      throw new Error('Erreur lors de la mise à jour du statut');
    }

    // Create payment schedule based on quote's custom schedule
    try {
      const existingPayments = await QuotePaymentsService.getByQuoteId(id);
      if (existingPayments.length === 0) {
        // Use custom schedule if defined, otherwise use default
        if (quote.payment_schedule && quote.payment_schedule.length > 0) {
          await QuotePaymentsService.createCustomSchedule(id, quote.total, quote.payment_schedule);
        } else {
          await QuotePaymentsService.createDefaultSchedule(id);
        }
      }
    } catch (paymentError) {
      console.error('Error creating payment schedule:', paymentError);
      // Don't fail the whole operation if payment schedule creation fails
    }

    return data;
  }

  static async updateStatus(id: string, status: QuoteStatus): Promise<Quote> {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('quotes')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating quote status:', error);
      throw new Error('Erreur lors de la mise à jour du statut');
    }

    return data;
  }

  static async getStats(): Promise<{
    total: number;
    draft: number;
    sent: number;
    accepted: number;
    paid: number;
    totalRevenue: number;
  }> {
    const supabase = createAdminClient();

    const { data, error } = await supabase.from('quotes').select('status, total');

    if (error) {
      console.error('Error fetching quote stats:', error);
      return { total: 0, draft: 0, sent: 0, accepted: 0, paid: 0, totalRevenue: 0 };
    }

    const stats = {
      total: data.length,
      draft: data.filter((q) => q.status === 'draft').length,
      sent: data.filter((q) => q.status === 'sent').length,
      accepted: data.filter((q) => q.status === 'accepted').length,
      paid: data.filter((q) => q.status === 'paid').length,
      // Revenue counts both accepted and paid quotes
      totalRevenue: data
        .filter((q) => q.status === 'accepted' || q.status === 'paid')
        .reduce((sum, q) => sum + (q.total || 0), 0),
    };

    return stats;
  }

  // ============================================
  // Payment-related methods
  // ============================================

  /**
   * Get a quote by its validation token (for public access)
   */
  static async getByToken(token: string): Promise<Quote | null> {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('quotes')
      .select('*')
      .eq('validation_token', token)
      .single();

    if (error) {
      console.error('Error fetching quote by token:', error);
      return null;
    }

    return data;
  }

  /**
   * Mark a quote as accepted by the client
   */
  static async markAsAccepted(id: string): Promise<Quote> {
    const supabase = createAdminClient();

    const quote = await this.getById(id);
    if (!quote) {
      throw new Error('Devis non trouvé');
    }

    if (quote.status !== 'sent') {
      throw new Error('Ce devis ne peut pas être accepté dans son état actuel');
    }

    const { data, error } = await supabase
      .from('quotes')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error marking quote as accepted:', error);
      throw new Error('Erreur lors de l\'acceptation du devis');
    }

    return data;
  }

  /**
   * Create a Stripe Checkout Session for quote deposit payment
   */
  static async createCheckoutSession(
    quoteId: string,
    successUrl: string,
    cancelUrl: string
  ): Promise<{ sessionId: string; url: string }> {
    const quote = await this.getById(quoteId);
    if (!quote) {
      throw new Error('Devis non trouvé');
    }

    if (quote.status !== 'accepted') {
      throw new Error('Le devis doit être accepté avant de pouvoir être payé');
    }

    if (quote.paid_at) {
      throw new Error('Ce devis a déjà été payé');
    }

    const depositAmount = quote.deposit_amount || Math.round(quote.total * (quote.deposit_percent || 30) / 100);

    // Amount in cents for Stripe
    const amountInCents = Math.round(depositAmount * 100);

    const stripe = getStripeClient();

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: `Acompte Devis ${quote.quote_number}`,
              description: `Acompte de ${quote.deposit_percent}% pour ${quote.event_type || 'Décoration événementielle'}`,
            },
            unit_amount: amountInCents,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: quote.client_email,
      metadata: {
        quote_id: quoteId,
        quote_number: quote.quote_number,
        client_name: quote.client_name,
      },
    });

    // Save session ID to quote
    const supabase = createAdminClient();
    await supabase
      .from('quotes')
      .update({ stripe_session_id: session.id })
      .eq('id', quoteId);

    return {
      sessionId: session.id,
      url: session.url!,
    };
  }

  /**
   * Mark a quote as paid after successful Stripe payment
   */
  static async markAsPaid(
    quoteId: string,
    paymentIntentId: string,
    paidAmount: number
  ): Promise<Quote> {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('quotes')
      .update({
        status: 'paid',
        stripe_payment_intent_id: paymentIntentId,
        paid_at: new Date().toISOString(),
        paid_amount: paidAmount,
      })
      .eq('id', quoteId)
      .select()
      .single();

    if (error) {
      console.error('Error marking quote as paid:', error);
      throw new Error('Erreur lors de la mise à jour du devis');
    }

    return data;
  }

  /**
   * Update deposit percentage for a quote
   */
  static async updateDepositPercent(id: string, depositPercent: number): Promise<Quote> {
    const supabase = createAdminClient();

    if (depositPercent < 0 || depositPercent > 100) {
      throw new Error('Le pourcentage d\'acompte doit être entre 0 et 100');
    }

    const { data, error } = await supabase
      .from('quotes')
      .update({ deposit_percent: depositPercent })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating deposit percent:', error);
      throw new Error('Erreur lors de la mise à jour du pourcentage d\'acompte');
    }

    return data;
  }
}
