import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

export function HeroSection() {
  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-background to-background" />

      {/* Decorative elements */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-gold-200/20 rounded-full blur-3xl" />

      {/* Content */}
      <div className="relative container-main text-center py-20">
        <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
          {/* Subtitle */}
          <p className="text-sm uppercase tracking-[0.3em] text-primary font-medium">
            Aureluz Design - Décoration Événementielle
          </p>

          {/* Main title */}
          <h1 className="font-serif text-5xl md:text-6xl lg:text-7xl font-medium tracking-tight text-foreground text-balance">
            L&apos;art de sublimer vos instants précieux
          </h1>

          {/* Description */}
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Créez des moments inoubliables avec une décoration sur mesure,
            élégante et raffinée. Du mariage intime à l&apos;événement
            d&apos;exception.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Button asChild size="xl">
              <Link href="/booking">
                Réserver une consultation
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="xl">
              <Link href="/#portfolio">Découvrir nos réalisations</Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 border-2 border-muted-foreground/30 rounded-full flex items-start justify-center p-2">
          <div className="w-1 h-2 bg-muted-foreground/50 rounded-full" />
        </div>
      </div>
    </section>
  );
}
