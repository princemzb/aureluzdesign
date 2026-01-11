import { QuoteForm } from '@/components/admin/quote-form';

export default function NouveauDevisPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-serif font-medium text-foreground">
          Nouveau devis
        </h1>
        <p className="text-muted-foreground mt-1">
          Créez un nouveau devis pour votre client
        </p>
      </div>

      <QuoteForm mode="create" />
    </div>
  );
}
