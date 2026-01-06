'use client';

import { useState, useMemo } from 'react';
import {
  Star,
  Check,
  X,
  Trash2,
  Filter,
  Eye,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  MessageSquare,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';
import { format, parseISO } from '@/lib/utils/date';
import { updateTestimonialStatus, deleteTestimonial } from '@/lib/actions/testimonials.actions';
import type { Testimonial, TestimonialStatus } from '@/lib/types';

interface TestimonialsManagerProps {
  testimonials: Testimonial[];
}

const STATUS_FILTERS = [
  { value: 'all', label: 'Tous', icon: MessageSquare, className: 'bg-secondary text-foreground' },
  { value: 'pending', label: 'En attente', icon: Clock, className: 'bg-yellow-100 text-yellow-800' },
  { value: 'approved', label: 'Approuvés', icon: CheckCircle, className: 'bg-green-100 text-green-800' },
  { value: 'rejected', label: 'Rejetés', icon: XCircle, className: 'bg-red-100 text-red-800' },
] as const;

export function TestimonialsManager({ testimonials }: TestimonialsManagerProps) {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filteredTestimonials = useMemo(() => {
    if (statusFilter === 'all') return testimonials;
    return testimonials.filter((t) => t.status === statusFilter);
  }, [testimonials, statusFilter]);

  const counts = useMemo(() => ({
    all: testimonials.length,
    pending: testimonials.filter((t) => t.status === 'pending').length,
    approved: testimonials.filter((t) => t.status === 'approved').length,
    rejected: testimonials.filter((t) => t.status === 'rejected').length,
  }), [testimonials]);

  const handleStatusChange = async (id: string, status: TestimonialStatus) => {
    setLoadingId(id);
    try {
      await updateTestimonialStatus(id, status);
    } finally {
      setLoadingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce témoignage ?')) return;

    setLoadingId(id);
    try {
      await deleteTestimonial(id);
    } finally {
      setLoadingId(null);
    }
  };

  const getStatusBadge = (status: TestimonialStatus) => {
    const config = STATUS_FILTERS.find((f) => f.value === status);
    if (!config) return null;

    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium',
          config.className
        )}
      >
        <config.icon className="w-3 h-3" />
        {config.label}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="bg-background rounded-xl border border-border p-4">
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground mr-2">Filtrer:</span>
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter.value}
              onClick={() => setStatusFilter(filter.value)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1',
                statusFilter === filter.value
                  ? cn(filter.className, 'ring-2 ring-offset-2 ring-primary/50')
                  : 'bg-secondary/50 text-muted-foreground hover:bg-secondary'
              )}
            >
              <filter.icon className="w-3 h-3" />
              {filter.label} ({counts[filter.value as keyof typeof counts]})
            </button>
          ))}
        </div>
      </div>

      {/* Testimonials list */}
      <div className="bg-background rounded-xl border border-border overflow-hidden">
        {filteredTestimonials.length > 0 ? (
          <div className="divide-y divide-border">
            {filteredTestimonials.map((testimonial) => (
              <div key={testimonial.id} className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-medium text-foreground">
                        {testimonial.client_name}
                      </h3>
                      {getStatusBadge(testimonial.status)}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{testimonial.client_email}</span>
                      <span>•</span>
                      <span>{testimonial.event_type}</span>
                      {testimonial.event_date && (
                        <>
                          <span>•</span>
                          <span>{format(parseISO(testimonial.event_date), 'dd/MM/yyyy')}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Rating */}
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={cn(
                          'w-4 h-4',
                          i < testimonial.rating
                            ? 'text-yellow-400 fill-yellow-400'
                            : 'text-muted-foreground/30'
                        )}
                      />
                    ))}
                  </div>
                </div>

                {/* Title & Content */}
                <div className="mb-4">
                  <h4 className="font-medium text-foreground mb-2">
                    &quot;{testimonial.title}&quot;
                  </h4>
                  <p
                    className={cn(
                      'text-muted-foreground',
                      expandedId !== testimonial.id && 'line-clamp-3'
                    )}
                  >
                    {testimonial.content}
                  </p>
                  {testimonial.content.length > 200 && (
                    <button
                      onClick={() => setExpandedId(
                        expandedId === testimonial.id ? null : testimonial.id
                      )}
                      className="text-primary text-sm mt-1 hover:underline"
                    >
                      {expandedId === testimonial.id ? 'Voir moins' : 'Voir plus'}
                    </button>
                  )}
                </div>

                {/* Meta & Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-border">
                  <span className="text-xs text-muted-foreground">
                    Reçu le {format(parseISO(testimonial.created_at), 'dd/MM/yyyy à HH:mm')}
                    {testimonial.approved_at && (
                      <> • Approuvé le {format(parseISO(testimonial.approved_at), 'dd/MM/yyyy')}</>
                    )}
                  </span>

                  <div className="flex items-center gap-2">
                    {testimonial.status === 'pending' && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-green-600 hover:text-green-700 hover:bg-green-50"
                          onClick={() => handleStatusChange(testimonial.id, 'approved')}
                          disabled={loadingId === testimonial.id}
                        >
                          {loadingId === testimonial.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Check className="h-4 w-4 mr-1" />
                              Approuver
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleStatusChange(testimonial.id, 'rejected')}
                          disabled={loadingId === testimonial.id}
                        >
                          {loadingId === testimonial.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <X className="h-4 w-4 mr-1" />
                              Rejeter
                            </>
                          )}
                        </Button>
                      </>
                    )}

                    {testimonial.status === 'approved' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleStatusChange(testimonial.id, 'rejected')}
                        disabled={loadingId === testimonial.id}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Masquer
                      </Button>
                    )}

                    {testimonial.status === 'rejected' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-green-600 hover:text-green-700 hover:bg-green-50"
                        onClick={() => handleStatusChange(testimonial.id, 'approved')}
                        disabled={loadingId === testimonial.id}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Approuver
                      </Button>
                    )}

                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleDelete(testimonial.id)}
                      disabled={loadingId === testimonial.id}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center">
            <MessageSquare className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground">
              {statusFilter === 'all'
                ? 'Aucun témoignage reçu pour le moment.'
                : `Aucun témoignage ${STATUS_FILTERS.find(f => f.value === statusFilter)?.label.toLowerCase()}.`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
