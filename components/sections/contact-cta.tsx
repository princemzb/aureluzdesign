'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Calendar, ArrowRight } from 'lucide-react';
import { usePreview } from '@/components/providers/preview-provider';

export function ContactCTASection() {
  const isPreview = usePreview();
  return (
    <section className="section-padding bg-foreground text-background">
      <div className="container-main">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          {/* Icon */}
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto">
            <Calendar className="w-8 h-8 text-primary" />
          </div>

          {/* Title */}
          <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl font-medium">
            Prêt à donner vie à votre événement ?
          </h2>

          {/* Description */}
          <p className="text-lg text-background/70 max-w-xl mx-auto">
            Réservez une consultation gratuite d&apos;une heure pour discuter de
            votre projet et découvrir comment nous pouvons le sublimer ensemble.
          </p>

          {/* CTA Button */}
          <div className="pt-4">
            {isPreview ? (
              <Button
                size="xl"
                className="bg-primary hover:bg-primary/90 text-primary-foreground cursor-default opacity-80"
              >
                Réserver ma consultation
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            ) : (
              <Button
                asChild
                size="xl"
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                <Link href="/booking">
                  Réserver ma consultation
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
