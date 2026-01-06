'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { User, Mail, Phone, MessageSquare } from 'lucide-react';
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
import { cn } from '@/lib/utils/cn';
import { bookingSchema, type BookingFormData } from '@/lib/validators/booking.schema';
import { EVENT_TYPES } from '@/lib/utils/constants';

interface BookingFormProps {
  date: string;
  time: string;
  onSubmit: (data: BookingFormData) => Promise<void>;
  isSubmitting?: boolean;
}

export function BookingForm({
  date,
  time,
  onSubmit,
  isSubmitting = false,
}: BookingFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      date,
      start_time: time,
      client_name: '',
      client_email: '',
      client_phone: '',
      event_type: undefined,
      message: '',
    },
  });

  const eventType = watch('event_type');

  const handleFormSubmit = async (data: BookingFormData) => {
    await onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Hidden fields */}
      <input type="hidden" {...register('date')} />
      <input type="hidden" {...register('start_time')} />

      {/* Name field */}
      <div className="space-y-2">
        <Label htmlFor="client_name" className="flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          Nom complet <span className="text-destructive">*</span>
        </Label>
        <Input
          id="client_name"
          placeholder="Jean Dupont"
          {...register('client_name')}
          className={cn(errors.client_name && 'border-destructive')}
        />
        {errors.client_name && (
          <p className="text-sm text-destructive">{errors.client_name.message}</p>
        )}
      </div>

      {/* Email field */}
      <div className="space-y-2">
        <Label htmlFor="client_email" className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-muted-foreground" />
          Email <span className="text-destructive">*</span>
        </Label>
        <Input
          id="client_email"
          type="email"
          placeholder="jean.dupont@example.com"
          {...register('client_email')}
          className={cn(errors.client_email && 'border-destructive')}
        />
        {errors.client_email && (
          <p className="text-sm text-destructive">{errors.client_email.message}</p>
        )}
      </div>

      {/* Phone field */}
      <div className="space-y-2">
        <Label htmlFor="client_phone" className="flex items-center gap-2">
          <Phone className="h-4 w-4 text-muted-foreground" />
          Téléphone <span className="text-destructive">*</span>
        </Label>
        <Input
          id="client_phone"
          type="tel"
          placeholder="06 12 34 56 78"
          {...register('client_phone')}
          className={cn(errors.client_phone && 'border-destructive')}
        />
        {errors.client_phone && (
          <p className="text-sm text-destructive">{errors.client_phone.message}</p>
        )}
      </div>

      {/* Event type field */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          Type d&apos;événement <span className="text-destructive">*</span>
        </Label>
        <Select
          value={eventType}
          onValueChange={(value) =>
            setValue('event_type', value as BookingFormData['event_type'], {
              shouldValidate: true,
            })
          }
        >
          <SelectTrigger
            className={cn(errors.event_type && 'border-destructive')}
          >
            <SelectValue placeholder="Sélectionnez un type" />
          </SelectTrigger>
          <SelectContent>
            {EVENT_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.event_type && (
          <p className="text-sm text-destructive">{errors.event_type.message}</p>
        )}
      </div>

      {/* Message field */}
      <div className="space-y-2">
        <Label htmlFor="message" className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
          Message (optionnel)
        </Label>
        <Textarea
          id="message"
          placeholder="Décrivez brièvement votre projet ou vos attentes..."
          {...register('message')}
          className={cn(errors.message && 'border-destructive')}
        />
        {errors.message && (
          <p className="text-sm text-destructive">{errors.message.message}</p>
        )}
      </div>

      {/* Submit button */}
      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Envoi en cours...' : 'Confirmer la réservation'}
      </Button>

      {/* Privacy notice */}
      <p className="text-xs text-muted-foreground text-center">
        En soumettant ce formulaire, vous acceptez que vos données soient
        utilisées pour traiter votre demande de rendez-vous.
      </p>
    </form>
  );
}
