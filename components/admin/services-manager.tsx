'use client';

import { useState } from 'react';
import {
  Plus,
  Sparkles,
  Pencil,
  Trash2,
  GripVertical,
  ChevronUp,
  ChevronDown,
  Eye,
  EyeOff,
  Save,
  X,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { EmojiPicker } from '@/components/ui/emoji-picker';
import {
  createService,
  updateService,
  deleteService,
  reorderServices,
} from '@/lib/actions/services.actions';
import type { Service } from '@/lib/types';

interface ServicesManagerProps {
  services: Service[];
}

interface ServiceFormData {
  emoji: string;
  title: string;
  description: string;
}

export function ServicesManager({ services: initialServices }: ServicesManagerProps) {
  const [services, setServices] = useState(initialServices);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<ServiceFormData>({
    emoji: '✨',
    title: '',
    description: '',
  });

  const resetForm = () => {
    setFormData({ emoji: '✨', title: '', description: '' });
    setIsAdding(false);
    setEditingId(null);
    setError(null);
  };

  const handleAdd = async () => {
    if (!formData.title || !formData.description) {
      setError('Veuillez remplir tous les champs');
      return;
    }

    setIsLoading(true);
    setError(null);

    const result = await createService(formData);

    if (result.success && result.service) {
      setServices([...services, result.service]);
      resetForm();
    } else {
      setError(result.error || 'Erreur lors de la création');
    }

    setIsLoading(false);
  };

  const handleEdit = (service: Service) => {
    setEditingId(service.id);
    setFormData({
      emoji: service.emoji,
      title: service.title,
      description: service.description,
    });
    setIsAdding(false);
  };

  const handleUpdate = async () => {
    if (!editingId || !formData.title || !formData.description) {
      setError('Veuillez remplir tous les champs');
      return;
    }

    setIsLoading(true);
    setError(null);

    const result = await updateService(editingId, formData);

    if (result.success && result.service) {
      setServices(services.map((s) => (s.id === editingId ? result.service! : s)));
      resetForm();
    } else {
      setError(result.error || 'Erreur lors de la mise à jour');
    }

    setIsLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (services.length <= 1) {
      setError('Vous devez conserver au moins un service');
      return;
    }

    if (!confirm('Êtes-vous sûr de vouloir supprimer ce service ?')) {
      return;
    }

    setIsLoading(true);
    setError(null);

    const result = await deleteService(id);

    if (result.success) {
      setServices(services.filter((s) => s.id !== id));
    } else {
      setError(result.error || 'Erreur lors de la suppression');
    }

    setIsLoading(false);
  };

  const handleToggleActive = async (service: Service) => {
    setIsLoading(true);

    const result = await updateService(service.id, {
      is_active: !service.is_active,
    });

    if (result.success && result.service) {
      setServices(services.map((s) => (s.id === service.id ? result.service! : s)));
    }

    setIsLoading(false);
  };

  const handleMoveUp = async (index: number) => {
    if (index === 0) return;

    const newServices = [...services];
    [newServices[index - 1], newServices[index]] = [newServices[index], newServices[index - 1]];

    setServices(newServices);

    const orderedIds = newServices.map((s) => s.id);
    await reorderServices(orderedIds);
  };

  const handleMoveDown = async (index: number) => {
    if (index === services.length - 1) return;

    const newServices = [...services];
    [newServices[index], newServices[index + 1]] = [newServices[index + 1], newServices[index]];

    setServices(newServices);

    const orderedIds = newServices.map((s) => s.id);
    await reorderServices(orderedIds);
  };

  return (
    <div className="space-y-6">
      {/* Error message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Add button */}
      {!isAdding && !editingId && (
        <Button onClick={() => setIsAdding(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Ajouter un service
        </Button>
      )}

      {/* Add/Edit form */}
      {(isAdding || editingId) && (
        <div className="bg-background rounded-xl border border-border p-6 space-y-4">
          <h3 className="font-medium text-lg">
            {isAdding ? 'Nouveau service' : 'Modifier le service'}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Symbole</Label>
              <EmojiPicker
                value={formData.emoji}
                onChange={(emoji) => setFormData({ ...formData, emoji })}
              />
            </div>
            <div className="space-y-2 sm:col-span-3">
              <Label htmlFor="title">Titre</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Nom du service"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Description du service..."
              rows={4}
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={resetForm} disabled={isLoading}>
              <X className="h-4 w-4 mr-2" />
              Annuler
            </Button>
            <Button
              onClick={isAdding ? handleAdd : handleUpdate}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {isAdding ? 'Ajouter' : 'Enregistrer'}
            </Button>
          </div>
        </div>
      )}

      {/* Services list */}
      <div className="bg-background rounded-xl border border-border overflow-hidden">
        <div className="p-4 border-b border-border flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="font-medium text-foreground">Services configurés</h2>
            <p className="text-sm text-muted-foreground">
              Ces services apparaissent sur la page d&apos;accueil.
            </p>
          </div>
        </div>

        <div className="divide-y divide-border">
          {services.map((service, index) => (
            <div
              key={service.id}
              className={`p-4 flex items-start gap-4 ${
                !service.is_active ? 'bg-secondary/30 opacity-60' : ''
              }`}
            >
              {/* Reorder controls */}
              <div className="flex flex-col gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => handleMoveUp(index)}
                  disabled={index === 0 || isLoading}
                >
                  <ChevronUp className="h-4 w-4" />
                </Button>
                <div className="flex items-center justify-center h-6 w-6 text-muted-foreground">
                  <GripVertical className="h-4 w-4" />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => handleMoveDown(index)}
                  disabled={index === services.length - 1 || isLoading}
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </div>

              {/* Emoji */}
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-2xl">{service.emoji}</span>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-foreground">{service.title}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                  {service.description}
                </p>
                {!service.is_active && (
                  <span className="inline-flex items-center gap-1 text-xs text-orange-600 mt-2">
                    <EyeOff className="h-3 w-3" />
                    Masqué sur le site
                  </span>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleToggleActive(service)}
                  disabled={isLoading}
                  title={service.is_active ? 'Masquer' : 'Afficher'}
                >
                  {service.is_active ? (
                    <Eye className="h-4 w-4" />
                  ) : (
                    <EyeOff className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleEdit(service)}
                  disabled={isLoading || !!editingId}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(service.id)}
                  disabled={isLoading || services.length <= 1}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {services.length === 0 && (
          <div className="p-12 text-center">
            <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Aucun service configuré</p>
          </div>
        )}
      </div>
    </div>
  );
}
