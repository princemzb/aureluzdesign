'use client';

import { useState } from 'react';
import { Download, Send, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { updateQuoteStatus } from '@/lib/actions/quotes.actions';
import type { Quote, QuoteStatus } from '@/lib/types';

interface QuoteActionsProps {
  quote: Quote;
}

export function QuoteActions({ quote }: QuoteActionsProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

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
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erreur lors de l\'envoi');
      }

      setMessage({ type: 'success', text: 'Devis envoyé par email avec succès' });
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

  return (
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
          onClick={handleSendEmail}
          disabled={isSending}
        >
          {isSending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
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
  );
}
