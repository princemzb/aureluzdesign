import { createAdminClient } from '@/lib/supabase/server';
import type { Quote, QuoteItem, CreateQuoteInput, UpdateQuoteInput, QuoteStatus } from '@/lib/types';

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

    const { data, error } = await supabase
      .from('quotes')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error marking quote as sent:', error);
      throw new Error('Erreur lors de la mise à jour du statut');
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
    totalRevenue: number;
  }> {
    const supabase = createAdminClient();

    const { data, error } = await supabase.from('quotes').select('status, total');

    if (error) {
      console.error('Error fetching quote stats:', error);
      return { total: 0, draft: 0, sent: 0, accepted: 0, totalRevenue: 0 };
    }

    const stats = {
      total: data.length,
      draft: data.filter((q) => q.status === 'draft').length,
      sent: data.filter((q) => q.status === 'sent').length,
      accepted: data.filter((q) => q.status === 'accepted').length,
      totalRevenue: data
        .filter((q) => q.status === 'accepted')
        .reduce((sum, q) => sum + (q.total || 0), 0),
    };

    return stats;
  }
}
