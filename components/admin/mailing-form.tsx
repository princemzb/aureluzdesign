'use client';

import { useState } from 'react';
import { Plus, Trash2, Send, Loader2, Mail, CheckCircle, XCircle, Eye, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { sendSalonCampaign, getEmailPreview, type Contact, type SendCampaignResult } from '@/lib/actions/mailing.actions';

export function MailingForm() {
  const [contacts, setContacts] = useState<Contact[]>([{ name: '', email: '' }]);
  const [isSending, setIsSending] = useState(false);
  const [result, setResult] = useState<SendCampaignResult | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewType, setPreviewType] = useState<'gmail' | 'other'>('other');
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  const addContact = () => {
    setContacts([...contacts, { name: '', email: '' }]);
  };

  const removeContact = (index: number) => {
    if (contacts.length > 1) {
      setContacts(contacts.filter((_, i) => i !== index));
    }
  };

  const updateContact = (index: number, field: keyof Contact, value: string) => {
    const newContacts = [...contacts];
    newContacts[index][field] = value;
    setContacts(newContacts);
  };

  const isFormValid = () => {
    return contacts.every(
      (c) => c.name.trim() !== '' && c.email.trim() !== '' && c.email.includes('@')
    );
  };

  const handleShowPreview = async (type: 'gmail' | 'other') => {
    setIsLoadingPreview(true);
    setPreviewType(type);
    try {
      const html = await getEmailPreview('Marie', type === 'gmail');
      setPreviewHtml(html);
      setShowPreview(true);
    } catch (error) {
      console.error('Erreur lors de la prévisualisation:', error);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResult(null);

    if (!isFormValid()) {
      return;
    }

    setIsSending(true);

    try {
      const campaignResult = await sendSalonCampaign(contacts);
      setResult(campaignResult);

      if (campaignResult.success) {
        setContacts([{ name: '', email: '' }]);
      }
    } catch (error) {
      console.error('Erreur lors de l\'envoi:', error);
      setResult({
        success: false,
        total: contacts.length,
        sent: 0,
        failed: contacts.length,
        errors: [{ email: 'Tous', error: 'Erreur lors de l\'envoi' }],
      });
    } finally {
      setIsSending(false);
    }
  };

  const resetForm = () => {
    setContacts([{ name: '', email: '' }]);
    setResult(null);
  };

  return (
    <div className="space-y-6">
      {/* Modal de prévisualisation */}
      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-background rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div>
                <h3 className="font-medium">Prévisualisation du template</h3>
                <p className="text-sm text-muted-foreground">
                  {previewType === 'gmail' ? 'Version Gmail (simplifiée)' : 'Version design (autres emails)'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant={previewType === 'other' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleShowPreview('other')}
                  disabled={isLoadingPreview}
                >
                  Design
                </Button>
                <Button
                  variant={previewType === 'gmail' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleShowPreview('gmail')}
                  disabled={isLoadingPreview}
                >
                  Gmail
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowPreview(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4 bg-neutral-100">
              {isLoadingPreview ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <iframe
                  srcDoc={previewHtml}
                  className="w-full h-[600px] bg-white rounded-lg shadow-sm"
                  title="Email preview"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Résultat de l'envoi */}
      {result && (
        <div
          className={`p-4 rounded-lg ${
            result.success
              ? 'bg-green-50 border border-green-200'
              : result.sent > 0
              ? 'bg-yellow-50 border border-yellow-200'
              : 'bg-red-50 border border-red-200'
          }`}
        >
          <div className="flex items-start gap-3">
            {result.success ? (
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
            ) : (
              <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
            )}
            <div className="flex-1">
              <p className="font-medium">
                {result.success
                  ? 'Tous les emails ont été envoyés avec succès !'
                  : `${result.sent} email(s) envoyé(s) sur ${result.total}`}
              </p>
              {result.errors.length > 0 && (
                <div className="mt-2 text-sm">
                  <p className="text-red-700 font-medium">Erreurs :</p>
                  <ul className="list-disc list-inside mt-1">
                    {result.errors.map((err, i) => (
                      <li key={i} className="text-red-600">
                        {err.email}: {err.error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {result.success && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={resetForm}
                >
                  Nouvelle campagne
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Formulaire */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-base font-medium">
              Contacts ({contacts.length})
            </Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addContact}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Ajouter un contact
            </Button>
          </div>

          <div className="space-y-3">
            {contacts.map((contact, index) => (
              <div
                key={index}
                className="flex gap-3 items-start p-4 bg-secondary/30 rounded-lg"
              >
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor={`name-${index}`} className="text-sm text-muted-foreground">
                      Nom
                    </Label>
                    <Input
                      id={`name-${index}`}
                      placeholder="Prénom Nom"
                      value={contact.name}
                      onChange={(e) => updateContact(index, 'name', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`email-${index}`} className="text-sm text-muted-foreground">
                      Email
                    </Label>
                    <Input
                      id={`email-${index}`}
                      type="email"
                      placeholder="email@exemple.com"
                      value={contact.email}
                      onChange={(e) => updateContact(index, 'email', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeContact(index)}
                  disabled={contacts.length === 1}
                  className="mt-6 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Aperçu */}
        <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="h-4 w-4" />
              <span>Aperçu de l&apos;email</span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleShowPreview('other')}
              className="gap-2"
            >
              <Eye className="h-4 w-4" />
              Voir le template
            </Button>
          </div>
          <p className="text-sm">
            <strong>Objet :</strong> Suite à notre rencontre au Salon du Mariage - AureLuz
          </p>
          <p className="text-sm mt-1 text-muted-foreground">
            Les emails Gmail reçoivent une version simplifiée pour éviter les promotions.
            Les autres emails reçoivent la version design complète.
          </p>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={resetForm}
            disabled={isSending}
          >
            Réinitialiser
          </Button>
          <Button
            type="submit"
            disabled={isSending || !isFormValid()}
            className="gap-2"
          >
            {isSending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Envoi en cours...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Envoyer à {contacts.length} contact{contacts.length > 1 ? 's' : ''}
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
