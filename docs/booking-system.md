# Systeme de Reservation

## Vue d'ensemble

Systeme de prise de rendez-vous en ligne avec :
- Calendrier interactif
- Selection de creneaux horaires
- Formulaire de contact
- Confirmation automatique par email
- Gestion admin (confirmation, annulation)

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│    ┌──────────────────────────────────────────────────────────────────────┐ │
│    │                    BookingWizard (Client Component)                   │ │
│    │                   components/booking/booking-wizard.tsx               │ │
│    │                                                                       │ │
│    │   Step 1          Step 2          Step 3          Step 4             │ │
│    │   ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────────┐       │ │
│    │   │Calendar │ -> │TimeSlots│ -> │  Form   │ -> │Confirmation │       │ │
│    │   │  Date   │    │  Hour   │    │ Contact │    │   Success   │       │ │
│    │   └─────────┘    └─────────┘    └─────────┘    └─────────────┘       │ │
│    │                                                                       │ │
│    └───────────────────────────────┬───────────────────────────────────────┘ │
│                                    │                                         │
│                            ┌───────▼───────┐                                 │
│                            │ Server Action │                                 │
│                            │createAppointment                                │
│                            └───────┬───────┘                                 │
└────────────────────────────────────┼─────────────────────────────────────────┘
                                     │
┌────────────────────────────────────┼─────────────────────────────────────────┐
│                               BACKEND                                        │
├────────────────────────────────────┼─────────────────────────────────────────┤
│                                    │                                         │
│    ┌───────────────────────────────▼───────────────────────────────────────┐│
│    │                       booking.actions.ts                               ││
│    │  1. Validation Zod                                                     ││
│    │  2. Verification disponibilite                                         ││
│    │  3. Insert Supabase                                                    ││
│    │  4. Envoi emails                                                       ││
│    │  5. Revalidation cache                                                 ││
│    └───────────────────────────────┬───────────────────────────────────────┘│
│                                    │                                         │
│    ┌─────────────┐    ┌────────────▼───────────┐    ┌─────────────┐         │
│    │  Supabase   │ <- │     appointments       │ -> │   Resend    │         │
│    │   (data)    │    │     blocked_slots      │    │  (emails)   │         │
│    │             │    │     business_hours     │    │             │         │
│    └─────────────┘    └────────────────────────┘    └─────────────┘         │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

## Fichiers impliques

| Fichier | Role |
|---------|------|
| `components/booking/booking-wizard.tsx` | Orchestrateur multi-etapes |
| `components/booking/booking-calendar.tsx` | Calendrier avec dates desactivees |
| `components/booking/time-slots.tsx` | Grille de creneaux horaires |
| `components/booking/booking-form.tsx` | Formulaire de contact |
| `components/booking/booking-confirmation.tsx` | Page de confirmation |
| `lib/actions/booking.actions.ts` | Server Actions (creation, disponibilites) |
| `lib/validators/booking.schema.ts` | Schema Zod de validation |
| `lib/services/email.service.ts` | Envoi des emails de confirmation |
| `supabase/migrations/001_create_appointments.sql` | Tables SQL |

## Concepts cles

### 1. Wizard Pattern (multi-etapes)

Le `BookingWizard` gere un etat de navigation entre plusieurs etapes :

```typescript
type BookingStep = 'date' | 'time' | 'form' | 'confirmation';

export function BookingWizard() {
  const [step, setStep] = useState<BookingStep>('date');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setStep('time');  // Passage a l'etape suivante
  };

  // Rendu conditionnel selon l'etape
  return (
    <>
      {step === 'date' && <BookingCalendar onDateSelect={handleDateSelect} />}
      {step === 'time' && <TimeSlots onTimeSelect={handleTimeSelect} />}
      {step === 'form' && <BookingForm onSubmit={handleFormSubmit} />}
      {step === 'confirmation' && <BookingConfirmation />}
    </>
  );
}
```

