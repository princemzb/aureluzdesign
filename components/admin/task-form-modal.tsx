'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, Save, Flame, ArrowUp, Minus, ArrowDown } from 'lucide-react';
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
import { createTask, updateTask } from '@/lib/actions/tasks.actions';
import type { Task, TaskPriority, TaskStatus } from '@/lib/types';

interface TaskFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  task?: Task | null;
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

export function TaskFormModal({
  isOpen,
  onClose,
  clientId,
  task,
}: TaskFormModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    location: '',
    due_date: '',
    description: '',
    priority: 'normal' as TaskPriority,
    status: 'pending' as TaskStatus,
  });

  useEffect(() => {
    if (task) {
      setFormData({
        name: task.name,
        location: task.location || '',
        due_date: task.due_date ? task.due_date.split('T')[0] : '',
        description: task.description || '',
        priority: task.priority,
        status: task.status,
      });
    } else {
      setFormData({
        name: '',
        location: '',
        due_date: '',
        description: '',
        priority: 'normal',
        status: 'pending',
      });
    }
    setError(null);
  }, [task, isOpen]);

  if (!isOpen) return null;

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
      const input = {
        client_id: clientId,
        name: formData.name,
        location: formData.location || undefined,
        due_date: formData.due_date || undefined,
        description: formData.description || undefined,
        priority: formData.priority,
        status: formData.status,
      };

      const result = task
        ? await updateTask(task.id, input)
        : await createTask(input);

      if (result.success) {
        onClose();
      } else {
        setError(result.error || 'Une erreur est survenue');
      }
    } catch {
      setError('Une erreur est survenue');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-background rounded-xl shadow-lg w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-medium">
            {task ? 'Modifier la tâche' : 'Nouvelle tâche'}
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

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

          <div className="grid gap-4 md:grid-cols-2">
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

            {task && (
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
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
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

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Détails de la tâche..."
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
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
              {task ? 'Enregistrer' : 'Créer'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
