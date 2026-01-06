'use client';

import { useState } from 'react';
import { Plus, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PhotoUpload } from './photo-upload';
import { PhotoGrid } from './photo-grid';
import type { Photo } from '@/lib/types';

interface GalleryManagerProps {
  photos: Photo[];
  maxPhotos: number;
}

export function GalleryManager({ photos, maxPhotos }: GalleryManagerProps) {
  const [isAdding, setIsAdding] = useState(false);

  const canAddMore = photos.length < maxPhotos;

  return (
    <div className="space-y-6">
      {/* Upload section */}
      <div className="bg-background rounded-xl border border-border">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <ImageIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-medium text-foreground">
                Photos du portfolio
              </h2>
              <p className="text-sm text-muted-foreground">
                Ces photos apparaissent sur la page d&apos;accueil.
              </p>
            </div>
          </div>
          {!isAdding && canAddMore && (
            <Button onClick={() => setIsAdding(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Ajouter une photo
            </Button>
          )}
        </div>

        {/* Upload form */}
        {isAdding && (
          <div className="p-6 bg-secondary/30">
            <PhotoUpload
              onSuccess={() => setIsAdding(false)}
              onCancel={() => setIsAdding(false)}
            />
          </div>
        )}

        {/* Limit warning */}
        {!canAddMore && (
          <div className="p-4 bg-yellow-50 border-t border-yellow-100">
            <p className="text-sm text-yellow-800">
              Vous avez atteint la limite de {maxPhotos} photos. Supprimez une
              photo existante pour en ajouter une nouvelle.
            </p>
          </div>
        )}
      </div>

      {/* Photo grid */}
      <PhotoGrid photos={photos} />
    </div>
  );
}
