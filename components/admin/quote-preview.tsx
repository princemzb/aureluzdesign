'use client';

import { format, parseISO, addDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import Image from 'next/image';
import type { Quote } from '@/lib/types';
import { EVENT_TYPES } from '@/lib/utils/constants';
import { useLogo } from '@/components/providers/logo-provider';

interface QuotePreviewProps {
  quote: Quote;
  forPdf?: boolean;
}

export function QuotePreview({ quote, forPdf = false }: QuotePreviewProps) {
  const logoUrl = useLogo();
  const createdDate = quote.created_at
    ? format(parseISO(quote.created_at), 'dd MMMM yyyy', { locale: fr })
    : format(new Date(), 'dd MMMM yyyy', { locale: fr });

  const validUntil = quote.created_at
    ? format(
        addDays(parseISO(quote.created_at), quote.validity_days),
        'dd MMMM yyyy',
        { locale: fr }
      )
    : format(addDays(new Date(), quote.validity_days), 'dd MMMM yyyy', {
        locale: fr,
      });

  const eventTypeLabel =
    EVENT_TYPES.find((t) => t.value === quote.event_type)?.label ||
    quote.event_type;

  const containerClass = forPdf
    ? 'bg-white p-8 text-black'
    : 'bg-[#FDF8F3] p-6 text-foreground';

  return (
    <div
      className={containerClass}
      style={{ fontFamily: 'system-ui, sans-serif' }}
    >
      {/* En-tête avec logo */}
      <div className="flex items-start justify-between mb-8 pb-6 border-b-2 border-[#c9a227]">
        <div className="flex items-center gap-4">
          {forPdf ? (
            // Pour le PDF, on utilise une URL absolue
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt="AureLuz Design"
              style={{ height: '80px', width: 'auto' }}
            />
          ) : (
            <Image
              src={logoUrl}
              alt="AureLuz Design"
              width={200}
              height={80}
              className="h-20 w-auto"
            />
          )}
        </div>
        <div className="text-right">
          <h1
            className="text-2xl font-bold"
            style={{ color: '#c9a227' }}
          >
            DEVIS
          </h1>
          <p className="text-lg font-mono mt-1">{quote.quote_number}</p>
          <p className="text-sm text-gray-600 mt-2">Date : {createdDate}</p>
          <p className="text-sm text-gray-600">Validité : {validUntil}</p>
        </div>
      </div>

      {/* Informations client */}
      <div className="mb-8 p-4 bg-white rounded-lg border border-gray-200">
        <h2
          className="text-sm font-semibold uppercase tracking-wide mb-3"
          style={{ color: '#c9a227' }}
        >
          Client
        </h2>
        <p className="font-semibold text-lg">{quote.client_name || '—'}</p>
        <p className="text-gray-600">{quote.client_email || '—'}</p>
        {quote.client_phone && (
          <p className="text-gray-600">{quote.client_phone}</p>
        )}
        {quote.event_date && (
          <p className="text-gray-600 mt-2">
            <span className="font-medium">Événement :</span>{' '}
            {eventTypeLabel && `${eventTypeLabel} - `}
            {format(parseISO(quote.event_date), 'dd MMMM yyyy', { locale: fr })}
          </p>
        )}
      </div>

      {/* Tableau des prestations */}
      <div className="mb-8">
        <table className="w-full border-collapse">
          <thead>
            <tr style={{ backgroundColor: '#1a1a1a', color: 'white' }}>
              <th className="text-left p-3 rounded-tl-lg">Description</th>
              <th className="text-center p-3 w-20">Qté</th>
              <th className="text-right p-3 w-32">Prix unit. HT</th>
              <th className="text-right p-3 w-32 rounded-tr-lg">Total HT</th>
            </tr>
          </thead>
          <tbody>
            {quote.items.map((item, index) => (
              <tr
                key={item.id}
                className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
              >
                <td className="p-3 border-b border-gray-200">
                  {item.description || '—'}
                </td>
                <td className="p-3 text-center border-b border-gray-200">
                  {item.quantity}
                </td>
                <td className="p-3 text-right border-b border-gray-200">
                  {new Intl.NumberFormat('fr-FR', {
                    style: 'currency',
                    currency: 'EUR',
                  }).format(item.unit_price)}
                </td>
                <td className="p-3 text-right border-b border-gray-200 font-medium">
                  {new Intl.NumberFormat('fr-FR', {
                    style: 'currency',
                    currency: 'EUR',
                  }).format(item.total)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totaux */}
      <div className="flex justify-end mb-8">
        <div className="w-64">
          <div className="flex justify-between py-2 border-b border-gray-200">
            <span className="text-gray-600">Sous-total HT</span>
            <span className="font-medium">
              {new Intl.NumberFormat('fr-FR', {
                style: 'currency',
                currency: 'EUR',
              }).format(quote.subtotal)}
            </span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-200">
            <span className="text-gray-600">TVA ({quote.vat_rate}%)</span>
            <span className="font-medium">
              {new Intl.NumberFormat('fr-FR', {
                style: 'currency',
                currency: 'EUR',
              }).format(quote.vat_amount)}
            </span>
          </div>
          <div
            className="flex justify-between py-3 text-lg"
            style={{ backgroundColor: '#c9a227', color: 'white', margin: '0 -8px', padding: '12px 8px', borderRadius: '8px' }}
          >
            <span className="font-semibold">Total TTC</span>
            <span className="font-bold">
              {new Intl.NumberFormat('fr-FR', {
                style: 'currency',
                currency: 'EUR',
              }).format(quote.total)}
            </span>
          </div>
        </div>
      </div>

      {/* Échéancier de paiement */}
      {quote.payment_schedule && quote.payment_schedule.length > 0 && (
        <div className="mb-8 p-4 bg-white rounded-lg border border-gray-200">
          <h2
            className="text-sm font-semibold uppercase tracking-wide mb-3"
            style={{ color: '#c9a227' }}
          >
            Échéancier de paiement
          </h2>
          <div className="space-y-2">
            {quote.payment_schedule.map((payment, index) => (
              <div
                key={index}
                className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0"
              >
                <span className="text-gray-700">
                  {payment.label} ({payment.percentage}%)
                </span>
                <span className="font-medium">
                  {new Intl.NumberFormat('fr-FR', {
                    style: 'currency',
                    currency: 'EUR',
                  }).format((quote.total * payment.percentage) / 100)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lien de paiement (affiché uniquement si le devis est envoyé) */}
      {quote.validation_token && quote.status === 'sent' && !forPdf && (
        <div className="mb-8 p-4 bg-[#c9a227]/10 rounded-lg border border-[#c9a227]/30">
          <h2
            className="text-sm font-semibold uppercase tracking-wide mb-2"
            style={{ color: '#c9a227' }}
          >
            Lien de paiement
          </h2>
          <p className="text-sm text-gray-600 mb-2">
            Partagez ce lien avec le client pour qu&apos;il puisse payer en ligne :
          </p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={`${typeof window !== 'undefined' ? window.location.origin : ''}/devis/${quote.validation_token}`}
              className="flex-1 px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg font-mono"
            />
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(
                  `${window.location.origin}/devis/${quote.validation_token}`
                );
              }}
              className="px-3 py-2 text-sm bg-[#c9a227] text-white rounded-lg hover:bg-[#b8922a] transition-colors"
            >
              Copier
            </button>
          </div>
        </div>
      )}

      {/* Notes */}
      {quote.notes && (
        <div className="mb-8 p-4 bg-white rounded-lg border border-gray-200">
          <h2
            className="text-sm font-semibold uppercase tracking-wide mb-2"
            style={{ color: '#c9a227' }}
          >
            Conditions
          </h2>
          <p className="text-gray-600 whitespace-pre-line text-sm">
            {quote.notes}
          </p>
        </div>
      )}

      {/* Pied de page */}
      <div
        className="text-center pt-6 border-t border-gray-200 text-sm text-gray-500"
      >
        <p className="font-medium" style={{ color: '#c9a227' }}>
          AureLuz Design - Décoration sur mesure
        </p>
        <p className="mt-1">
          contact@aureluzdesign.fr | www.aureluzdesign.fr
        </p>
      </div>
    </div>
  );
}
