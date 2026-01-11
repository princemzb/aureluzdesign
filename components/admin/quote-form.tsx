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
import type { Quote } from '@/lib/types';

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!clientName || !clientEmail || items.some((i) => !i.description)) {
      setError('Veuillez remplir tous les champs obligatoires.');
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
    expires_at: quote?.expires_at || null,
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
                      className="mt-1"
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
                      className="mt-1"
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
