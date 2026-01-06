'use client';

import { useState } from 'react';
import { Trash2, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';
import { deletePhoto } from '@/lib/actions/gallery.actions';
import { PHOTO_CATEGORIES } from '@/lib/utils/constants';
import type { Photo } from '@/lib/types';

interface PhotoGridProps {
  photos: Photo[];
  onReorder?: (orderedIds: string[]) => void;
}

export function PhotoGrid({ photos, onReorder: _onReorder }: PhotoGridProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const getCategoryLabel = (category: string) => {
    return PHOTO_CATEGORIES.find((c) => c.value === category)?.label || category;
  };

  const handleDelete = async (photoId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette photo ?')) {
      return;
    }

    setDeletingId(photoId);
    const result = await deletePhoto(photoId);
    setDeletingId(null);

    if (!result.success) {
      alert(result.error || 'Erreur lors de la suppression');
    }
  };

  if (photos.length === 0) {
    return (
      <div className="bg-background rounded-xl border border-border p-12 text-center">
        <p className="text-muted-foreground">
          Aucune photo dans la galerie.
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          Ajoutez votre première photo pour commencer.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {photos.map((photo) => (
        <div
          key={photo.id}
          className={cn(
            'group relative bg-background rounded-xl border border-border overflow-hidden',
            deletingId === photo.id && 'opacity-50'
          )}
        >
          {/* Image */}
          <div className="aspect-square relative bg-muted">
            {photo.url ? (
              <img
                src={photo.url}
                alt={photo.alt}
                className="w-full h-full object-cover"
              />
            ) : (
              <div
                className={cn(
                  'w-full h-full',
                  photo.category === 'signature' && 'bg-gradient-to-br from-pink-100 to-rose-200',
                  photo.category === 'instants' && 'bg-gradient-to-br from-blue-100 to-indigo-200',
                  photo.category === 'coaching' && 'bg-gradient-to-br from-amber-100 to-orange-200'
                )}
              />
            )}

            {/* Overlay on hover */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
              <Button
                size="icon"
                variant="secondary"
                className="h-9 w-9"
                onClick={() => handleDelete(photo.id)}
                disabled={deletingId === photo.id}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Info */}
          <div className="p-3">
            <p className="text-sm font-medium text-foreground truncate">
              {photo.alt}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {getCategoryLabel(photo.category)}
            </p>
          </div>

          {/* Drag handle (for future drag & drop) */}
          <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="p-1 bg-black/50 text-white rounded cursor-move">
              <GripVertical className="h-4 w-4" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
