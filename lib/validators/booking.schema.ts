import { z } from 'zod';

export const bookingSchema = z.object({
  client_name: z
    .string()
    .min(2, 'Le nom doit contenir au moins 2 caractères')
    .max(100, 'Le nom est trop long'),

  client_email: z
    .string()
    .email('Email invalide'),

  client_phone: z
    .string()
    .regex(
      /^(\+33|0)[1-9](\s?\d{2}){4}$/,
      'Numéro de téléphone invalide (ex: 06 12 34 56 78)'
    ),

  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format de date invalide'),

  start_time: z
    .string()
    .regex(/^(0[9]|1[0-7]):00$/, 'Créneau horaire invalide'),

  event_type: z.enum(['signature', 'instants', 'coaching'], {
    errorMap: () => ({ message: 'Type d\'événement invalide' }),
  }),

  message: z
    .string()
    .max(1000, 'Le message est trop long')
    .optional()
    .or(z.literal('')),
});

export type BookingFormData = z.infer<typeof bookingSchema>;

export const bookingFormDefaultValues: Partial<BookingFormData> = {
  client_name: '',
  client_email: '',
  client_phone: '',
  date: '',
  start_time: '',
  event_type: undefined,
  message: '',
};
