import { Mail, FileEdit, Send } from 'lucide-react';
import { MailingForm } from '@/components/admin/mailing-form';
import { EmailTemplateEditor } from '@/components/admin/email-template-editor';
import { getSalonEmailTemplate } from '@/lib/actions/email-templates.actions';
import { MailingTabs } from '@/components/admin/mailing-tabs';

export default async function MailingPage() {
  const template = await getSalonEmailTemplate();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Mail className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-serif font-medium text-foreground">
            Mailing
          </h1>
          <p className="text-muted-foreground mt-1">
            Gérez vos templates et envoyez des emails personnalisés
          </p>
        </div>
      </div>

      {/* Tabs */}
      <MailingTabs
        sendContent={
          <div className="space-y-6">
            {/* Info card */}
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-6">
              <div className="flex gap-4">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <Send className="h-5 w-5 text-primary" />
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

            {/* Form */}
            <div className="bg-background rounded-xl border border-border p-6">
              <MailingForm />
            </div>
          </div>
        }
        editContent={
          <div className="space-y-6">
            {/* Info card */}
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-6">
              <div className="flex gap-4">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <FileEdit className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="font-medium text-foreground">Personnaliser le template</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Modifiez le contenu de l&apos;email envoyé aux contacts du Salon du Mariage.
                  </p>
                </div>
              </div>
            </div>

            {/* Editor */}
            <div className="bg-background rounded-xl border border-border p-6">
              {template ? (
                <EmailTemplateEditor template={template} />
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  Template non trouvé. Veuillez exécuter la migration de base de données.
                </p>
              )}
            </div>
          </div>
        }
      />
    </div>
  );
}
