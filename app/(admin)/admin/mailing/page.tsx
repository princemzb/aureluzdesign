import { Mail } from 'lucide-react';
import { MailingForm } from '@/components/admin/mailing-form';

export default function MailingPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-serif font-medium text-foreground">
          Mailing
        </h1>
        <p className="text-muted-foreground mt-1">
          Envoyez des emails personnalisés aux contacts du Salon du Mariage
        </p>
      </div>

      {/* Info card */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-6">
        <div className="flex gap-4">
          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
            <Mail className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="font-medium text-foreground">Campagne Salon du Mariage</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Ajoutez les contacts rencontrés lors du salon et envoyez-leur un email
              personnalisé avec un lien direct vers la page de prise de rendez-vous.
            </p>
          </div>
        </div>
      </div>

      {/* Formulaire */}
      <div className="bg-background rounded-xl border border-border p-6">
        <MailingForm />
      </div>
    </div>
  );
}
