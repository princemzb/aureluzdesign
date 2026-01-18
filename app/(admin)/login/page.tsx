'use client';

import { useState } from 'react';
import { useFormStatus } from 'react-dom';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { login } from '@/lib/actions/auth.actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock, Mail, Loader2, Clock } from 'lucide-react';

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Connexion...
        </>
      ) : (
        'Se connecter'
      )}
    </Button>
  );
}

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const reason = searchParams.get('reason');

  async function handleSubmit(formData: FormData) {
    setError(null);
    const result = await login(formData);
    if (result?.error) {
      setError(result.error);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="font-serif text-3xl font-medium text-foreground">
            AureLuz
          </h1>
          <p className="mt-2 text-muted-foreground">
            Espace Administration
          </p>
        </div>

        {/* Inactivity message */}
        {reason === 'inactivity' && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-4 text-sm text-center flex items-center justify-center gap-2">
            <Clock className="h-4 w-4" />
            Votre session a expiré pour cause d&apos;inactivité. Veuillez vous reconnecter.
          </div>
        )}

        {/* Login form */}
        <div className="bg-card rounded-xl border border-border p-8 shadow-sm">
          <form action={handleSubmit} className="space-y-6">
            {/* Error message */}
            {error && (
              <div className="bg-destructive/10 text-destructive rounded-lg p-4 text-sm text-center">
                {error}
              </div>
            )}

            {/* Email field */}
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                Email
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="admin@aureluz.fr"
              />
            </div>

            {/* Password field */}
            <div className="space-y-2">
              <Label htmlFor="password" className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-muted-foreground" />
                Mot de passe
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                placeholder="••••••••"
              />
            </div>

            {/* Submit button */}
            <SubmitButton />
          </form>
        </div>

        {/* Back to site */}
        <p className="text-center text-sm text-muted-foreground">
          <Link href="/" className="hover:text-primary transition-colors">
            ← Retour au site
          </Link>
        </p>
      </div>
    </div>
  );
}
