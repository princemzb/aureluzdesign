'use server';

import { revalidatePath } from 'next/cache';
import { TaskSubtasksService } from '@/lib/services/task-subtasks.service';
import type {
  TaskSubtask,
  CreateTaskSubtaskInput,
  UpdateTaskSubtaskInput,
  ActionResult,
} from '@/lib/types';

/**
 * Récupère les sous-tâches d'une tâche
 */
export async function getTaskSubtasks(taskId: string): Promise<TaskSubtask[]> {
  return TaskSubtasksService.getByTaskId(taskId);
}

/**
 * Crée une nouvelle sous-tâche
 */
export async function createTaskSubtask(
  input: CreateTaskSubtaskInput
): Promise<ActionResult<TaskSubtask>> {
  try {
    const subtask = await TaskSubtasksService.create(input);
    revalidatePath(`/admin/tasks/${input.task_id}`);
    return {
      success: true,
      data: subtask,
    };
  } catch (error) {
    console.error('Error in createTaskSubtask action:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur lors de la création',
    };
  }
}

/**
 * Met à jour une sous-tâche
 */
export async function updateTaskSubtask(
  id: string,
  taskId: string,
  input: UpdateTaskSubtaskInput
): Promise<ActionResult<TaskSubtask>> {
  try {
    const subtask = await TaskSubtasksService.update(id, input);

    // Vérifier l'auto-completion si on change is_completed
    if (input.is_completed !== undefined) {
      await TaskSubtasksService.checkAutoComplete(taskId);
    }

    revalidatePath(`/admin/tasks/${taskId}`);
    return {
      success: true,
      data: subtask,
    };
  } catch (error) {
    console.error('Error in updateTaskSubtask action:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur lors de la mise à jour',
    };
  }
}

/**
 * Toggle le statut d'une sous-tâche
 */
export async function toggleTaskSubtask(
  id: string,
  taskId: string
): Promise<ActionResult<TaskSubtask & { _taskStatusChanged?: 'completed' | 'in_progress' | null }>> {
  try {
    const subtask = await TaskSubtasksService.toggle(id);

    // Mettre à jour le statut de la tâche en fonction des sous-tâches
    const taskStatusChanged = await TaskSubtasksService.updateTaskStatusFromSubtasks(taskId);

    revalidatePath(`/admin/tasks/${taskId}`);
    revalidatePath(`/admin/clients`);
    return {
      success: true,
      data: { ...subtask, _taskStatusChanged: taskStatusChanged },
    };
  } catch (error) {
    console.error('Error in toggleTaskSubtask action:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur lors du toggle',
    };
  }
}

/**
 * Supprime une sous-tâche
 */
export async function deleteTaskSubtask(
  id: string,
  taskId: string
): Promise<ActionResult> {
  try {
    await TaskSubtasksService.delete(id);
    revalidatePath(`/admin/tasks/${taskId}`);
    return {
      success: true,
    };
  } catch (error) {
    console.error('Error in deleteTaskSubtask action:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur lors de la suppression',
    };
  }
}

/**
 * Réordonne les sous-tâches
 */
export async function reorderTaskSubtasks(
  taskId: string,
  subtaskIds: string[]
): Promise<ActionResult> {
  try {
    await TaskSubtasksService.reorder(taskId, subtaskIds);
    revalidatePath(`/admin/tasks/${taskId}`);
    return {
      success: true,
    };
  } catch (error) {
    console.error('Error in reorderTaskSubtasks action:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur lors de la réorganisation',
    };
  }
}

/**
 * Récupère la progression d'une tâche
 */
export async function getTaskProgress(
  taskId: string
): Promise<{ completed: number; total: number }> {
  return TaskSubtasksService.getProgress(taskId);
}
