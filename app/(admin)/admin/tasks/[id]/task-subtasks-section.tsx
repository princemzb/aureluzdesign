'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Plus,
  Trash2,
  Loader2,
  CheckSquare,
  GripVertical,
  Save,
  X,
  ListChecks,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils/cn';
import {
  createTaskSubtask,
  toggleTaskSubtask,
  deleteTaskSubtask,
  reorderTaskSubtasks,
} from '@/lib/actions/task-subtasks.actions';
import type { TaskSubtask } from '@/lib/types';

interface TaskSubtasksSectionProps {
  taskId: string;
  initialSubtasks: TaskSubtask[];
  autoComplete: boolean;
  onAutoCompleteChange: (value: boolean) => Promise<void>;
}

interface SortableSubtaskProps {
  subtask: TaskSubtask;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  isDeleting: boolean;
  isToggling: boolean;
}

function SortableSubtask({
  subtask,
  onToggle,
  onDelete,
  isDeleting,
  isToggling,
}: SortableSubtaskProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: subtask.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group flex items-center gap-3 bg-background border rounded-lg p-3 transition-all',
        isDragging && 'shadow-lg opacity-90 z-10',
        subtask.is_completed && 'bg-muted/30'
      )}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground touch-none"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      {/* Checkbox */}
      <button
        onClick={() => onToggle(subtask.id)}
        disabled={isToggling}
        className={cn(
          'flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors',
          subtask.is_completed
            ? 'bg-primary border-primary text-primary-foreground'
            : 'border-muted-foreground/40 hover:border-primary'
        )}
      >
        {isToggling ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : subtask.is_completed ? (
          <CheckSquare className="h-3 w-3" />
        ) : null}
      </button>

      {/* Content */}
      <span
        className={cn(
          'flex-1 text-sm transition-colors',
          subtask.is_completed && 'text-muted-foreground line-through'
        )}
      >
        {subtask.content}
      </span>

      {/* Delete button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onDelete(subtask.id)}
        disabled={isDeleting}
        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
      >
        {isDeleting ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Trash2 className="h-3.5 w-3.5" />
        )}
      </Button>
    </div>
  );
}

export function TaskSubtasksSection({
  taskId,
  initialSubtasks,
  autoComplete,
  onAutoCompleteChange,
}: TaskSubtasksSectionProps) {
  const router = useRouter();
  const [subtasks, setSubtasks] = useState<TaskSubtask[]>(initialSubtasks);
  const [isAdding, setIsAdding] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [isAutoCompleteUpdating, setIsAutoCompleteUpdating] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const completedCount = subtasks.filter((s) => s.is_completed).length;
  const totalCount = subtasks.length;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;

      if (over && active.id !== over.id) {
        const oldIndex = subtasks.findIndex((s) => s.id === active.id);
        const newIndex = subtasks.findIndex((s) => s.id === over.id);
        const newOrder = arrayMove(subtasks, oldIndex, newIndex);

        setSubtasks(newOrder);

        // Update server
        await reorderTaskSubtasks(
          taskId,
          newOrder.map((s) => s.id)
        );
      }
    },
    [subtasks, taskId]
  );

  const handleAdd = async () => {
    if (!newContent.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const result = await createTaskSubtask({
        task_id: taskId,
        content: newContent.trim(),
      });
      if (result.success && result.data) {
        setSubtasks([...subtasks, result.data]);
        setNewContent('');
        setIsAdding(false);
        router.refresh();
      }
    } catch (error) {
      console.error('Error adding subtask:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggle = async (id: string) => {
    if (togglingId) return;

    setTogglingId(id);
    try {
      const result = await toggleTaskSubtask(id, taskId);
      if (result.success && result.data) {
        setSubtasks(
          subtasks.map((s) =>
            s.id === id ? { ...s, is_completed: result.data!.is_completed } : s
          )
        );
        router.refresh();
      }
    } catch (error) {
      console.error('Error toggling subtask:', error);
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (deletingId) return;

    setDeletingId(id);
    try {
      const result = await deleteTaskSubtask(id, taskId);
      if (result.success) {
        setSubtasks(subtasks.filter((s) => s.id !== id));
        router.refresh();
      }
    } catch (error) {
      console.error('Error deleting subtask:', error);
    } finally {
      setDeletingId(null);
    }
  };

  const handleAutoCompleteChange = async (value: boolean) => {
    setIsAutoCompleteUpdating(true);
    try {
      await onAutoCompleteChange(value);
      router.refresh();
    } finally {
      setIsAutoCompleteUpdating(false);
    }
  };

  const handleCancel = () => {
    setNewContent('');
    setIsAdding(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAdd();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  return (
    <div className="bg-background rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-medium text-foreground flex items-center gap-2">
            <ListChecks className="h-4 w-4" />
            Checklist
            {totalCount > 0 && (
              <span className="text-muted-foreground font-normal">
                ({completedCount}/{totalCount})
              </span>
            )}
          </h2>
          {!isAdding && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAdding(true)}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Ajouter
            </Button>
          )}
        </div>

        {/* Progress bar */}
        {totalCount > 0 && (
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full transition-all duration-300',
                progressPercent === 100 ? 'bg-green-500' : 'bg-primary'
              )}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}
      </div>

      <div className="p-4 space-y-4">
        {/* Auto-complete option */}
        <div className="flex items-center justify-between py-2">
          <div className="flex items-center gap-2">
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-foreground">
              Terminer automatiquement
            </span>
          </div>
          <Switch
            checked={autoComplete}
            onCheckedChange={handleAutoCompleteChange}
            disabled={isAutoCompleteUpdating}
          />
        </div>

        {/* Add new subtask form */}
        {isAdding && (
          <div className="flex items-center gap-2">
            <Input
              placeholder="Nouvelle sous-tâche..."
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1"
              autoFocus
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCancel}
              disabled={isSubmitting}
            >
              <X className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              onClick={handleAdd}
              disabled={!newContent.trim() || isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
            </Button>
          </div>
        )}

        {/* Subtasks list with drag & drop */}
        {subtasks.length > 0 ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={subtasks.map((s) => s.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {subtasks.map((subtask) => (
                  <SortableSubtask
                    key={subtask.id}
                    subtask={subtask}
                    onToggle={handleToggle}
                    onDelete={handleDelete}
                    isDeleting={deletingId === subtask.id}
                    isToggling={togglingId === subtask.id}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        ) : !isAdding ? (
          <div className="text-center py-8 text-muted-foreground">
            <ListChecks className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p>Aucune sous-tâche</p>
            <p className="text-sm mt-1">
              Cliquez sur &quot;Ajouter&quot; pour créer une checklist
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
