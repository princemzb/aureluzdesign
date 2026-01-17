import { Suspense } from 'react';
import { Globe, Loader2 } from 'lucide-react';
import { getServices } from '@/lib/actions/services.actions';
import { getPhotos } from '@/lib/actions/gallery.actions';
import { getAllTestimonials } from '@/lib/actions/testimonials.actions';
import { getLogo } from '@/lib/actions/settings.actions';
import { getBusinessHours } from '@/lib/actions/business-hours.actions';
import { ServicesManager } from '@/components/admin/services-manager';
import { GalleryManager } from '@/components/admin/gallery-manager';
import { TestimonialsManager } from '@/components/admin/testimonials-manager';
import { LogoManager } from '@/components/admin/logo-manager';
import { BusinessHoursManager } from '@/components/admin/business-hours-manager';
import { BUSINESS_CONFIG } from '@/lib/utils/constants';
import { SiteManagementTabs } from '@/components/admin/site-management-tabs';

export default async function SiteManagementPage() {
  const [services, photos, testimonials, logoUrl, businessHours] = await Promise.all([
    getServices(),
    getPhotos(),
    getAllTestimonials(),
    getLogo(),
    getBusinessHours(),
  ]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Globe className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-serif font-medium text-foreground">
            Gestion du site client
          </h1>
          <p className="text-muted-foreground mt-1">
            Gérez le contenu visible par vos clients sur le site.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Suspense fallback={<LoadingState />}>
        <SiteManagementTabs
          servicesContent={<ServicesManager services={services} />}
          galleryContent={
            <GalleryManager
              photos={photos}
              maxPhotos={BUSINESS_CONFIG.MAX_GALLERY_PHOTOS}
            />
          }
          testimonialsContent={<TestimonialsManager testimonials={testimonials} />}
          logoContent={<LogoManager currentLogo={logoUrl} />}
          hoursContent={<BusinessHoursManager businessHours={businessHours} />}
          counts={{
            services: services.length,
            photos: photos.length,
            testimonials: testimonials.length,
          }}
        />
      </Suspense>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="bg-background rounded-xl border border-border p-12 text-center">
      <Loader2 className="h-8 w-8 text-primary animate-spin mx-auto" />
      <p className="text-muted-foreground mt-4">Chargement...</p>
    </div>
  );
}
