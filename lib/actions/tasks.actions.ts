'use server';

import { revalidatePath } from 'next/cache';
import { TasksService, type PaginatedTasks, type TasksFilters, type CalendarTask } from '@/lib/services/tasks.service';
import type {
  Task,
  TaskWithClient,
  TaskWithDetails,
  TaskDetail,
  TaskSubtask,
  CreateTaskInput,
  UpdateTaskInput,
  CreateTaskDetailInput,
  UpdateTaskDetailInput,
  TaskStatus,
  ActionResult,
} from '@/lib/types';

/**
 * Récupère toutes les tâches avec filtres et pagination
 */
export async function getTasks(filters: TasksFilters = {}): Promise<PaginatedTasks> {
  return TasksService.getAll(filters);
}

/**
 * Récupère les tâches d'un client
 */
export async function getClientTasks(clientId: string): Promise<Task[]> {
  return TasksService.getByClientId(clientId);
}

/**
 * Récupère une tâche par son ID
 */
export async function getTask(id: string): Promise<Task | null> {
  return TasksService.getById(id);
}

/**
 * Récupère une tâche avec les infos du client
 */
export async function getTaskWithClient(id: string): Promise<TaskWithClient | null> {
  return TasksService.getByIdWithClient(id);
}

/**
 * Crée une nouvelle tâche
 */
export async function createTask(input: CreateTaskInput): Promise<ActionResult<Task>> {
  try {
    const task = await TasksService.create(input);
    revalidatePath('/admin/clients');
    revalidatePath(`/admin/clients/${input.client_id}`);
    return {
      success: true,
      data: task,
    };
  } catch (error) {
    console.error('Error in createTask action:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur lors de la création de la tâche',
    };
  }
}

/**
 * Met à jour une tâche
 */
export async function updateTask(id: string, input: UpdateTaskInput): Promise<ActionResult<Task>> {
  try {
    const task = await TasksService.update(id, input);
    revalidatePath('/admin/clients');
    revalidatePath(`/admin/clients/${task.client_id}`);
    return {
      success: true,
      data: task,
    };
  } catch (error) {
    console.error('Error in updateTask action:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur lors de la mise à jour de la tâche',
    };
  }
}

/**
 * Met à jour le statut d'une tâche
 */
export async function updateTaskStatus(id: string, status: TaskStatus): Promise<ActionResult<Task>> {
  try {
    const task = await TasksService.updateStatus(id, status);
    revalidatePath('/admin/clients');
    revalidatePath(`/admin/clients/${task.client_id}`);
    return {
      success: true,
      data: task,
    };
  } catch (error) {
    console.error('Error in updateTaskStatus action:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur lors de la mise à jour du statut',
    };
  }
}

/**
 * Supprime une tâche
 */
export async function deleteTask(id: string, clientId: string): Promise<ActionResult> {
  try {
    await TasksService.delete(id);
    revalidatePath('/admin/clients');
    revalidatePath(`/admin/clients/${clientId}`);
    return {
      success: true,
    };
  } catch (error) {
    console.error('Error in deleteTask action:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur lors de la suppression de la tâche',
    };
  }
}

/**
 * Récupère les tâches pour le calendrier d'un client
 */
export async function getCalendarTasks(clientId: string, from: string, to: string): Promise<CalendarTask[]> {
  return TasksService.getCalendarTasks(clientId, from, to);
}

/**
 * Récupère les tâches à venir
 */
export async function getUpcomingTasks(limit: number = 5): Promise<TaskWithClient[]> {
  return TasksService.getUpcomingTasks(limit);
}

/**
 * Compte les tâches par statut pour un client
 */
export async function getTasksCountByStatus(clientId: string): Promise<Record<TaskStatus, number>> {
  return TasksService.getTasksCountByStatus(clientId);
}

// ============================================
// Task Details Actions
// ============================================

/**
 * Récupère une tâche avec ses détails
 */
export async function getTaskWithDetails(id: string): Promise<TaskWithDetails | null> {
  return TasksService.getByIdWithDetails(id);
}

/**
 * Récupère une tâche avec client, détails et sous-tâches
 */
export async function getTaskWithClientAndDetails(id: string): Promise<(TaskWithClient & { details: TaskDetail[]; subtasks: TaskSubtask[] }) | null> {
  return TasksService.getByIdWithClientAndDetails(id);
}

/**
 * Met à jour le paramètre auto_complete d'une tâche
 */
export async function updateTaskAutoComplete(id: string, autoComplete: boolean): Promise<ActionResult<Task>> {
  try {
    const task = await TasksService.update(id, { auto_complete: autoComplete });
    revalidatePath(`/admin/tasks/${id}`);
    return {
      success: true,
      data: task,
    };
  } catch (error) {
    console.error('Error in updateTaskAutoComplete action:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur lors de la mise à jour',
    };
  }
}

/**
 * Ajoute un détail à une tâche
 */
export async function addTaskDetail(input: CreateTaskDetailInput): Promise<ActionResult<TaskDetail>> {
  try {
    const detail = await TasksService.addDetail(input);
    revalidatePath(`/admin/tasks/${input.task_id}`);
    return {
      success: true,
      data: detail,
    };
  } catch (error) {
    console.error('Error in addTaskDetail action:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur lors de l\'ajout du détail',
    };
  }
}

/**
 * Met à jour un détail de tâche
 */
export async function updateTaskDetail(id: string, taskId: string, input: UpdateTaskDetailInput): Promise<ActionResult<TaskDetail>> {
  try {
    const detail = await TasksService.updateDetail(id, input);
    revalidatePath(`/admin/tasks/${taskId}`);
    return {
      success: true,
      data: detail,
    };
  } catch (error) {
    console.error('Error in updateTaskDetail action:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur lors de la mise à jour du détail',
    };
  }
}

/**
 * Supprime un détail de tâche
 */
export async function deleteTaskDetail(id: string, taskId: string): Promise<ActionResult> {
  try {
    await TasksService.deleteDetail(id);
    revalidatePath(`/admin/tasks/${taskId}`);
    return {
      success: true,
    };
  } catch (error) {
    console.error('Error in deleteTaskDetail action:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur lors de la suppression du détail',
    };
  }
}

/**
 * Récupère les détails d'une tâche
 */
export async function getTaskDetails(taskId: string): Promise<TaskDetail[]> {
  return TasksService.getDetails(taskId);
}
