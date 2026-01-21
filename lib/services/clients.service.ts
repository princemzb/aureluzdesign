import { createAdminClient } from '@/lib/supabase/server';
import type { Client, ClientWithStats, CreateClientInput, UpdateClientInput } from '@/lib/types';

export interface PaginatedClients {
  clients: ClientWithStats[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ClientsFilters {
  search?: string;
  page?: number;
  pageSize?: number;
}

export class ClientsService {
  /**
   * Récupère tous les clients avec pagination et recherche
   */
  static async getAll(filters: ClientsFilters = {}): Promise<PaginatedClients> {
    const supabase = createAdminClient();
    const { search, page = 1, pageSize = 10 } = filters;

    // Calculer l'offset pour la pagination
    const offset = (page - 1) * pageSize;

    // Requête de base
    let query = supabase
      .from('clients')
      .select('*', { count: 'exact' });

    // Appliquer la recherche si présente
    if (search && search.trim()) {
      const searchTerm = `%${search.trim()}%`;
      query = query.or(`name.ilike.${searchTerm},email.ilike.${searchTerm},company.ilike.${searchTerm}`);
    }

    // Appliquer la pagination et le tri
    const { data: clients, count, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (error) {
      console.error('Error fetching clients:', error);
      return {
        clients: [],
        total: 0,
        page,
        pageSize,
        totalPages: 0,
      };
    }

    // Récupérer les stats pour chaque client
    const clientsWithStats = await Promise.all(
      (clients || []).map(async (client) => {
        const stats = await this.getClientStats(client.id);
        return {
          ...client,
          ...stats,
        };
      })
    );

    const total = count || 0;

    return {
      clients: clientsWithStats,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * Récupère les statistiques d'un client (nombre de devis, tâches, montant total)
   */
  static async getClientStats(clientId: string): Promise<{
    quotes_count: number;
    tasks_count: number;
    total_amount: number;
    pending_tasks: number;
  }> {
    const supabase = createAdminClient();

    // Compter les devis et calculer le montant total
    const { data: quotes, error: quotesError } = await supabase
      .from('quotes')
      .select('id, total, status')
      .eq('client_id', clientId);

    if (quotesError) {
      console.error('Error fetching client quotes:', quotesError);
    }

    const quotes_count = quotes?.length || 0;
    const total_amount = quotes?.reduce((sum, q) => sum + (q.total || 0), 0) || 0;

    // Compter les tâches
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('id, status')
      .eq('client_id', clientId);

    if (tasksError) {
      console.error('Error fetching client tasks:', tasksError);
    }

    const tasks_count = tasks?.length || 0;
    const pending_tasks = tasks?.filter(t => t.status === 'pending' || t.status === 'in_progress').length || 0;

    return {
      quotes_count,
      tasks_count,
      total_amount,
      pending_tasks,
    };
  }

  /**
   * Récupère un client par son ID
   */
  static async getById(id: string): Promise<Client | null> {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching client:', error);
      return null;
    }

    return data;
  }

  /**
   * Récupère un client par son email
   */
  static async getByEmail(email: string): Promise<Client | null> {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('email', email)
      .single();

    if (error) {
      // PGRST116 = no rows returned - c'est normal si le client n'existe pas
      if (error.code !== 'PGRST116') {
        console.error('Error fetching client by email:', error);
      }
      return null;
    }

    return data;
  }

  /**
   * Crée un nouveau client
   */
  static async create(input: CreateClientInput): Promise<Client> {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('clients')
      .insert({
        name: input.name,
        email: input.email,
        phone: input.phone || null,
        address: input.address || null,
        company: input.company || null,
        notes: input.notes || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating client:', error);
      throw new Error(error.message);
    }

    return data;
  }

  /**
   * Met à jour un client
   */
  static async update(id: string, input: UpdateClientInput): Promise<Client> {
    const supabase = createAdminClient();

    const updateData: Record<string, unknown> = {};

    if (input.name !== undefined) updateData.name = input.name;
    if (input.email !== undefined) updateData.email = input.email;
    if (input.phone !== undefined) updateData.phone = input.phone || null;
    if (input.address !== undefined) updateData.address = input.address || null;
    if (input.company !== undefined) updateData.company = input.company || null;
    if (input.notes !== undefined) updateData.notes = input.notes || null;

    const { data, error } = await supabase
      .from('clients')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating client:', error);
      throw new Error(error.message);
    }

    return data;
  }

  /**
   * Supprime un client et toutes ses données associées
   * - Les tâches, devis et factures sont supprimés en CASCADE
   * - Les RDV doivent être supprimés manuellement (liés par email)
   */
  static async delete(id: string): Promise<void> {
    const supabase = createAdminClient();

    // Récupérer l'email du client pour supprimer les RDV
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('email')
      .eq('id', id)
      .single();

    if (clientError || !client) {
      throw new Error('Client non trouvé');
    }

    // Supprimer les RDV liés à cet email
    const { error: appointmentsError } = await supabase
      .from('appointments')
      .delete()
      .eq('client_email', client.email);

    if (appointmentsError) {
      console.error('Error deleting client appointments:', appointmentsError);
      // On continue quand même pour supprimer le client
    }

    // Supprimer le client (CASCADE supprimera: tâches, devis, factures)
    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting client:', error);
      throw new Error(error.message);
    }
  }

  /**
   * Recherche de clients pour l'autocomplétion
   */
  static async search(query: string, limit: number = 10): Promise<Client[]> {
    const supabase = createAdminClient();

    if (!query || query.trim().length < 2) {
      return [];
    }

    const searchTerm = `%${query.trim()}%`;

    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .or(`name.ilike.${searchTerm},email.ilike.${searchTerm}`)
      .order('name')
      .limit(limit);

    if (error) {
      console.error('Error searching clients:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Récupère tous les clients pour un sélecteur (sans pagination)
   */
  static async getAllForSelect(): Promise<Pick<Client, 'id' | 'name' | 'email'>[]> {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('clients')
      .select('id, name, email')
      .order('name');

    if (error) {
      console.error('Error fetching clients for select:', error);
      return [];
    }

    return data || [];
  }
}
