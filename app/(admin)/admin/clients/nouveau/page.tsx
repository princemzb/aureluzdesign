import Link from 'next/link';
import { ArrowLeft, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ClientForm } from '@/components/admin/client-form';

export default function NouveauClientPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/clients">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <UserPlus className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-serif font-medium text-foreground">
              Nouveau client
            </h1>
            <p className="text-muted-foreground mt-1">
              Ajoutez un nouveau client à votre base
            </p>
          </div>
        </div>
      </div>

      {/* Formulaire */}
      <div className="max-w-2xl">
        <ClientForm />
      </div>
    </div>
  );
}
