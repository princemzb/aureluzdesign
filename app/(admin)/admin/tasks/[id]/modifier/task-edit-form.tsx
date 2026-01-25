'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Save, Trash2, Flame, ArrowUp, Minus, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TimePicker } from '@/components/ui/time-picker';
import { updateTask, deleteTask } from '@/lib/actions/tasks.actions';
import type { TaskWithClient, TaskPriority, TaskStatus } from '@/lib/types';

interface TaskEditFormProps {
  task: TaskWithClient;
}

const priorityOptions: { value: TaskPriority; label: string; icon: typeof Flame }[] = [
  { value: 'urgent', label: 'Urgent', icon: Flame },
  { value: 'high', label: 'Haute', icon: ArrowUp },
  { value: 'normal', label: 'Normale', icon: Minus },
  { value: 'low', label: 'Basse', icon: ArrowDown },
];

const statusOptions: { value: TaskStatus; label: string }[] = [
  { value: 'pending', label: 'En attente' },
  { value: 'in_progress', label: 'En cours' },
  { value: 'completed', label: 'Terminé' },
  { value: 'cancelled', label: 'Annulé' },
];

export function TaskEditForm({ task }: TaskEditFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [formData, setFormData] = useState({
    name: task.name,
    location: task.location || '',
    due_date: task.due_date ? task.due_date.split('T')[0] : '',
    start_time: task.start_time || '',
    end_time: task.end_time || '',
    description: task.description || '',
    priority: task.priority,
    status: task.status,
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const result = await updateTask(task.id, {
        name: formData.name,
        location: formData.location || undefined,
        due_date: formData.due_date || undefined,
        start_time: formData.start_time || null,
        end_time: formData.end_time || null,
        description: formData.description || undefined,
        priority: formData.priority,
        status: formData.status,
      });

      if (result.success) {
        router.push(`/admin/tasks/${task.id}`);
        router.refresh();
      } else {
        setError(result.error || 'Une erreur est survenue');
      }
    } catch {
      setError('Une erreur est survenue');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const result = await deleteTask(task.id, task.client_id);
      if (result.success) {
        router.push(`/admin/clients/${task.client_id}`);
        router.refresh();
      } else {
        setError(result.error || 'Erreur lors de la suppression');
        setShowDeleteConfirm(false);
      }
    } catch {
      setError('Erreur lors de la suppression');
      setShowDeleteConfirm(false);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-background rounded-xl border border-border p-6 space-y-6">
      {error && (
        <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Name */}
      <div className="space-y-2">
        <Label htmlFor="name">Nom de la tâche *</Label>
        <Input
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="Ex: Préparation décoration"
          required
        />
      </div>

      {/* Priority & Status */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="priority">Priorité</Label>
          <Select
            value={formData.priority}
            onValueChange={(value) =>
              setFormData((prev) => ({ ...prev, priority: value as TaskPriority }))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {priorityOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <SelectItem key={option.value} value={option.value}>
                    <span className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      {option.label}
                    </span>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="status">Statut</Label>
          <Select
            value={formData.status}
            onValueChange={(value) =>
              setFormData((prev) => ({ ...prev, status: value as TaskStatus }))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Date & Location */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="due_date">Date limite</Label>
          <Input
            id="due_date"
            name="due_date"
            type="date"
            value={formData.due_date}
            onChange={handleChange}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="location">Lieu</Label>
          <Input
            id="location"
            name="location"
            value={formData.location}
            onChange={handleChange}
            placeholder="Ex: Domaine de..."
          />
        </div>
      </div>

      {/* Time slot */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Heure de début</Label>
          <TimePicker
            value={formData.start_time}
            onChange={(value) => setFormData((prev) => ({ ...prev, start_time: value }))}
          />
        </div>

        <div className="space-y-2">
          <Label>Heure de fin</Label>
          <TimePicker
            value={formData.end_time}
            onChange={(value) => setFormData((prev) => ({ ...prev, end_time: value }))}
          />
        </div>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          placeholder="Détails de la tâche..."
          rows={4}
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-border">
        {!showDeleteConfirm ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowDeleteConfirm(true)}
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Supprimer
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-sm text-destructive">Confirmer ?</span>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Oui'}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowDeleteConfirm(false)}
              disabled={isDeleting}
            >
              Non
            </Button>
          </div>
        )}

        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isSubmitting}
          >
            Annuler
          </Button>
          <Button type="submit" disabled={isSubmitting} className="gap-2">
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Enregistrer
          </Button>
        </div>
      </div>
    </form>
  );
}
