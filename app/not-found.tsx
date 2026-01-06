import Link from 'next/link';
import { Home, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-secondary/30 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        {/* Decorative element */}
        <div className="relative mb-8">
          <div className="text-[150px] font-serif font-bold text-primary/10 leading-none">
            404
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-6xl">✨</span>
          </div>
        </div>

        {/* Content */}
        <h1 className="text-2xl font-serif font-medium text-foreground mb-4">
          Page introuvable
        </h1>
        <p className="text-muted-foreground mb-8">
          Désolé, la page que vous recherchez n&apos;existe pas ou a été déplacée.
          Peut-être cherchiez-vous l&apos;une de nos magnifiques créations ?
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild variant="outline">
            <Link href="javascript:history.back()">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Link>
          </Button>
          <Button asChild>
            <Link href="/">
              <Home className="h-4 w-4 mr-2" />
              Accueil
            </Link>
          </Button>
        </div>

        {/* Footer note */}
        <p className="mt-12 text-sm text-muted-foreground">
          Besoin d&apos;aide ?{' '}
          <Link href="/booking" className="text-primary hover:underline">
            Contactez-nous
          </Link>
        </p>
      </div>
    </div>
  );
}
