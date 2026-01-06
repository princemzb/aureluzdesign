'use client';

import { useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils/cn';
import type { Photo, PhotoCategory } from '@/lib/types';

const categories: { value: PhotoCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'Tous' },
  { value: 'signature', label: 'Prestation Signature' },
  { value: 'instants', label: 'Instants Précieux' },
  { value: 'coaching', label: 'Coaching' },
];

// Placeholder photos for development
const placeholderPhotos: Photo[] = Array.from({ length: 12 }, (_, i) => ({
  id: `photo-${i + 1}`,
  url: '',
  alt: `Réalisation ${i + 1}`,
  category: (['signature', 'instants', 'coaching'] as PhotoCategory[])[i % 3],
  display_order: i,
  created_at: new Date().toISOString(),
}));

interface PortfolioSectionProps {
  photos?: Photo[];
}

export function PortfolioSection({ photos = placeholderPhotos }: PortfolioSectionProps) {
  const [activeFilter, setActiveFilter] = useState<PhotoCategory | 'all'>('all');
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);

  const filteredPhotos = photos.filter(
    (photo) => activeFilter === 'all' || photo.category === activeFilter
  );

  return (
    <section id="portfolio" className="section-padding">
      <div className="container-main">
        {/* Section header */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <p className="text-sm uppercase tracking-[0.2em] text-primary font-medium mb-4">
            Portfolio
          </p>
          <h2 className="section-title">Nos réalisations</h2>
          <p className="section-subtitle mx-auto">
            Découvrez une sélection de nos plus belles créations et
            laissez-vous inspirer pour votre prochain événement.
          </p>
        </div>

        {/* Filter tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-12">
          {categories.map((category) => (
            <button
              key={category.value}
              onClick={() => setActiveFilter(category.value)}
              className={cn(
                'px-6 py-2 rounded-md text-sm font-medium transition-all',
                activeFilter === category.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
              )}
            >
              {category.label}
            </button>
          ))}
        </div>

        {/* Photo grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredPhotos.map((photo, index) => (
            <button
              key={photo.id}
              onClick={() => setSelectedPhoto(photo)}
              className="group relative aspect-square rounded-xl overflow-hidden bg-muted cursor-pointer"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {/* Photo or placeholder gradient */}
              {photo.url ? (
                <Image
                  src={photo.url}
                  alt={photo.alt}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                  sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                />
              ) : (
                <div
                  className={cn(
                    'absolute inset-0 transition-transform duration-300 group-hover:scale-105',
                    photo.category === 'signature' && 'bg-gradient-to-br from-pink-100 to-rose-200',
                    photo.category === 'instants' && 'bg-gradient-to-br from-blue-100 to-indigo-200',
                    photo.category === 'coaching' && 'bg-gradient-to-br from-amber-100 to-orange-200'
                  )}
                />
              )}

              {/* Overlay on hover */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                <span className="text-white opacity-0 group-hover:opacity-100 transition-opacity font-medium">
                  Voir
                </span>
              </div>
            </button>
          ))}
        </div>

        {/* Empty state */}
        {filteredPhotos.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              Aucune photo dans cette catégorie pour le moment.
            </p>
          </div>
        )}
      </div>

      {/* Modal for selected photo */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <div
            className="relative max-w-4xl w-full aspect-[4/3] bg-muted rounded-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Actual image or placeholder */}
            {selectedPhoto.url ? (
              <Image
                src={selectedPhoto.url}
                alt={selectedPhoto.alt}
                fill
                className="object-contain"
                sizes="(max-width: 1024px) 100vw, 80vw"
              />
            ) : (
              <div
                className={cn(
                  'absolute inset-0 flex items-center justify-center',
                  selectedPhoto.category === 'signature' && 'bg-gradient-to-br from-pink-100 to-rose-200',
                  selectedPhoto.category === 'instants' && 'bg-gradient-to-br from-blue-100 to-indigo-200',
                  selectedPhoto.category === 'coaching' && 'bg-gradient-to-br from-amber-100 to-orange-200'
                )}
              >
                <span className="text-2xl text-foreground/50">{selectedPhoto.alt}</span>
              </div>
            )}

            {/* Photo title */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent">
              <p className="text-white font-medium">{selectedPhoto.alt}</p>
            </div>

            {/* Close button */}
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
