'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Trash2,
  Save,
  Loader2,
  Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createQuote, updateQuote } from '@/lib/actions/quotes.actions';
import { QuotePreview } from './quote-preview';
import { EVENT_TYPES } from '@/lib/utils/constants';
import type { Quote, PaymentScheduleItem } from '@/lib/types';

interface QuoteFormProps {
  quote?: Quote;
  mode: 'create' | 'edit';
}

interface FormItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
}

export function QuoteForm({ quote, mode }: QuoteFormProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [clientName, setClientName] = useState(quote?.client_name || '');
  const [clientEmail, setClientEmail] = useState(quote?.client_email || '');
  const [clientPhone, setClientPhone] = useState(quote?.client_phone || '');
  const [eventDate, setEventDate] = useState(quote?.event_date || '');
  const [eventType, setEventType] = useState(quote?.event_type || '');
  const [vatRate, setVatRate] = useState(quote?.vat_rate || 20);
  const [notes, setNotes] = useState(quote?.notes || '');
  const [validityDays, setValidityDays] = useState(quote?.validity_days || 30);
  const [items, setItems] = useState<FormItem[]>(
    quote?.items?.length
      ? quote.items.map((item) => ({
          id: item.id,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
        }))
      : [{ id: '1', description: '', quantity: 1, unit_price: 0 }]
  );

  // Échéancier de paiement (charger depuis le devis existant ou utiliser défaut)
  const [paymentSchedule, setPaymentSchedule] = useState<PaymentScheduleItem[]>(
    quote?.payment_schedule && quote.payment_schedule.length > 0
      ? quote.payment_schedule
      : [
          { label: 'Acompte', percentage: 30 },
          { label: 'Solde', percentage: 70 },
        ]
  );

  // Calculs
  const subtotal = items.reduce(
    (sum, item) => sum + item.quantity * item.unit_price,
    0
  );
  const vatAmount = subtotal * (vatRate / 100);
  const total = subtotal + vatAmount;

  const addItem = () => {
    setItems([
      ...items,
      {
        id: Math.random().toString(36).substring(2, 11),
        description: '',
        quantity: 1,
        unit_price: 0,
      },
    ]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter((item) => item.id !== id));
    }
  };

  const updateItem = (
    id: string,
    field: keyof FormItem,
    value: string | number
  ) => {
    setItems(
      items.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  // Fonctions pour gérer l'échéancier
  const addPaymentInstallment = () => {
    setPaymentSchedule([
      ...paymentSchedule,
      { label: `Paiement ${paymentSchedule.length + 1}`, percentage: 0 },
    ]);
  };

  const removePaymentInstallment = (index: number) => {
    if (paymentSchedule.length > 1) {
      setPaymentSchedule(paymentSchedule.filter((_, i) => i !== index));
    }
  };

  const updatePaymentInstallment = (
    index: number,
    field: keyof PaymentScheduleItem,
    value: string | number
  ) => {
    setPaymentSchedule(
      paymentSchedule.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    );
  };

  const totalPaymentPercent = paymentSchedule.reduce(
    (sum, item) => sum + item.percentage,
    0
  );

  const isPaymentScheduleValid = Math.abs(totalPaymentPercent - 100) < 0.01;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!clientName || !clientEmail || items.some((i) => !i.description)) {
      setError('Veuillez remplir tous les champs obligatoires.');
      return;
    }

    if (!isPaymentScheduleValid) {
      setError('Le total des pourcentages de paiement doit être égal à 100%.');
      return;
    }

    setIsSaving(true);

    const input = {
      client_name: clientName,
      client_email: clientEmail,
      client_phone: clientPhone || undefined,
      event_date: eventDate || undefined,
      event_type: eventType || undefined,
      items: items.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
      })),
      vat_rate: vatRate,
      notes: notes || undefined,
      validity_days: validityDays,
      deposit_percent: paymentSchedule[0]?.percentage || 30,
      payment_schedule: paymentSchedule,
    };

    const result =
      mode === 'create'
        ? await createQuote(input)
        : await updateQuote(quote!.id, input);

    setIsSaving(false);

    if (result.success) {
      router.push('/admin/devis');
    } else {
      setError(result.error || 'Une erreur est survenue');
    }
  };

  const quoteData: Quote = {
    id: quote?.id || 'preview',
    quote_number: quote?.quote_number || 'XXXX-XXXX',
    client_name: clientName,
    client_email: clientEmail,
    client_phone: clientPhone,
    event_date: eventDate,
    event_type: eventType,
    items: items.map((item) => ({
      ...item,
      total: item.quantity * item.unit_price,
    })),
    vat_rate: vatRate,
    subtotal,
    vat_amount: vatAmount,
    total,
    notes,
    validity_days: validityDays,
    status: quote?.status || 'draft',
    created_at: quote?.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
    sent_at: quote?.sent_at || null,
    accepted_at: quote?.accepted_at || null,
    expires_at: quote?.expires_at || null,
    // Payment fields
    deposit_percent: paymentSchedule[0]?.percentage || 30,
    deposit_amount: quote?.deposit_amount || null,
    validation_token: quote?.validation_token || null,
    stripe_payment_intent_id: quote?.stripe_payment_intent_id || null,
    stripe_session_id: quote?.stripe_session_id || null,
    paid_at: quote?.paid_at || null,
    paid_amount: quote?.paid_amount || null,
    payment_schedule: paymentSchedule,
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Formulaire */}
      <div className="space-y-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informations client */}
          <div className="bg-background rounded-xl border border-border p-6 space-y-4">
            <h2 className="font-medium text-lg">Informations client</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="clientName">Nom *</Label>
                <Input
                  id="clientName"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Prénom Nom"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clientEmail">Email *</Label>
                <Input
                  id="clientEmail"
                  type="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  placeholder="email@exemple.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clientPhone">Téléphone</Label>
                <Input
                  id="clientPhone"
                  type="tel"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="06 12 34 56 78"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="eventDate">Date de l&apos;événement</Label>
                <Input
                  id="eventDate"
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="eventType">Type d&apos;événement</Label>
                <Select value={eventType} onValueChange={setEventType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner..." />
                  </SelectTrigger>
                  <SelectContent>
                    {EVENT_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Lignes du devis */}
          <div className="bg-background rounded-xl border border-border p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-medium text-lg">Prestations</h2>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addItem}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Ajouter
              </Button>
            </div>

            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="grid grid-cols-12 gap-2 items-start p-3 bg-secondary/30 rounded-lg"
                >
                  <div className="col-span-12 sm:col-span-6">
                    <Label className="text-xs text-muted-foreground">
                      Description *
                    </Label>
                    <Input
                      value={item.description}
                      onChange={(e) =>
                        updateItem(item.id, 'description', e.target.value)
                      }
                      placeholder="Description de la prestation"
                      className="mt-1"
                    />
                  </div>
                  <div className="col-span-4 sm:col-span-2">
                    <Label className="text-xs text-muted-foreground">Qté</Label>
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) =>
                        updateItem(item.id, 'quantity', parseInt(e.target.value) || 1)
                      }
                      onFocus={(e) => e.target.select()}
                      className="mt-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                  <div className="col-span-6 sm:col-span-3">
                    <Label className="text-xs text-muted-foreground">
                      Prix unitaire HT
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unit_price}
                      onChange={(e) =>
                        updateItem(
                          item.id,
                          'unit_price',
                          parseFloat(e.target.value) || 0
                        )
                      }
                      onFocus={(e) => e.target.select()}
                      className="mt-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-1 flex items-end justify-end pb-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem(item.id)}
                      disabled={items.length === 1}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* TVA et options */}
          <div className="bg-background rounded-xl border border-border p-6 space-y-4">
            <h2 className="font-medium text-lg">Options</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="vatRate">Taux de TVA (%)</Label>
                <Input
                  id="vatRate"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={vatRate}
                  onChange={(e) => setVatRate(parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="validityDays">Validité (jours)</Label>
                <Input
                  id="validityDays"
                  type="number"
                  min="1"
                  value={validityDays}
                  onChange={(e) =>
                    setValidityDays(parseInt(e.target.value) || 30)
                  }
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="notes">Notes / Conditions</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Conditions particulières, modalités de paiement..."
                  rows={3}
                />
              </div>
            </div>
          </div>

          {/* Échéancier de paiement */}
          <div className="bg-background rounded-xl border border-border p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-medium text-lg">Échéancier de paiement</h2>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addPaymentInstallment}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Ajouter
              </Button>
            </div>

            <div className="space-y-3">
              {paymentSchedule.map((installment, index) => (
                <div
                  key={index}
                  className="grid grid-cols-12 gap-2 items-center p-3 bg-secondary/30 rounded-lg"
                >
                  <div className="col-span-6 sm:col-span-7">
                    <Label className="text-xs text-muted-foreground">
                      Libellé
                    </Label>
                    <Input
                      value={installment.label}
                      onChange={(e) =>
                        updatePaymentInstallment(index, 'label', e.target.value)
                      }
                      placeholder="Ex: Acompte, Solde..."
                      className="mt-1"
                    />
                  </div>
                  <div className="col-span-4 sm:col-span-4">
                    <Label className="text-xs text-muted-foreground">
                      Pourcentage
                    </Label>
                    <div className="relative mt-1">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={installment.percentage}
                        onChange={(e) =>
                          updatePaymentInstallment(
                            index,
                            'percentage',
                            parseFloat(e.target.value) || 0
                          )
                        }
                        className="pr-8"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                        %
                      </span>
                    </div>
                  </div>
                  <div className="col-span-2 sm:col-span-1 flex items-end justify-end pb-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removePaymentInstallment(index)}
                      disabled={paymentSchedule.length <= 1}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Indicateur de total */}
            <div
              className={`flex items-center justify-between p-3 rounded-lg ${
                isPaymentScheduleValid
                  ? 'bg-green-50 border border-green-200'
                  : 'bg-red-50 border border-red-200'
              }`}
            >
              <span
                className={`text-sm font-medium ${
                  isPaymentScheduleValid ? 'text-green-700' : 'text-red-700'
                }`}
              >
                Total des échéances
              </span>
              <span
                className={`font-bold ${
                  isPaymentScheduleValid ? 'text-green-700' : 'text-red-700'
                }`}
              >
                {totalPaymentPercent.toFixed(0)}%
                {!isPaymentScheduleValid && ' (doit être 100%)'}
              </span>
            </div>

            {/* Aperçu des montants */}
            {total > 0 && (
              <div className="space-y-2 pt-2 border-t border-border">
                <p className="text-xs text-muted-foreground font-medium">
                  Aperçu des montants :
                </p>
                {paymentSchedule.map((installment, index) => (
                  <div
                    key={index}
                    className="flex justify-between text-sm"
                  >
                    <span className="text-muted-foreground">
                      {installment.label} ({installment.percentage}%)
                    </span>
                    <span className="font-medium">
                      {new Intl.NumberFormat('fr-FR', {
                        style: 'currency',
                        currency: 'EUR',
                      }).format((total * installment.percentage) / 100)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Totaux */}
          <div className="bg-primary/5 rounded-xl border border-primary/20 p-6">
            <div className="space-y-2 text-right">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sous-total HT</span>
                <span className="font-medium">
                  {new Intl.NumberFormat('fr-FR', {
                    style: 'currency',
                    currency: 'EUR',
                  }).format(subtotal)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">TVA ({vatRate}%)</span>
                <span className="font-medium">
                  {new Intl.NumberFormat('fr-FR', {
                    style: 'currency',
                    currency: 'EUR',
                  }).format(vatAmount)}
                </span>
              </div>
              <div className="flex justify-between text-lg pt-2 border-t border-primary/20">
                <span className="font-semibold">Total TTC</span>
                <span className="font-bold text-primary">
                  {new Intl.NumberFormat('fr-FR', {
                    style: 'currency',
                    currency: 'EUR',
                  }).format(total)}
                </span>
              </div>
            </div>
          </div>

          {/* Erreur */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-3 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/admin/devis')}
            >
              Annuler
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowPreview(!showPreview)}
              className="gap-2 lg:hidden"
            >
              <Eye className="h-4 w-4" />
              {showPreview ? 'Masquer' : 'Aperçu'}
            </Button>
            <Button type="submit" disabled={isSaving} className="gap-2">
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  {mode === 'create' ? 'Créer le devis' : 'Enregistrer'}
                </>
              )}
            </Button>
          </div>
        </form>
      </div>

      {/* Prévisualisation */}
      <div
        className={`${showPreview ? 'block' : 'hidden'} lg:block sticky top-4`}
      >
        <div className="bg-background rounded-xl border border-border p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-medium">Aperçu du devis</h2>
          </div>
          <div className="border border-border rounded-lg overflow-hidden">
            <QuotePreview quote={quoteData} />
          </div>
        </div>
      </div>
    </div>
  );
}
