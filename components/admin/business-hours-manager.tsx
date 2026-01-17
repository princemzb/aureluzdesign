'use client';

import { useState } from 'react';
import { Clock, Save, Loader2, CheckCircle, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  updateAllBusinessHours,
  applyHoursToAllDays,
  type BusinessHour,
} from '@/lib/actions/business-hours.actions';

const DAY_NAMES = [
  'Dimanche',
  'Lundi',
  'Mardi',
  'Mercredi',
  'Jeudi',
  'Vendredi',
  'Samedi',
];

// Reorder to start with Monday (index 1) and end with Sunday (index 0)
const ORDERED_DAYS = [1, 2, 3, 4, 5, 6, 0];

interface BusinessHoursManagerProps {
  businessHours: BusinessHour[];
}

export function BusinessHoursManager({ businessHours }: BusinessHoursManagerProps) {
  // Create a map for easy access by day_of_week
  const initialHoursMap = new Map(
    businessHours.map((h) => [h.day_of_week, h])
  );

  const [hours, setHours] = useState<Map<number, BusinessHour>>(initialHoursMap);
  const [globalOpenTime, setGlobalOpenTime] = useState('09:00');
  const [globalCloseTime, setGlobalCloseTime] = useState('18:00');
  const [isSaving, setIsSaving] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const toggleDay = (dayOfWeek: number) => {
    setHours((prev) => {
      const newMap = new Map(prev);
      const current = newMap.get(dayOfWeek);
      if (current) {
        newMap.set(dayOfWeek, { ...current, is_open: !current.is_open });
      }
      return newMap;
    });
  };

  const updateDayHours = (dayOfWeek: number, field: 'open_time' | 'close_time', value: string) => {
    setHours((prev) => {
      const newMap = new Map(prev);
      const current = newMap.get(dayOfWeek);
      if (current) {
        newMap.set(dayOfWeek, { ...current, [field]: value });
      }
      return newMap;
    });
  };

  const handleApplyToAll = async () => {
    setIsApplying(true);
    setMessage(null);

    // Update local state first
    setHours((prev) => {
      const newMap = new Map(prev);
      for (const [day, hour] of newMap) {
        if (hour.is_open) {
          newMap.set(day, { ...hour, open_time: globalOpenTime, close_time: globalCloseTime });
        }
      }
      return newMap;
    });

    const result = await applyHoursToAllDays(globalOpenTime, globalCloseTime, false);

    if (result.success) {
      setMessage({ type: 'success', text: 'Horaires appliqués à tous les jours ouverts' });
    } else {
      setMessage({ type: 'error', text: result.error || 'Erreur' });
    }

    setIsApplying(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);

    const hoursArray = Array.from(hours.values()).map((h) => ({
      day_of_week: h.day_of_week,
      is_open: h.is_open,
      open_time: h.open_time,
      close_time: h.close_time,
    }));

    const result = await updateAllBusinessHours(hoursArray);

    if (result.success) {
      setMessage({ type: 'success', text: 'Modifications enregistrées avec succès' });
    } else {
      setMessage({ type: 'error', text: result.error || 'Erreur lors de la sauvegarde' });
    }

    setIsSaving(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-background rounded-xl border border-border p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Clock className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="font-medium text-foreground">Configuration des horaires</h2>
            <p className="text-sm text-muted-foreground">
              Définissez vos jours et heures d&apos;ouverture pour les réservations.
            </p>
          </div>
        </div>

        {/* Global hours section */}
        <div className="bg-secondary/30 rounded-lg p-4 mb-6">
          <Label className="text-sm font-medium mb-3 block">Plages horaires globales</Label>
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <Label htmlFor="global-open" className="text-xs text-muted-foreground">
                Heure de début
              </Label>
              <Input
                id="global-open"
                type="time"
                value={globalOpenTime}
                onChange={(e) => setGlobalOpenTime(e.target.value)}
                className="w-32"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="global-close" className="text-xs text-muted-foreground">
                Heure de fin
              </Label>
              <Input
                id="global-close"
                type="time"
                value={globalCloseTime}
                onChange={(e) => setGlobalCloseTime(e.target.value)}
                className="w-32"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleApplyToAll}
              disabled={isApplying}
              className="gap-2"
            >
              {isApplying ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              Appliquer à tous les jours ouverts
            </Button>
          </div>
        </div>

        {/* Days list */}
        <div className="space-y-2">
          <Label className="text-sm font-medium mb-3 block">Jours ouvrables</Label>
          {ORDERED_DAYS.map((dayIndex) => {
            const hour = hours.get(dayIndex);
            if (!hour) return null;

            return (
              <div
                key={dayIndex}
                className={`flex items-center gap-4 p-4 rounded-lg border transition-colors ${
                  hour.is_open
                    ? 'bg-green-50 border-green-200'
                    : 'bg-secondary/30 border-border'
                }`}
              >
                {/* Toggle */}
                <button
                  type="button"
                  onClick={() => toggleDay(dayIndex)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    hour.is_open ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      hour.is_open ? 'left-7' : 'left-1'
                    }`}
                  />
                </button>

                {/* Day name */}
                <span className={`w-24 font-medium ${hour.is_open ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {DAY_NAMES[dayIndex]}
                </span>

                {/* Hours inputs */}
                {hour.is_open ? (
                  <div className="flex items-center gap-2">
                    <Input
                      type="time"
                      value={hour.open_time}
                      onChange={(e) => updateDayHours(dayIndex, 'open_time', e.target.value)}
                      className="w-28"
                    />
                    <span className="text-muted-foreground">-</span>
                    <Input
                      type="time"
                      value={hour.close_time}
                      onChange={(e) => updateDayHours(dayIndex, 'close_time', e.target.value)}
                      className="w-28"
                    />
                  </div>
                ) : (
                  <span className="text-muted-foreground text-sm">Fermé</span>
                )}
              </div>
            );
          })}
        </div>

        {/* Message */}
        {message && (
          <div
            className={`mt-4 p-3 rounded-lg text-sm flex items-center gap-2 ${
              message.type === 'success'
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}
          >
            {message.type === 'success' && <CheckCircle className="h-4 w-4" />}
            {message.text}
          </div>
        )}

        {/* Save button */}
        <div className="mt-6 flex justify-end">
          <Button onClick={handleSave} disabled={isSaving} className="gap-2">
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Enregistrer les modifications
          </Button>
        </div>
      </div>

      {/* Info box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
        <p className="font-medium mb-1">Comment ça fonctionne :</p>
        <ul className="list-disc list-inside space-y-1 text-blue-700">
          <li>Chaque créneau de réservation dure 1 heure</li>
          <li>Ex: 09:00-18:00 = créneaux à 09:00, 10:00, 11:00... jusqu&apos;à 17:00</li>
          <li>Les jours désactivés n&apos;apparaissent pas dans le calendrier de réservation</li>
          <li>Utilisez les &quot;créneaux ouverts&quot; pour des ouvertures exceptionnelles</li>
        </ul>
      </div>
    </div>
  );
}
