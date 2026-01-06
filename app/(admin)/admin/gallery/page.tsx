import { Suspense } from 'react';
import { Image as ImageIcon } from 'lucide-react';
import { getPhotos } from '@/lib/actions/gallery.actions';
import { GalleryManager } from '@/components/admin/gallery-manager';
import { BUSINESS_CONFIG } from '@/lib/utils/constants';

export default async function GalleryPage() {
  const photos = await getPhotos();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif font-medium text-foreground">
            Gestion de la galerie
          </h1>
          <p className="text-muted-foreground mt-1">
            {photos.length} / {BUSINESS_CONFIG.MAX_GALLERY_PHOTOS} photos
          </p>
        </div>
      </div>

      {/* Gallery manager */}
      <Suspense fallback={<GalleryLoading />}>
        <GalleryManager
          photos={photos}
          maxPhotos={BUSINESS_CONFIG.MAX_GALLERY_PHOTOS}
        />
      </Suspense>
    </div>
  );
}

function GalleryLoading() {
  return (
    <div className="bg-background rounded-xl border border-border p-12 text-center">
      <div className="w-12 h-12 mx-auto bg-secondary rounded-full flex items-center justify-center animate-pulse">
        <ImageIcon className="h-6 w-6 text-muted-foreground" />
      </div>
      <p className="text-muted-foreground mt-4">Chargement...</p>
    </div>
  );
}
