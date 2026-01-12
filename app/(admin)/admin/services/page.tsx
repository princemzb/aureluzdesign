import { Suspense } from 'react';
import { Sparkles } from 'lucide-react';
import { getServices } from '@/lib/actions/services.actions';
import { ServicesManager } from '@/components/admin/services-manager';

export default async function ServicesPage() {
  const services = await getServices();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif font-medium text-foreground">
            Gestion des services
          </h1>
          <p className="text-muted-foreground mt-1">
            {services.length} service{services.length > 1 ? 's' : ''} configuré{services.length > 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Services manager */}
      <Suspense fallback={<ServicesLoading />}>
        <ServicesManager services={services} />
      </Suspense>
    </div>
  );
}

function ServicesLoading() {
  return (
    <div className="bg-background rounded-xl border border-border p-12 text-center">
      <div className="w-12 h-12 mx-auto bg-secondary rounded-full flex items-center justify-center animate-pulse">
        <Sparkles className="h-6 w-6 text-muted-foreground" />
      </div>
      <p className="text-muted-foreground mt-4">Chargement...</p>
    </div>
  );
}
