'use client';

import { useState } from 'react';
import { format, parseISO, addDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Download, Send, Loader2, CheckCircle, XCircle, X, Mail, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { updateQuoteStatus } from '@/lib/actions/quotes.actions';
import type { Quote, QuoteStatus } from '@/lib/types';

interface QuoteActionsProps {
  quote: Quote;
}

// Remove URLs from text for design version
function removeUrlsFromText(text: string): string {
  return text
    .replace(/Découvrez nos réalisations :\n?/g, '')
    .replace(/- Site web : https?:\/\/[^\s]+\n?/g, '')
    .replace(/- Instagram : https?:\/\/[^\s]+\n?/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// Convert text to HTML
function textToHtml(text: string): string {
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  html = html.replace(
    /(https?:\/\/[^\s]+)/g,
    '<a href="$1" style="color: #c9a227; text-decoration: underline;">$1</a>'
  );

  html = html.replace(/\n/g, '<br>');

  return html;
}

export function QuoteActions({ quote }: QuoteActionsProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showEmailEditor, setShowEmailEditor] = useState(false);
  const [previewTab, setPreviewTab] = useState<'design' | 'gmail'>('design');
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Format values for default email content
  const formattedTotal = new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(quote.total);

  const validUntil = format(
    addDays(parseISO(quote.created_at), quote.validity_days),
    'dd MMMM yyyy',
    { locale: fr }
  );

  // Email state
  const [emailSubject, setEmailSubject] = useState(
    `Votre devis ${quote.quote_number} - AureLuz Design`
  );
  const [emailBody, setEmailBody] = useState(
    `Bonjour ${quote.client_name},

Merci pour votre intérêt pour nos services de décoration événementielle.

Veuillez trouver ci-joint votre devis personnalisé ${quote.quote_number}.

Montant total TTC : ${formattedTotal}
Devis valable jusqu'au ${validUntil}

N'hésitez pas à me contacter si vous avez des questions ou souhaitez discuter de votre projet.

Découvrez nos réalisations :
- Site web : https://aureluzdesign.fr
- Instagram : https://instagram.com/aureluz_design

À très bientôt,
L'équipe AureLuz Design`
  );

  const handleDownloadPdf = async () => {
    setIsDownloading(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/quotes/${quote.id}/pdf`);

      if (!response.ok) {
        throw new Error('Erreur lors de la génération du PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `devis-${quote.quote_number}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setMessage({ type: 'success', text: 'PDF téléchargé avec succès' });
    } catch (error) {
      console.error('Error downloading PDF:', error);
      setMessage({
        type: 'error',
        text: 'Erreur lors du téléchargement du PDF',
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleSendEmail = async () => {
    setIsSending(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/quotes/${quote.id}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subject: emailSubject,
          body: emailBody,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erreur lors de l\'envoi');
      }

      setMessage({ type: 'success', text: 'Devis envoyé par email avec succès' });
      setShowEmailEditor(false);
    } catch (error) {
      console.error('Error sending email:', error);
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Erreur lors de l\'envoi',
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleStatusChange = async (status: QuoteStatus) => {
    setIsUpdating(true);
    setMessage(null);

    try {
      const result = await updateQuoteStatus(quote.id, status);

      if (result.success) {
        setMessage({
          type: 'success',
          text: `Statut mis à jour : ${status === 'accepted' ? 'Accepté' : 'Refusé'}`,
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error updating status:', error);
      setMessage({
        type: 'error',
        text: 'Erreur lors de la mise à jour du statut',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // Generate preview HTML for design version
  const designPreviewHtml = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #FDF8F3; padding: 20px;">
      <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">
        <div style="padding: 30px 30px 15px; text-align: center; border-bottom: 2px solid #c9a227;">
          <img src="/images/aureluz-design-logo-decoration-evenementielle.png" alt="AureLuz Design" style="height: 50px; width: auto;" />
        </div>
        <div style="padding: 30px;">
          <p style="color: #4a4a4a; font-size: 14px; line-height: 1.8; margin: 0 0 20px;">
            ${textToHtml(removeUrlsFromText(emailBody))}
          </p>
          <div style="text-align: center; margin-top: 25px;">
            <a href="https://aureluzdesign.fr/gallery" style="display: inline-block; background-color: #c9a227; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 13px;">
              Découvrir nos réalisations
            </a>
          </div>
          <div style="text-align: center; margin-top: 15px;">
            <img src="https://cdn-icons-png.flaticon.com/512/174/174855.png" alt="Instagram" style="width: 32px; height: 32px;" />
          </div>
        </div>
        <div style="padding: 20px 30px; background-color: #1a1a1a; text-align: center;">
          <p style="color: #c9a227; font-size: 12px; margin: 0 0 5px; font-weight: 600;">
            AureLuz Design - Décoration sur mesure
          </p>
          <p style="color: #999; font-size: 11px; margin: 0;">
            contact@aureluzdesign.fr | www.aureluzdesign.fr
          </p>
        </div>
      </div>
    </div>
  `;

  // Generate preview HTML for Gmail version
  const gmailPreviewHtml = `
    <div style="font-family: Arial, sans-serif; background-color: #FDF8F3; padding: 20px;">
      <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff; padding: 25px; border-radius: 8px;">
        <div style="text-align: center; padding-bottom: 15px; border-bottom: 2px solid #c9a227;">
          <span style="font-size: 20px; font-weight: bold; color: #c9a227;">AureLuz Design</span>
          <br>
          <span style="font-size: 11px; color: #666;">Décoration sur mesure</span>
        </div>
        <div style="padding: 25px 0;">
          <p style="color: #333; font-size: 13px; line-height: 1.8; margin: 0;">
            ${textToHtml(emailBody)}
          </p>
        </div>
        <div style="padding-top: 15px; border-top: 1px solid #eee; text-align: center;">
          <p style="color: #666; font-size: 11px; margin: 0;">
            AureLuz Design - Décoration sur mesure
            <br>
            contact@aureluzdesign.fr | www.aureluzdesign.fr
          </p>
        </div>
      </div>
    </div>
  `;

  return (
    <>
      <div className="bg-background rounded-xl border border-border p-4 space-y-4">
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            className="gap-2"
            onClick={handleDownloadPdf}
            disabled={isDownloading}
          >
            {isDownloading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Télécharger PDF
          </Button>

          <Button
            variant="outline"
            className="gap-2"
            onClick={() => setShowEmailEditor(true)}
          >
            <Send className="h-4 w-4" />
            Envoyer par email
          </Button>

          {quote.status === 'sent' && (
            <>
              <Button
                variant="outline"
                className="gap-2 text-green-600 hover:text-green-700 hover:bg-green-50"
                onClick={() => handleStatusChange('accepted')}
                disabled={isUpdating}
              >
                {isUpdating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                Marquer comme accepté
              </Button>

              <Button
                variant="outline"
                className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={() => handleStatusChange('rejected')}
                disabled={isUpdating}
              >
                {isUpdating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                Marquer comme refusé
              </Button>
            </>
          )}
        </div>

        {message && (
          <div
            className={`p-3 rounded-lg text-sm ${
              message.type === 'success'
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}
          >
            {message.text}
          </div>
        )}
      </div>

      {/* Email Editor Modal */}
      {showEmailEditor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowEmailEditor(false)}
          />

          {/* Modal */}
          <div className="relative bg-background rounded-xl border border-border shadow-xl w-full max-w-6xl mx-4 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-lg font-semibold">Envoyer le devis par email</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowEmailEditor(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Content */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-4">
              {/* Left: Editor */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  Édition du message
                </div>

                <div className="space-y-2">
                  <Label>Destinataire</Label>
                  <Input value={quote.client_email} disabled className="bg-secondary/50" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="emailSubject">Objet</Label>
                  <Input
                    id="emailSubject"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="emailBody">Message</Label>
                  <Textarea
                    id="emailBody"
                    value={emailBody}
                    onChange={(e) => setEmailBody(e.target.value)}
                    rows={14}
                    className="font-mono text-sm"
                  />
                </div>

                <div className="bg-secondary/30 rounded-lg p-3 text-sm text-muted-foreground">
                  <p>Le PDF du devis sera automatiquement joint à l&apos;email.</p>
                </div>
              </div>

              {/* Right: Preview */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Eye className="h-4 w-4" />
                  Aperçu
                </div>

                {/* Preview Tabs */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setPreviewTab('design')}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                      previewTab === 'design'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                    }`}
                  >
                    Autres mails
                  </button>
                  <button
                    onClick={() => setPreviewTab('gmail')}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                      previewTab === 'gmail'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                    }`}
                  >
                    Gmail
                  </button>
                </div>

                {/* Preview Content */}
                <div className="border border-border rounded-lg overflow-hidden bg-gray-100">
                  <div
                    className="max-h-[500px] overflow-y-auto"
                    dangerouslySetInnerHTML={{
                      __html: previewTab === 'design' ? designPreviewHtml : gmailPreviewHtml,
                    }}
                  />
                </div>

                <p className="text-xs text-muted-foreground">
                  {previewTab === 'design'
                    ? 'Version design avec boutons (utilisée pour les adresses non-Gmail)'
                    : 'Version simplifiée avec liens texte (utilisée pour les adresses Gmail)'}
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-4 border-t border-border">
              <Button
                variant="outline"
                onClick={() => setShowEmailEditor(false)}
              >
                Annuler
              </Button>
              <Button
                onClick={handleSendEmail}
                disabled={isSending}
                className="gap-2"
              >
                {isSending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Envoyer
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
