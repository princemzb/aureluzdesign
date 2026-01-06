import { Star, Quote } from 'lucide-react';
import { getApprovedTestimonials } from '@/lib/actions/testimonials.actions';
import { TestimonialFormToggle } from '@/components/testimonials/testimonial-form-toggle';
import { format, parseISO } from '@/lib/utils/date';
import { cn } from '@/lib/utils/cn';

export async function Testimonials() {
  const testimonials = await getApprovedTestimonials();

  return (
    <section id="temoignages" className="py-24 bg-secondary/30">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-primary text-sm font-medium tracking-wider uppercase">
            Témoignages
          </span>
          <h2 className="text-3xl md:text-4xl font-serif font-medium text-foreground mt-4">
            Ils nous ont fait confiance
          </h2>
          <p className="text-muted-foreground mt-4">
            Découvrez les histoires de nos clients et leurs expériences avec AureLuz
            lors de leurs événements les plus précieux.
          </p>
        </div>

        {/* Testimonials grid */}
        {testimonials.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
            {testimonials.map((testimonial) => (
              <div
                key={testimonial.id}
                className="bg-background rounded-2xl p-8 shadow-sm border border-border relative"
              >
                {/* Quote icon */}
                <div className="absolute -top-4 left-8">
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                    <Quote className="w-4 h-4 text-primary-foreground" />
                  </div>
                </div>

                {/* Rating */}
                <div className="flex items-center gap-1 mb-4 pt-2">
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

                {/* Title */}
                <h3 className="font-medium text-foreground text-lg mb-3">
                  {testimonial.title}
                </h3>

                {/* Content */}
                <p className="text-muted-foreground leading-relaxed mb-6">
                  {testimonial.content}
                </p>

                {/* Author */}
                <div className="border-t border-border pt-4">
                  <p className="font-medium text-foreground">
                    {testimonial.client_name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {testimonial.event_type}
                    {testimonial.event_date && (
                      <> • {format(parseISO(testimonial.event_date), 'MMMM yyyy')}</>
                    )}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 mb-16">
            <p className="text-muted-foreground">
              Soyez le premier à partager votre expérience avec AureLuz !
            </p>
          </div>
        )}

        {/* Submit form */}
        <TestimonialFormToggle />
      </div>
    </section>
  );
}
