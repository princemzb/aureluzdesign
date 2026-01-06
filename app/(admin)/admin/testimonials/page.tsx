import { MessageSquare, Clock, CheckCircle, XCircle } from 'lucide-react';
import { getAllTestimonials, getTestimonialStats } from '@/lib/actions/testimonials.actions';
import { TestimonialsManager } from '@/components/admin/testimonials-manager';

export default async function TestimonialsPage() {
  const [testimonials, stats] = await Promise.all([
    getAllTestimonials(),
    getTestimonialStats(),
  ]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-serif font-medium text-foreground">
          Gestion des témoignages
        </h1>
        <p className="text-muted-foreground mt-1">
          Validez et gérez les témoignages de vos clients.
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-background rounded-xl border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-secondary rounded-lg">
              <MessageSquare className="h-5 w-5 text-foreground" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-foreground">{stats.total}</p>
              <p className="text-sm text-muted-foreground">Total</p>
            </div>
          </div>
        </div>

        <div className="bg-background rounded-xl border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="h-5 w-5 text-yellow-700" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-foreground">{stats.pending}</p>
              <p className="text-sm text-muted-foreground">En attente</p>
            </div>
          </div>
        </div>

        <div className="bg-background rounded-xl border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-700" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-foreground">{stats.approved}</p>
              <p className="text-sm text-muted-foreground">Approuvés</p>
            </div>
          </div>
        </div>

        <div className="bg-background rounded-xl border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <XCircle className="h-5 w-5 text-red-700" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-foreground">{stats.rejected}</p>
              <p className="text-sm text-muted-foreground">Rejetés</p>
            </div>
          </div>
        </div>
      </div>

      {/* Testimonials manager */}
      <TestimonialsManager testimonials={testimonials} />
    </div>
  );
}
