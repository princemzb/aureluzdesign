'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Loader2, MessageSquare, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { addTaskDetail, deleteTaskDetail } from '@/lib/actions/tasks.actions';
import { format, parseISO } from '@/lib/utils/date';
import { cn } from '@/lib/utils/cn';
import type { TaskDetail } from '@/lib/types';

interface TaskDetailsSectionProps {
  taskId: string;
  initialDetails: TaskDetail[];
}

export function TaskDetailsSection({ taskId, initialDetails }: TaskDetailsSectionProps) {
  const router = useRouter();
  const [details, setDetails] = useState<TaskDetail[]>(initialDetails);
  const [isAdding, setIsAdding] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleAdd = async () => {
    if (!newContent.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const result = await addTaskDetail({ task_id: taskId, content: newContent.trim() });
      if (result.success && result.data) {
        setDetails([result.data, ...details]);
        setNewContent('');
        setIsAdding(false);
        router.refresh();
      }
    } catch (error) {
      console.error('Error adding detail:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (detailId: string) => {
    if (deletingId) return;

    setDeletingId(detailId);
    try {
      const result = await deleteTaskDetail(detailId, taskId);
      if (result.success) {
        setDetails(details.filter((d) => d.id !== detailId));
        router.refresh();
      }
    } catch (error) {
      console.error('Error deleting detail:', error);
    } finally {
      setDeletingId(null);
    }
  };

  const handleCancel = () => {
    setNewContent('');
    setIsAdding(false);
  };

  return (
    <div className="bg-background rounded-xl border border-border overflow-hidden">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h2 className="font-medium text-foreground flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          Détails & Notes ({details.length})
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

      <div className="p-4 space-y-4">
        {/* Add new detail form */}
        {isAdding && (
          <div className="bg-primary/5 rounded-lg border-2 border-dashed border-primary/30 p-4 space-y-3">
            <Textarea
              placeholder="Ajoutez une note ou un détail..."
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              rows={3}
              className="resize-none"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancel}
                disabled={isSubmitting}
              >
                <X className="h-4 w-4 mr-1" />
                Annuler
              </Button>
              <Button
                size="sm"
                onClick={handleAdd}
                disabled={!newContent.trim() || isSubmitting}
                className="gap-2"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Enregistrer
              </Button>
            </div>
          </div>
        )}

        {/* Details list */}
        {details.length > 0 ? (
          <div className="space-y-3">
            {details.map((detail, index) => (
              <div
                key={detail.id}
                className={cn(
                  'group relative rounded-lg border p-4 transition-all hover:shadow-sm',
                  index % 4 === 0 && 'bg-blue-50/50 border-blue-200',
                  index % 4 === 1 && 'bg-green-50/50 border-green-200',
                  index % 4 === 2 && 'bg-amber-50/50 border-amber-200',
                  index % 4 === 3 && 'bg-purple-50/50 border-purple-200'
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-foreground whitespace-pre-wrap">{detail.content}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {format(parseISO(detail.created_at), 'dd/MM/yyyy à HH:mm')}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(detail.id)}
                    disabled={deletingId === detail.id}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                  >
                    {deletingId === detail.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : !isAdding ? (
          <div className="text-center py-8 text-muted-foreground">
            <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p>Aucun détail ajouté</p>
            <p className="text-sm mt-1">Cliquez sur &quot;Ajouter&quot; pour créer une note</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
