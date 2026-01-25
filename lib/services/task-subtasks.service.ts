import { createAdminClient } from '@/lib/supabase/server';
import type {
  TaskSubtask,
  CreateTaskSubtaskInput,
  UpdateTaskSubtaskInput,
} from '@/lib/types';

export class TaskSubtasksService {
  /**
   * Récupère les sous-tâches d'une tâche
   */
  static async getByTaskId(taskId: string): Promise<TaskSubtask[]> {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('task_subtasks')
      .select('*')
      .eq('task_id', taskId)
      .order('position', { ascending: true });

    if (error) {
      console.error('Error fetching task subtasks:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Crée une nouvelle sous-tâche
   */
  static async create(input: CreateTaskSubtaskInput): Promise<TaskSubtask> {
    const supabase = createAdminClient();

    // Récupérer la position max actuelle
    const { data: existing } = await supabase
      .from('task_subtasks')
      .select('position')
      .eq('task_id', input.task_id)
      .order('position', { ascending: false })
      .limit(1);

    const nextPosition = existing && existing.length > 0
      ? existing[0].position + 1
      : 0;

    const { data, error } = await supabase
      .from('task_subtasks')
      .insert({
        task_id: input.task_id,
        content: input.content,
        position: input.position ?? nextPosition,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating task subtask:', error);
      throw new Error(error.message);
    }

    return data;
  }

  /**
   * Met à jour une sous-tâche
   */
  static async update(id: string, input: UpdateTaskSubtaskInput): Promise<TaskSubtask> {
    const supabase = createAdminClient();

    const updateData: Record<string, unknown> = {};

    if (input.content !== undefined) updateData.content = input.content;
    if (input.is_completed !== undefined) updateData.is_completed = input.is_completed;
    if (input.position !== undefined) updateData.position = input.position;

    const { data, error } = await supabase
      .from('task_subtasks')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating task subtask:', error);
      throw new Error(error.message);
    }

    return data;
  }

  /**
   * Supprime une sous-tâche
   */
  static async delete(id: string): Promise<void> {
    const supabase = createAdminClient();

    const { error } = await supabase
      .from('task_subtasks')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting task subtask:', error);
      throw new Error(error.message);
    }
  }

  /**
   * Toggle le statut completed d'une sous-tâche
   */
  static async toggle(id: string): Promise<TaskSubtask> {
    const supabase = createAdminClient();

    // Récupérer l'état actuel
    const { data: current, error: fetchError } = await supabase
      .from('task_subtasks')
      .select('is_completed')
      .eq('id', id)
      .single();

    if (fetchError || !current) {
      console.error('Error fetching task subtask:', fetchError);
      throw new Error(fetchError?.message || 'Subtask not found');
    }

    // Inverser l'état
    const { data, error } = await supabase
      .from('task_subtasks')
      .update({ is_completed: !current.is_completed })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error toggling task subtask:', error);
      throw new Error(error.message);
    }

    return data;
  }

  /**
   * Réordonne les sous-tâches
   */
  static async reorder(taskId: string, subtaskIds: string[]): Promise<void> {
    const supabase = createAdminClient();

    // Mettre à jour les positions en batch
    const updates = subtaskIds.map((id, index) => ({
      id,
      task_id: taskId,
      position: index,
    }));

    for (const update of updates) {
      const { error } = await supabase
        .from('task_subtasks')
        .update({ position: update.position })
        .eq('id', update.id)
        .eq('task_id', taskId);

      if (error) {
        console.error('Error reordering subtask:', error);
        throw new Error(error.message);
      }
    }
  }

  /**
   * Calcule la progression d'une tâche (sous-tâches complétées / total)
   */
  static async getProgress(taskId: string): Promise<{ completed: number; total: number }> {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('task_subtasks')
      .select('is_completed')
      .eq('task_id', taskId);

    if (error) {
      console.error('Error fetching subtasks progress:', error);
      return { completed: 0, total: 0 };
    }

    const total = data?.length || 0;
    const completed = data?.filter(s => s.is_completed).length || 0;

    return { completed, total };
  }

  /**
   * Met à jour le statut de la tâche en fonction des sous-tâches
   * - pending → in_progress : quand une sous-tâche est cochée
   * - in_progress → completed : quand toutes les sous-tâches sont cochées (si auto_complete)
   * - completed → in_progress : quand une sous-tâche est décochée
   *
   * @returns 'completed' | 'in_progress' | null selon le changement effectué
   */
  static async updateTaskStatusFromSubtasks(taskId: string): Promise<'completed' | 'in_progress' | null> {
    const supabase = createAdminClient();

    // Récupérer la tâche
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('auto_complete, status')
      .eq('id', taskId)
      .single();

    if (taskError || !task) {
      return null;
    }

    // Récupérer la progression
    const { completed, total } = await this.getProgress(taskId);

    // Si pas de sous-tâches, ne rien faire
    if (total === 0) {
      return null;
    }

    const allCompleted = completed === total;
    const someCompleted = completed > 0;

    // Cas 1: Toutes les sous-tâches complétées → passer en "completed" (si auto_complete)
    if (allCompleted && task.auto_complete && task.status !== 'completed') {
      await supabase
        .from('tasks')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', taskId);
      return 'completed';
    }

    // Cas 2: Sous-tâche décochée alors que la tâche était "completed" → repasser en "in_progress"
    if (!allCompleted && task.status === 'completed') {
      await supabase
        .from('tasks')
        .update({ status: 'in_progress', completed_at: null })
        .eq('id', taskId);
      return 'in_progress';
    }

    // Cas 3: Une sous-tâche cochée alors que la tâche était "pending" → passer en "in_progress"
    if (someCompleted && task.status === 'pending') {
      await supabase
        .from('tasks')
        .update({ status: 'in_progress' })
        .eq('id', taskId);
      return 'in_progress';
    }

    return null;
  }

  /**
   * Alias pour compatibilité - vérifie et met à jour le statut
   * @deprecated Utiliser updateTaskStatusFromSubtasks à la place
   */
  static async checkAutoComplete(taskId: string): Promise<boolean> {
    const result = await this.updateTaskStatusFromSubtasks(taskId);
    return result === 'completed';
  }
}
