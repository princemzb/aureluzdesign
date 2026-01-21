'use server';

import { revalidatePath } from 'next/cache';
import { TasksService, type PaginatedTasks, type TasksFilters, type CalendarTask } from '@/lib/services/tasks.service';
import type { Task, TaskWithClient, CreateTaskInput, UpdateTaskInput, TaskStatus, ActionResult } from '@/lib/types';

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
