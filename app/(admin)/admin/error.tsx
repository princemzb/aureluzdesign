'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Home, RefreshCw, AlertTriangle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function AdminError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error('Admin error:', error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* Card */}
        <div className="bg-background rounded-xl border border-border p-8 text-center">
          {/* Icon */}
          <div className="mb-6">
            <div className="w-16 h-16 mx-auto bg-destructive/10 rounded-full flex items-center justify-center">
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
          </div>

          {/* Content */}
          <h1 className="text-xl font-medium text-foreground mb-2">
            Erreur dans l&apos;administration
          </h1>
          <p className="text-muted-foreground text-sm mb-4">
            Une erreur s&apos;est produite lors du chargement de cette section.
          </p>

          {/* Error details */}
          <div className="mb-6 p-3 bg-destructive/5 border border-destructive/20 rounded-lg text-left">
            <p className="text-xs font-mono text-destructive break-all">
              {error.message || 'Erreur inconnue'}
            </p>
            {error.digest && (
              <p className="text-xs text-muted-foreground mt-1">
                Réf: {error.digest}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={reset} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Réessayer
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/admin">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Dashboard
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/">
                <Home className="h-4 w-4 mr-2" />
                Site
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