**Avantages du pattern Wizard :**
- UX simplifiee (une tache a la fois)
- Validation progressive
- Possibilite de revenir en arriere
- Tracking du funnel analytics integre

### 2. Validation avec Zod

Schema de validation cote serveur ET client :

```typescript
// lib/validators/booking.schema.ts
import { z } from 'zod';

export const bookingSchema = z.object({
  client_name: z
    .string()
    .min(2, 'Le nom doit contenir au moins 2 caracteres')
    .max(100, 'Le nom est trop long'),

  client_email: z
    .string()
    .email('Email invalide'),

  client_phone: z
    .string()
    .regex(
      /^(\+33|0)[1-9](\s?\d{2}){4}$/,
      'Numero de telephone invalide (ex: 06 12 34 56 78)'
    ),

  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format de date invalide'),

  start_time: z
    .string()
    .regex(/^(0[9]|1[0-7]):00$/, 'Creneau horaire invalide'),

  event_type: z.enum(['signature', 'instants', 'coaching']),

  message: z
    .string()
    .max(1000, 'Le message est trop long')
    .optional(),
});

export type BookingFormData = z.infer<typeof bookingSchema>;
```

**Utilisation dans le Server Action :**

```typescript
export async function createAppointment(data: BookingFormData) {
  try {
    // Validation - leve une exception si invalide
    const validatedData = bookingSchema.parse(data);
    // ...
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return { success: false, error: 'Donnees invalides' };
    }
  }
}
```

### 3. Server Action avec Double Verification

Le Server Action verifie la disponibilite AVANT et PENDANT l'insertion :

```typescript
export async function createAppointment(data: BookingFormData) {
  // 1. Validation Zod
  const validatedData = bookingSchema.parse(data);

  // 2. Verification disponibilite (requete SELECT)
  const { data: existingAppointment } = await supabase
    .from('appointments')
    .select('id')
    .eq('date', validatedData.date)
    .eq('start_time', validatedData.start_time)
    .neq('status', 'cancelled')
    .single();

  if (existingAppointment) {
    return { success: false, error: 'Creneau plus disponible' };
  }

  // 3. Verification creneaux bloques
  const { data: blockedSlots } = await supabase
    .from('blocked_slots')
    .select('start_time, end_time')
    .eq('date', validatedData.date);

  // ... verification si le creneau est dans une plage bloquee

  // 4. Insertion (contrainte UNIQUE en base)
  const { error: insertError } = await supabase
    .from('appointments')
    .insert({ ... });

  // Gestion du cas de race condition (2 users reservent en meme temps)
  if (insertError?.code === '23505') {
    return { success: false, error: 'Creneau vient d etre reserve' };
  }

  // 5. Envoi emails
  await sendBookingConfirmation(validatedData);
  await sendAdminNotification(validatedData);

  // 6. Revalidation cache Next.js
  revalidatePath('/booking');
  revalidatePath('/admin/appointments');

  return { success: true };
}
```

**Pourquoi double verification :**
- SELECT avant = UX rapide, evite de remplir un formulaire pour rien
- Contrainte UNIQUE en base = protection contre les race conditions

### 4. Fetch des Creneaux Disponibles

```typescript
export async function getAvailableSlots(date: string) {
  const supabase = await createClient();
  const dayOfWeek = new Date(date).getDay();

  // 1. Horaires d'ouverture du jour
  const { data: hours } = await supabase
    .from('business_hours')
    .select('*')
    .eq('day_of_week', dayOfWeek)
    .single();

  if (!hours?.is_open) {
    return { slots: [], isOpen: false };
  }

  // 2. RDV existants
  const { data: appointments } = await supabase
    .from('appointments')
    .select('start_time')
    .eq('date', date)
    .neq('status', 'cancelled');

  // 3. Creneaux bloques
  const { data: blocked } = await supabase
    .from('blocked_slots')
    .select('start_time, end_time')
    .eq('date', date);

  // 4. Generation des slots disponibles
  const slots = [];
  for (let hour = openHour; hour < closeHour; hour++) {
    const timeStr = `${String(hour).padStart(2, '0')}:00`;
    slots.push({
      time: timeStr,
      available: !isBooked(timeStr) && !isBlocked(timeStr),
    });
  }

  return { slots, isOpen: true };
}
```

