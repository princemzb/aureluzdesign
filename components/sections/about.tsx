import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function AboutSection() {
  return (
    <section id="about" className="section-padding">
      <div className="container-main">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Image */}
          <div className="relative">
            <div className="aspect-[4/5] relative rounded-2xl overflow-hidden bg-muted">
              <Image
                src="/images/aurelie-mazaba.jpg"
                alt="Aurélie MAZABA - Fondatrice d'AureLuz"
                fill
                className="object-cover object-top"
                sizes="(max-width: 768px) 100vw, 50vw"
                priority
              />
            </div>
            {/* Decorative element */}
            <div className="absolute -bottom-6 -right-6 w-48 h-48 bg-primary/10 rounded-2xl -z-10" />
          </div>

          {/* Content */}
          <div className="space-y-6">
            <p className="text-sm uppercase tracking-[0.2em] text-primary font-medium">
              À Propos
            </p>

            <h2 className="section-title">
              Aurélie MAZABA
            </h2>

            <div className="space-y-4 text-muted-foreground leading-relaxed">
              <p>
                Passionnée par l&apos;art de créer des atmosphères uniques, je
                mets mon expertise au service de vos événements les plus
                précieux depuis plus de 10 ans.
              </p>
              <p>
                Chaque projet est une nouvelle histoire à raconter. Je
                m&apos;engage à comprendre votre vision, vos goûts et vos rêves
                pour les transformer en une réalité qui vous ressemble.
              </p>
              <p>
                Mon approche allie élégance intemporelle et touches
                contemporaines, créant des décors qui marquent les esprits et
                font naître des émotions durables.
              </p>
            </div>

            <div className="pt-4">
              <Button asChild size="lg">
                <Link href="/booking">Planifier une rencontre</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
