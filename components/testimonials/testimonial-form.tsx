'use client';

import { useState } from 'react';
import { Star, Send, Loader2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { submitTestimonial } from '@/lib/actions/testimonials.actions';
import { EVENT_TYPES } from '@/lib/utils/constants';
import { cn } from '@/lib/utils/cn';

export function TestimonialForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rating, setRating] = useState(5);
  const [hoveredRating, setHoveredRating] = useState(0);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData(e.currentTarget);

    const result = await submitTestimonial({
      client_name: formData.get('client_name') as string,
      client_email: formData.get('client_email') as string,
      event_type: formData.get('event_type') as string,
      event_date: formData.get('event_date') as string || undefined,
      rating,
      title: formData.get('title') as string,
      content: formData.get('content') as string,
    });

    setIsSubmitting(false);

    if (result.success) {
      setIsSubmitted(true);
    } else {
      setError(result.error || 'Une erreur est survenue');
    }
  };

  if (isSubmitted) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <h4 className="text-lg font-medium text-foreground mb-2">
          Merci pour votre témoignage !
        </h4>
        <p className="text-muted-foreground">
          Votre avis sera publié après validation par notre équipe.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-destructive/10 text-destructive rounded-lg p-4 text-sm">
          {error}
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        {/* Name */}
        <div>
          <label htmlFor="client_name" className="block text-sm font-medium text-foreground mb-2">
            Votre nom *
          </label>
          <input
            type="text"
            id="client_name"
            name="client_name"
            required
            className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            placeholder="Marie Dupont"
          />
        </div>

        {/* Email */}
        <div>
          <label htmlFor="client_email" className="block text-sm font-medium text-foreground mb-2">
            Votre email *
          </label>
          <input
            type="email"
            id="client_email"
            name="client_email"
            required
            className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            placeholder="marie@exemple.com"
          />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {/* Event type */}
        <div>
          <label htmlFor="event_type" className="block text-sm font-medium text-foreground mb-2">
            Type d&apos;événement *
          </label>
          <select
            id="event_type"
            name="event_type"
            required
            className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="">Sélectionnez...</option>
            {EVENT_TYPES.map((type) => (
              <option key={type.value} value={type.label}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        {/* Event date */}
        <div>
          <label htmlFor="event_date" className="block text-sm font-medium text-foreground mb-2">
            Date de l&apos;événement
          </label>
          <input
            type="date"
            id="event_date"
            name="event_date"
            className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
      </div>

      {/* Rating */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          Votre note *
        </label>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoveredRating(star)}
              onMouseLeave={() => setHoveredRating(0)}
              className="p-1 focus:outline-none"
            >
              <Star
                className={cn(
                  'w-8 h-8 transition-colors',
                  (hoveredRating || rating) >= star
                    ? 'text-yellow-400 fill-yellow-400'
                    : 'text-muted-foreground/30'
                )}
              />
            </button>
          ))}
          <span className="ml-2 text-sm text-muted-foreground">
            {rating}/5
          </span>
        </div>
      </div>

      {/* Title */}
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-foreground mb-2">
          Titre de votre témoignage *
        </label>
        <input
          type="text"
          id="title"
          name="title"
          required
          className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          placeholder="Une décoration de rêve pour notre mariage"
        />
      </div>

      {/* Content */}
      <div>
        <label htmlFor="content" className="block text-sm font-medium text-foreground mb-2">
          Votre témoignage *
        </label>
        <textarea
          id="content"
          name="content"
          required
          rows={5}
          className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
          placeholder="Partagez votre expérience avec AureLuz... Comment s'est passée la collaboration ? Qu'avez-vous particulièrement apprécié ?"
        />
      </div>

      {/* Submit */}
      <Button
        type="submit"
        className="w-full"
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Envoi en cours...
          </>
        ) : (
          <>
            <Send className="w-4 h-4 mr-2" />
            Envoyer mon témoignage
          </>
        )}
      </Button>

      <p className="text-xs text-muted-foreground text-center">
        Votre témoignage sera vérifié avant publication. Votre email ne sera pas affiché.
      </p>
    </form>
  );
}
