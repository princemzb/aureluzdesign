'use client';

import * as React from 'react';
import { Clock } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils/cn';

interface TimePickerProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

// Générer les heures (00-23)
const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));

// Générer les minutes par tranches de 15
const minutes = ['00', '15', '30', '45'];

export function TimePicker({
  value,
  onChange,
  disabled,
  className,
}: TimePickerProps) {
  // Parse la valeur actuelle (format HH:MM ou HH:MM:SS)
  const [hour, minute] = React.useMemo(() => {
    if (!value) return ['', ''];
    const parts = value.split(':');
    return [parts[0] || '', parts[1] || ''];
  }, [value]);

  const handleHourChange = (newHour: string) => {
    const newMinute = minute || '00';
    onChange(`${newHour}:${newMinute}`);
  };

  const handleMinuteChange = (newMinute: string) => {
    const newHour = hour || '09';
    onChange(`${newHour}:${newMinute}`);
  };

  const handleClear = () => {
    onChange('');
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />

      {/* Heures */}
      <Select value={hour} onValueChange={handleHourChange} disabled={disabled}>
        <SelectTrigger className="w-20">
          <SelectValue placeholder="HH" />
        </SelectTrigger>
        <SelectContent>
          {hours.map((h) => (
            <SelectItem key={h} value={h}>
              {h}h
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <span className="text-muted-foreground">:</span>

      {/* Minutes */}
      <Select value={minute} onValueChange={handleMinuteChange} disabled={disabled}>
        <SelectTrigger className="w-20">
          <SelectValue placeholder="MM" />
        </SelectTrigger>
        <SelectContent>
          {minutes.map((m) => (
            <SelectItem key={m} value={m}>
              {m}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Bouton effacer */}
      {value && (
        <button
          type="button"
          onClick={handleClear}
          disabled={disabled}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Effacer
        </button>
      )}
    </div>
  );
}
