export const BUSINESS_CONFIG = {
  // Horaires par défaut
  DEFAULT_OPEN_TIME: '09:00',
  DEFAULT_CLOSE_TIME: '18:00',

  // Durée des créneaux (en minutes)
  SLOT_DURATION: 60,

  // Délai minimum de réservation (en heures)
  MIN_BOOKING_NOTICE: 24,

  // Nombre max de mois à l'avance pour réserver
  MAX_BOOKING_MONTHS_AHEAD: 3,

  // Limite de photos dans la galerie
  MAX_GALLERY_PHOTOS: 20,

  // Taille max des uploads (en bytes)
  MAX_UPLOAD_SIZE: 5 * 1024 * 1024, // 5MB

  // Formats d'image acceptés
  ACCEPTED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
} as const;

export const EVENT_TYPES = [
  { value: 'signature', label: 'Prestation Signature' },
  { value: 'instants', label: 'Prestation Instants Précieux' },
  { value: 'coaching', label: 'Coaching' },
] as const;

export const APPOINTMENT_STATUSES = {
  pending: { label: 'En attente', color: 'yellow' },
  confirmed: { label: 'Confirmé', color: 'green' },
  cancelled: { label: 'Annulé', color: 'red' },
} as const;

export const PHOTO_CATEGORIES = [
  { value: 'signature', label: 'Prestation Signature' },
  { value: 'instants', label: 'Prestation Instants Précieux' },
  { value: 'coaching', label: 'Coaching' },
] as const;
