import { createAdminClient } from '@/lib/supabase/server';
import type { Task, TaskWithClient, CreateTaskInput, UpdateTaskInput, TaskStatus, TaskPriority } from '@/lib/types';

export interface PaginatedTasks {
  tasks: Task[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface TasksFilters {
  client_id?: string;
  status?: TaskStatus | TaskStatus[];
  priority?: TaskPriority | TaskPriority[];
  search?: string;
  from_date?: string;
  to_date?: string;
  page?: number;
  pageSize?: number;
}

export interface CalendarTask {
  id: string;
  name: string;
  due_date: string;
  status: TaskStatus;
  priority: TaskPriority;
  client_id: string;
  client_name: string;
}

export class TasksService {
  /**
   * Récupère toutes les tâches avec filtres et pagination
   */
  static async getAll(filters: TasksFilters = {}): Promise<PaginatedTasks> {
    const supabase = createAdminClient();
    const { client_id, status, priority, search, from_date, to_date, page = 1, pageSize = 10 } = filters;

    const offset = (page - 1) * pageSize;

    let query = supabase
      .from('tasks')
      .select('*', { count: 'exact' });

    // Filtrer par client
    if (client_id) {
      query = query.eq('client_id', client_id);
    }

    // Filtrer par statut
    if (status) {
      if (Array.isArray(status)) {
        query = query.in('status', status);
      } else {
        query = query.eq('status', status);
      }
    }

    // Filtrer par priorité
    if (priority) {
      if (Array.isArray(priority)) {
        query = query.in('priority', priority);
      } else {
        query = query.eq('priority', priority);
      }
    }

    // Recherche
    if (search && search.trim()) {
      const searchTerm = `%${search.trim()}%`;
      query = query.or(`name.ilike.${searchTerm},description.ilike.${searchTerm},location.ilike.${searchTerm}`);
    }

    // Filtrer par plage de dates
    if (from_date) {
      query = query.gte('due_date', from_date);
    }
    if (to_date) {
      query = query.lte('due_date', to_date);
    }

    // Pagination et tri (priorité urgente en premier, puis par date)
    const { data, count, error } = await query
      .order('priority', { ascending: true }) // urgent < high < normal < low
      .order('due_date', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (error) {
      console.error('Error fetching tasks:', error);
      return {
        tasks: [],
        total: 0,
        page,
        pageSize,
        totalPages: 0,
      };
    }

    const total = count || 0;

    return {
      tasks: data || [],
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * Récupère les tâches d'un client
   */
  static async getByClientId(clientId: string): Promise<Task[]> {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('client_id', clientId)
      .order('priority', { ascending: true })
      .order('due_date', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching client tasks:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Récupère une tâche par son ID
   */
  static async getById(id: string): Promise<Task | null> {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching task:', error);
      return null;
    }

    return data;
  }

  /**
   * Récupère une tâche avec les infos du client
   */
  static async getByIdWithClient(id: string): Promise<TaskWithClient | null> {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('tasks')
      .select(`
        *,
        client:clients(*)
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching task with client:', error);
      return null;
    }

    return data;
  }

  /**
   * Crée une nouvelle tâche
   */
  static async create(input: CreateTaskInput): Promise<Task> {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('tasks')
      .insert({
        client_id: input.client_id,
        name: input.name,
        location: input.location || null,
        due_date: input.due_date || null,
        description: input.description || null,
        status: input.status || 'pending',
        priority: input.priority || 'normal',
        attachments: input.attachments || [],
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating task:', error);
      throw new Error(error.message);
    }

    return data;
  }

  /**
   * Met à jour une tâche
   */
  static async update(id: string, input: UpdateTaskInput): Promise<Task> {
    const supabase = createAdminClient();

    const updateData: Record<string, unknown> = {};

    if (input.name !== undefined) updateData.name = input.name;
    if (input.location !== undefined) updateData.location = input.location || null;
    if (input.due_date !== undefined) updateData.due_date = input.due_date || null;
    if (input.description !== undefined) updateData.description = input.description || null;
    if (input.status !== undefined) updateData.status = input.status;
    if (input.priority !== undefined) updateData.priority = input.priority;
    if (input.attachments !== undefined) updateData.attachments = input.attachments;

    const { data, error } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating task:', error);
      throw new Error(error.message);
    }

    return data;
  }

  /**
   * Met à jour le statut d'une tâche
   */
  static async updateStatus(id: string, status: TaskStatus): Promise<Task> {
    return this.update(id, { status });
  }

  /**
   * Supprime une tâche
   */
  static async delete(id: string): Promise<void> {
    const supabase = createAdminClient();

    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting task:', error);
      throw new Error(error.message);
    }
  }

  /**
   * Récupère les tâches pour le calendrier d'un client
   */
  static async getCalendarTasks(clientId: string, from: string, to: string): Promise<CalendarTask[]> {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('tasks')
      .select(`
        id,
        name,
        due_date,
        status,
        priority,
        client_id,
        client:clients(name)
      `)
      .eq('client_id', clientId)
      .gte('due_date', from)
      .lte('due_date', to)
      .not('due_date', 'is', null)
      .order('due_date');

    if (error) {
      console.error('Error fetching calendar tasks:', error);
      return [];
    }

    return (data || []).map(task => ({
      id: task.id,
      name: task.name,
      due_date: task.due_date!,
      status: task.status,
      priority: task.priority,
      client_id: task.client_id,
      client_name: (task.client as { name: string })?.name || '',
    }));
  }

  /**
   * Récupère les tâches à venir (toutes les tâches avec due_date dans le futur ou en retard)
   */
  static async getUpcomingTasks(limit: number = 5): Promise<TaskWithClient[]> {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('tasks')
      .select(`
        *,
        client:clients(*)
      `)
      .in('status', ['pending', 'in_progress'])
      .not('due_date', 'is', null)
      .order('due_date')
      .limit(limit);

    if (error) {
      console.error('Error fetching upcoming tasks:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Compte les tâches par statut pour un client
   */
  static async getTasksCountByStatus(clientId: string): Promise<Record<TaskStatus, number>> {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('tasks')
      .select('status')
      .eq('client_id', clientId);

    if (error) {
      console.error('Error fetching tasks count:', error);
      return {
        pending: 0,
        in_progress: 0,
        completed: 0,
        cancelled: 0,
      };
    }

    const counts: Record<TaskStatus, number> = {
      pending: 0,
      in_progress: 0,
      completed: 0,
      cancelled: 0,
    };

    (data || []).forEach(task => {
      counts[task.status as TaskStatus]++;
    });

    return counts;
  }
}