### 5. Integration Analytics (Funnel)

Chaque etape du wizard track le funnel :

```typescript
const handleDateSelect = (date: Date) => {
  setSelectedDate(date);
  setStep('time');
  trackFunnelStep('date_selected');  // <- Analytics
};

const handleTimeSelect = (time: string) => {
  setSelectedTime(time);
  setStep('form');
  trackFunnelStep('time_selected');
  trackFunnelStep('form_started');
};

const handleFormSubmit = async (data: BookingFormData) => {
  const result = await onSubmit(data);
  if (result.success) {
    setStep('confirmation');
    trackFunnelStep('form_submitted');
    trackFunnelStep('confirmation_viewed');
  }
};
```

## Schema de la base

```sql
-- Table principale
CREATE TABLE appointments (
    id UUID PRIMARY KEY,
    client_name VARCHAR(100) NOT NULL,
    client_email VARCHAR(255) NOT NULL,
    client_phone VARCHAR(20) NOT NULL,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    event_type event_type NOT NULL,  -- ENUM
    message TEXT,
    status appointment_status,       -- 'pending', 'confirmed', 'cancelled'
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,

    CONSTRAINT unique_slot UNIQUE (date, start_time)
);

-- Horaires d'ouverture
CREATE TABLE business_hours (
    id UUID PRIMARY KEY,
    day_of_week INTEGER NOT NULL,    -- 0=Dimanche, 6=Samedi
    is_open BOOLEAN DEFAULT true,
    open_time TIME DEFAULT '09:00',
    close_time TIME DEFAULT '18:00'
);

-- Creneaux bloques (vacances, etc.)
CREATE TABLE blocked_slots (
    id UUID PRIMARY KEY,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    reason TEXT
);
```

## Points d'extension

### Ajouter un type d'evenement

1. Modifier l'enum dans le schema Zod :
```typescript
event_type: z.enum(['signature', 'instants', 'coaching', 'nouveau_type']),
```

2. Ajouter l'option dans le formulaire UI

3. (Optionnel) Modifier l'enum SQL si necessaire

### Changer la duree des creneaux

Actuellement, chaque creneau = 1 heure. Pour changer :

```typescript
// Dans createAppointment
const [hours] = validatedData.start_time.split(':').map(Number);
const endTime = `${String(hours + 2).padStart(2, '0')}:00`;  // 2 heures
```

### Ajouter une notification SMS

Dans `createAppointment` apres l'insertion :

```typescript
await sendBookingConfirmation(validatedData);
await sendAdminNotification(validatedData);
await sendSMSNotification(validatedData.client_phone);  // Nouveau
```

## Gestion Admin

L'admin peut :
- Voir tous les RDV (`appointments-list.tsx`)
- Confirmer un RDV pending (`pending-appointment-actions.tsx`)
- Annuler un RDV (`appointment-actions.tsx`)
- Bloquer des creneaux (`blocked_slots`)

Les actions admin sont protegees par RLS :

```sql
CREATE POLICY "Authenticated users can update appointments"
    ON appointments FOR UPDATE
    USING (auth.role() = 'authenticated');
```

## Maintenance

### Checklist apres modification

- [ ] Schema Zod mis a jour ?
- [ ] Types TypeScript synchronises ?
- [ ] Migration SQL si necessaire ?
- [ ] Emails de confirmation adaptes ?

### Problemes courants

| Probleme | Cause | Solution |
|----------|-------|----------|
| Creneau affiche dispo mais erreur | Race condition | Normal, contrainte UNIQUE protege |
| Email non recu | Resend quota/erreur | Verifier logs Resend dashboard |
| Calendrier ne charge pas | Server Action timeout | Verifier connexion Supabase |
| Horaires incorrects | Timezone | Verifier timezone serveur/client |
