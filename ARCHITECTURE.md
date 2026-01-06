# Architecture Logicielle - AureLuz

**Version :** 1.0
**Date :** Janvier 2026
**Projet :** Site Vitrine avec Système de Réservation

---

## Table des Matières

1. [Vue d'Ensemble](#1-vue-densemble)
2. [Stack Technique](#2-stack-technique)
3. [Architecture Système](#3-architecture-système)
4. [Structure du Projet](#4-structure-du-projet)
5. [Modèles de Données](#5-modèles-de-données)
6. [Architecture des Composants](#6-architecture-des-composants)
7. [Spécification des APIs](#7-spécification-des-apis)
8. [Flux de Données](#8-flux-de-données)
9. [Authentification & Sécurité](#9-authentification--sécurité)
10. [Performance & Optimisation](#10-performance--optimisation)
11. [Stratégie de Déploiement](#11-stratégie-de-déploiement)
12. [Plan d'Implémentation](#12-plan-dimplémentation)

---

## 1. Vue d'Ensemble

### 1.1 Objectifs Architecturaux

| Objectif | Description |
|----------|-------------|
| **Simplicité** | Architecture minimaliste adaptée à un site vitrine |
| **Performance** | Temps de chargement < 2s, LCP < 2.5s |
| **Maintenabilité** | Code modulaire, séparation des responsabilités |
| **Scalabilité** | Capable de gérer une croissance modérée |
| **SEO** | Rendu côté serveur pour un référencement optimal |

### 1.2 Diagramme d'Architecture Haut Niveau

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              CLIENTS                                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐             │
│    │   Visiteur   │    │   Aurélie    │    │    Mobile    │             │
│    │   (Browser)  │    │   (Admin)    │    │   (Browser)  │             │
│    └──────┬───────┘    └──────┬───────┘    └──────┬───────┘             │
│           │                   │                   │                      │
└───────────┼───────────────────┼───────────────────┼──────────────────────┘
            │                   │                   │
            └───────────────────┼───────────────────┘
                                │
                         ┌──────▼──────┐
                         │   Vercel    │
                         │   (CDN)     │
                         └──────┬──────┘
                                │
┌───────────────────────────────┼──────────────────────────────────────────┐
│                         NEXT.JS APP                                       │
├───────────────────────────────┼──────────────────────────────────────────┤
│                               │                                           │
│    ┌──────────────────────────┼──────────────────────────────┐           │
│    │                    APP ROUTER                            │           │
│    │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │           │
│    │  │    Pages    │  │     API     │  │   Middleware    │  │           │
│    │  │   (RSC)     │  │   Routes    │  │   (Auth/CORS)   │  │           │
│    │  └─────────────┘  └─────────────┘  └─────────────────┘  │           │
│    └─────────────────────────────────────────────────────────┘           │
│                               │                                           │
│    ┌──────────────────────────┼──────────────────────────────┐           │
│    │                   SERVICES LAYER                         │           │
│    │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │           │
│    │  │  Booking    │  │   Gallery   │  │      Email      │  │           │
│    │  │  Service    │  │   Service   │  │     Service     │  │           │
│    │  └─────────────┘  └─────────────┘  └─────────────────┘  │           │
│    └─────────────────────────────────────────────────────────┘           │
│                                                                           │
└───────────────────────────────┬──────────────────────────────────────────┘
                                │
┌───────────────────────────────┼──────────────────────────────────────────┐
│                         SUPABASE                                          │
├───────────────────────────────┼──────────────────────────────────────────┤
│                               │                                           │
│    ┌─────────────┐    ┌───────┴───────┐    ┌─────────────┐               │
│    │    Auth     │    │   PostgreSQL  │    │   Storage   │               │
│    │  (Admin)    │    │   (Database)  │    │   (Images)  │               │
│    └─────────────┘    └───────────────┘    └─────────────┘               │
│                                                                           │
└───────────────────────────────────────────────────────────────────────────┘
                                │
                         ┌──────▼──────┐
                         │   Resend    │
                         │   (Email)   │
                         └─────────────┘
```

---

## 2. Stack Technique

### 2.1 Choix Technologiques

| Couche | Technologie | Version | Justification |
|--------|-------------|---------|---------------|
| **Framework** | Next.js (App Router) | 15.x | SSR/SSG, optimisation images, API routes intégrées |
| **Langage** | TypeScript | 5.x | Typage fort, meilleure maintenabilité |
| **Styling** | Tailwind CSS | 3.x | Utility-first, design system cohérent |
| **UI Components** | shadcn/ui | latest | Composants accessibles, personnalisables |
| **Icônes** | Lucide React | latest | Icônes légères et cohérentes |
| **Base de données** | Supabase (PostgreSQL) | - | BaaS complet, Auth + DB + Storage |
| **ORM** | Supabase Client | latest | Intégration native, RLS |
| **Email** | Resend | latest | API moderne, fiable, templates React |
| **Validation** | Zod | 3.x | Validation runtime type-safe |
| **Forms** | React Hook Form | 7.x | Performance, validation intégrée |
| **Date/Time** | date-fns | 3.x | Légère, immutable, tree-shakable |
| **Hosting** | Vercel | - | Intégration Next.js native, CDN global |

### 2.2 Dépendances Principales

```json
{
  "dependencies": {
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "@supabase/supabase-js": "^2.39.0",
    "@supabase/ssr": "^0.1.0",
    "tailwindcss": "^3.4.0",
    "lucide-react": "^0.300.0",
    "zod": "^3.22.0",
    "react-hook-form": "^7.49.0",
    "@hookform/resolvers": "^3.3.0",
    "date-fns": "^3.0.0",
    "resend": "^2.1.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.2.0"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "@types/react": "^18.2.0",
    "@types/node": "^20.10.0",
    "eslint": "^8.56.0",
    "eslint-config-next": "^15.0.0",
    "prettier": "^3.2.0",
    "prettier-plugin-tailwindcss": "^0.5.0"
  }
}
```

---

## 3. Architecture Système

### 3.1 Patterns Architecturaux

#### Pattern Principal : **Feature-Sliced Architecture (Simplifié)**

```
┌─────────────────────────────────────────────────────────────┐
│                        PRESENTATION                          │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  Pages (app/)  →  Components (components/)              ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                         BUSINESS                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  Services (lib/services/)  →  Actions (lib/actions/)    ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                           DATA                               │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  Supabase Client  →  Database  →  Storage               ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Séparation des Responsabilités

| Couche | Responsabilité | Exemples |
|--------|----------------|----------|
| **Pages** | Routing, Layout, Data Fetching (RSC) | `app/page.tsx`, `app/admin/page.tsx` |
| **Components** | UI réutilisable, présentation | `Calendar`, `GalleryGrid`, `BookingForm` |
| **Services** | Logique métier, accès données | `BookingService`, `GalleryService` |
| **Actions** | Server Actions (mutations) | `createAppointment`, `uploadPhoto` |
| **Lib** | Utilitaires, configurations | `supabase.ts`, `utils.ts`, `validators.ts` |

---

## 4. Structure du Projet

```
aureluz/
├── app/                              # Next.js App Router
│   ├── (public)/                     # Route group - pages publiques
│   │   ├── page.tsx                  # Page d'accueil
│   │   ├── booking/
│   │   │   └── page.tsx              # Page de réservation
│   │   └── layout.tsx                # Layout public (header/footer)
│   │
│   ├── (admin)/                      # Route group - backoffice
│   │   ├── admin/
│   │   │   ├── page.tsx              # Dashboard admin
│   │   │   ├── appointments/
│   │   │   │   └── page.tsx          # Gestion des RDV
│   │   │   ├── gallery/
│   │   │   │   └── page.tsx          # Gestion des photos
│   │   │   └── settings/
│   │   │       └── page.tsx          # Paramètres
│   │   ├── login/
│   │   │   └── page.tsx              # Page de connexion
│   │   └── layout.tsx                # Layout admin (sidebar)
│   │
│   ├── api/                          # API Routes (si nécessaire)
│   │   └── webhook/
│   │       └── route.ts              # Webhooks externes
│   │
│   ├── layout.tsx                    # Root layout
│   ├── globals.css                   # Styles globaux Tailwind
│   ├── loading.tsx                   # Loading state global
│   ├── error.tsx                     # Error boundary global
│   └── not-found.tsx                 # Page 404
│
├── components/                       # Composants React
│   ├── ui/                           # shadcn/ui components
│   │   ├── button.tsx
│   │   ├── calendar.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── form.tsx
│   │   ├── input.tsx
│   │   ├── select.tsx
│   │   ├── toast.tsx
│   │   └── ...
│   │
│   ├── layout/                       # Composants de mise en page
│   │   ├── header.tsx
│   │   ├── footer.tsx
│   │   ├── nav.tsx
│   │   └── admin-sidebar.tsx
│   │
│   ├── sections/                     # Sections de page
│   │   ├── hero.tsx
│   │   ├── services.tsx
│   │   ├── about.tsx
│   │   └── contact-cta.tsx
│   │
│   ├── booking/                      # Feature: Réservation
│   │   ├── booking-calendar.tsx
│   │   ├── time-slots.tsx
│   │   ├── booking-form.tsx
│   │   └── booking-confirmation.tsx
│   │
│   ├── gallery/                      # Feature: Galerie
│   │   ├── gallery-grid.tsx
│   │   ├── gallery-filter.tsx
│   │   ├── gallery-modal.tsx
│   │   └── photo-upload.tsx
│   │
│   └── admin/                        # Feature: Administration
│       ├── appointments-table.tsx
│       ├── appointment-card.tsx
│       ├── stats-cards.tsx
│       └── blocked-slots-manager.tsx
│
├── lib/                              # Logique métier et utilitaires
│   ├── supabase/
│   │   ├── client.ts                 # Client browser
│   │   ├── server.ts                 # Client server (RSC)
│   │   ├── middleware.ts             # Client middleware
│   │   └── admin.ts                  # Client admin (service role)
│   │
│   ├── services/
│   │   ├── booking.service.ts        # Logique de réservation
│   │   ├── gallery.service.ts        # Logique de galerie
│   │   └── email.service.ts          # Envoi d'emails
│   │
│   ├── actions/                      # Server Actions
│   │   ├── booking.actions.ts
│   │   ├── gallery.actions.ts
│   │   └── admin.actions.ts
│   │
│   ├── validators/
│   │   ├── booking.schema.ts         # Schemas Zod
│   │   └── gallery.schema.ts
│   │
│   ├── utils/
│   │   ├── date.ts                   # Utilitaires date/heure
│   │   ├── cn.ts                     # className merger
│   │   └── constants.ts              # Constantes globales
│   │
│   └── types/
│       ├── database.types.ts         # Types Supabase générés
│       ├── booking.types.ts
│       └── gallery.types.ts
│
├── emails/                           # Templates email (React Email)
│   ├── booking-confirmation.tsx
│   ├── booking-notification.tsx
│   └── booking-status-update.tsx
│
├── public/                           # Assets statiques
│   ├── logo.svg
│   ├── og-image.jpg
│   └── fonts/
│       └── ...
│
├── supabase/                         # Configuration Supabase
│   ├── migrations/                   # Migrations SQL
│   │   ├── 001_create_appointments.sql
│   │   ├── 002_create_blocked_slots.sql
│   │   └── 003_create_photos.sql
│   ├── seed.sql                      # Données initiales
│   └── config.toml                   # Config locale
│
├── .env.local                        # Variables d'environnement
├── .env.example                      # Template env
├── next.config.js                    # Config Next.js
├── tailwind.config.ts                # Config Tailwind
├── tsconfig.json                     # Config TypeScript
├── components.json                   # Config shadcn/ui
└── package.json
```

---

## 5. Modèles de Données

### 5.1 Diagramme Entité-Relation

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          DATABASE SCHEMA                                 │
└─────────────────────────────────────────────────────────────────────────┘

┌──────────────────────┐       ┌──────────────────────┐
│    appointments      │       │    blocked_slots     │
├──────────────────────┤       ├──────────────────────┤
│ id: uuid [PK]        │       │ id: uuid [PK]        │
│ client_name: varchar │       │ date: date           │
│ client_email: varchar│       │ start_time: time     │
│ client_phone: varchar│       │ end_time: time       │
│ date: date           │       │ reason: varchar?     │
│ start_time: time     │       │ created_at: timestamp│
│ end_time: time       │       └──────────────────────┘
│ event_type: enum     │
│ message: text?       │       ┌──────────────────────┐
│ status: enum         │       │       photos         │
│ created_at: timestamp│       ├──────────────────────┤
│ updated_at: timestamp│       │ id: uuid [PK]        │
└──────────────────────┘       │ url: varchar         │
                               │ alt: varchar         │
                               │ category: enum       │
                               │ order: integer       │
                               │ created_at: timestamp│
                               └──────────────────────┘

┌──────────────────────┐
│   business_hours     │
├──────────────────────┤
│ id: uuid [PK]        │
│ day_of_week: integer │  (0=Dimanche, 1=Lundi, etc.)
│ open_time: time      │
│ close_time: time     │
│ is_open: boolean     │
└──────────────────────┘
```

### 5.2 Migrations SQL

#### Migration 001: Table appointments

```sql
-- supabase/migrations/001_create_appointments.sql

-- Enum pour le type d'événement
CREATE TYPE event_type AS ENUM ('mariage', 'table', 'autre');

-- Enum pour le statut
CREATE TYPE appointment_status AS ENUM ('pending', 'confirmed', 'cancelled');

-- Table des rendez-vous
CREATE TABLE appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_name VARCHAR(100) NOT NULL,
    client_email VARCHAR(255) NOT NULL,
    client_phone VARCHAR(20) NOT NULL,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    event_type event_type NOT NULL,
    message TEXT,
    status appointment_status DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Contraintes
    CONSTRAINT valid_time_range CHECK (end_time > start_time),
    CONSTRAINT valid_date CHECK (date >= CURRENT_DATE),
    CONSTRAINT unique_slot UNIQUE (date, start_time)
);

-- Index pour les requêtes fréquentes
CREATE INDEX idx_appointments_date ON appointments(date);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_appointments_date_status ON appointments(date, status);

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER appointments_updated_at
    BEFORE UPDATE ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- RLS (Row Level Security)
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Politique: Tout le monde peut créer un RDV
CREATE POLICY "Anyone can create appointments" ON appointments
    FOR INSERT WITH CHECK (true);

-- Politique: Seul admin peut lire tous les RDV
CREATE POLICY "Admin can read all appointments" ON appointments
    FOR SELECT USING (auth.role() = 'authenticated');

-- Politique: Seul admin peut modifier
CREATE POLICY "Admin can update appointments" ON appointments
    FOR UPDATE USING (auth.role() = 'authenticated');
```

#### Migration 002: Table blocked_slots

```sql
-- supabase/migrations/002_create_blocked_slots.sql

CREATE TABLE blocked_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    reason VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT valid_blocked_time CHECK (end_time > start_time),
    CONSTRAINT unique_blocked_slot UNIQUE (date, start_time)
);

CREATE INDEX idx_blocked_slots_date ON blocked_slots(date);

-- RLS
ALTER TABLE blocked_slots ENABLE ROW LEVEL SECURITY;

-- Tout le monde peut lire (pour afficher les créneaux indisponibles)
CREATE POLICY "Anyone can read blocked_slots" ON blocked_slots
    FOR SELECT USING (true);

-- Seul admin peut gérer
CREATE POLICY "Admin can manage blocked_slots" ON blocked_slots
    FOR ALL USING (auth.role() = 'authenticated');
```

#### Migration 003: Table photos

```sql
-- supabase/migrations/003_create_photos.sql

CREATE TYPE photo_category AS ENUM ('mariage', 'evenement', 'table');

CREATE TABLE photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    url VARCHAR(500) NOT NULL,
    alt VARCHAR(255) NOT NULL,
    category photo_category NOT NULL,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_photos_category ON photos(category);
CREATE INDEX idx_photos_order ON photos(display_order);

-- RLS
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;

-- Tout le monde peut lire
CREATE POLICY "Anyone can read photos" ON photos
    FOR SELECT USING (true);

-- Seul admin peut gérer
CREATE POLICY "Admin can manage photos" ON photos
    FOR ALL USING (auth.role() = 'authenticated');
```

#### Migration 004: Table business_hours

```sql
-- supabase/migrations/004_create_business_hours.sql

CREATE TABLE business_hours (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    open_time TIME NOT NULL DEFAULT '09:00',
    close_time TIME NOT NULL DEFAULT '18:00',
    is_open BOOLEAN DEFAULT true,

    CONSTRAINT unique_day UNIQUE (day_of_week),
    CONSTRAINT valid_hours CHECK (close_time > open_time)
);

-- Données initiales (Lundi-Vendredi: 9h-18h, Weekend: fermé)
INSERT INTO business_hours (day_of_week, open_time, close_time, is_open) VALUES
    (0, '09:00', '18:00', false),  -- Dimanche
    (1, '09:00', '18:00', true),   -- Lundi
    (2, '09:00', '18:00', true),   -- Mardi
    (3, '09:00', '18:00', true),   -- Mercredi
    (4, '09:00', '18:00', true),   -- Jeudi
    (5, '09:00', '18:00', true),   -- Vendredi
    (6, '09:00', '18:00', false);  -- Samedi

-- RLS
ALTER TABLE business_hours ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read business_hours" ON business_hours
    FOR SELECT USING (true);

CREATE POLICY "Admin can update business_hours" ON business_hours
    FOR UPDATE USING (auth.role() = 'authenticated');
```

### 5.3 Types TypeScript

```typescript
// lib/types/database.types.ts

export type EventType = 'mariage' | 'table' | 'autre';
export type AppointmentStatus = 'pending' | 'confirmed' | 'cancelled';
export type PhotoCategory = 'mariage' | 'evenement' | 'table';

export interface Appointment {
  id: string;
  client_name: string;
  client_email: string;
  client_phone: string;
  date: string;           // Format: YYYY-MM-DD
  start_time: string;     // Format: HH:mm
  end_time: string;       // Format: HH:mm
  event_type: EventType;
  message: string | null;
  status: AppointmentStatus;
  created_at: string;
  updated_at: string;
}

export interface BlockedSlot {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  reason: string | null;
  created_at: string;
}

export interface Photo {
  id: string;
  url: string;
  alt: string;
  category: PhotoCategory;
  display_order: number;
  created_at: string;
}

export interface BusinessHours {
  id: string;
  day_of_week: number;
  open_time: string;
  close_time: string;
  is_open: boolean;
}

// Types pour les formulaires (input)
export interface CreateAppointmentInput {
  client_name: string;
  client_email: string;
  client_phone: string;
  date: string;
  start_time: string;
  event_type: EventType;
  message?: string;
}

export interface UpdateAppointmentInput {
  status?: AppointmentStatus;
}

// Types pour les créneaux disponibles
export interface TimeSlot {
  time: string;           // Format: HH:mm
  available: boolean;
}

export interface DayAvailability {
  date: string;
  slots: TimeSlot[];
  isOpen: boolean;
}
```

---

## 6. Architecture des Composants

### 6.1 Hiérarchie des Composants

```
App
├── RootLayout
│   ├── Toaster (notifications)
│   └── Children
│
├── PublicLayout
│   ├── Header
│   │   ├── Logo
│   │   ├── Nav
│   │   └── MobileMenu
│   ├── Children (pages)
│   └── Footer
│       ├── SocialLinks
│       └── LegalLinks
│
├── HomePage
│   ├── HeroSection
│   │   ├── AnimatedTitle
│   │   └── CTAButton
│   ├── ServicesSection
│   │   └── ServiceCard (x3)
│   ├── GallerySection
│   │   ├── GalleryFilter
│   │   ├── GalleryGrid
│   │   │   └── GalleryItem (x20)
│   │   └── GalleryModal
│   ├── AboutSection
│   └── ContactCTA
│
├── BookingPage
│   ├── BookingCalendar
│   │   ├── CalendarHeader
│   │   ├── CalendarGrid
│   │   └── DayCell
│   ├── TimeSlots
│   │   └── TimeSlotButton (xN)
│   ├── BookingForm
│   │   ├── Input (Nom, Email, Phone)
│   │   ├── Select (EventType)
│   │   └── Textarea (Message)
│   └── BookingConfirmation
│
└── AdminLayout
    ├── AdminSidebar
    │   ├── Logo
    │   ├── NavLinks
    │   └── LogoutButton
    ├── AdminHeader
    └── Children (admin pages)
        │
        ├── DashboardPage
        │   ├── StatsCards
        │   ├── UpcomingAppointments
        │   └── QuickActions
        │
        ├── AppointmentsPage
        │   ├── AppointmentsFilter
        │   ├── AppointmentsTable
        │   │   └── AppointmentRow
        │   └── AppointmentDetailModal
        │
        ├── GalleryManagePage
        │   ├── PhotoUpload
        │   ├── PhotoGrid
        │   │   └── PhotoCard
        │   └── CategoryManager
        │
        └── SettingsPage
            ├── BusinessHoursEditor
            └── BlockedSlotsManager
```

### 6.2 Composants Clés - Spécifications

#### BookingCalendar

```typescript
// components/booking/booking-calendar.tsx

interface BookingCalendarProps {
  selectedDate: Date | null;
  onDateSelect: (date: Date) => void;
  blockedDates: string[];           // Dates complètement bloquées
  minDate?: Date;                   // Date minimum (défaut: demain)
  maxDate?: Date;                   // Date maximum (défaut: +3 mois)
}

// Comportement:
// - Affiche un calendrier mensuel
// - Les dates passées sont désactivées (grisées)
// - Les dates bloquées sont désactivées
// - La date sélectionnée est mise en évidence
// - Navigation mois par mois
```

#### TimeSlots

```typescript
// components/booking/time-slots.tsx

interface TimeSlotsProps {
  date: Date;
  selectedTime: string | null;
  onTimeSelect: (time: string) => void;
  availableSlots: TimeSlot[];
}

// Comportement:
// - Affiche les créneaux de 9h à 18h
// - Créneaux de 1h (9h-10h, 10h-11h, etc.)
// - Créneaux passés/réservés désactivés
// - Indication visuelle du créneau sélectionné
```

#### GalleryGrid

```typescript
// components/gallery/gallery-grid.tsx

interface GalleryGridProps {
  photos: Photo[];
  onPhotoClick: (photo: Photo) => void;
  columns?: 2 | 3 | 4;              // Responsive columns
}

// Comportement:
// - Grille responsive avec masonry layout
// - Lazy loading des images
// - Placeholder blur pendant le chargement
// - Animation au hover
```

### 6.3 State Management

```
┌─────────────────────────────────────────────────────────────┐
│                    STATE ARCHITECTURE                        │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    SERVER STATE                              │
│  (Géré par React Server Components + Supabase)              │
├─────────────────────────────────────────────────────────────┤
│  • Photos de la galerie                                      │
│  • Liste des rendez-vous (admin)                            │
│  • Créneaux disponibles                                      │
│  • Paramètres business hours                                 │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT STATE                              │
│  (Géré par useState/useReducer localement)                  │
├─────────────────────────────────────────────────────────────┤
│  • Date sélectionnée (calendrier)                           │
│  • Créneau sélectionné                                       │
│  • Formulaire de réservation                                 │
│  • Modal ouverte/fermée                                      │
│  • Filtres galerie actifs                                    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    URL STATE                                 │
│  (Géré par Next.js searchParams)                            │
├─────────────────────────────────────────────────────────────┤
│  • Filtre de catégorie galerie (?category=mariage)          │
│  • Pagination admin (?page=2)                                │
│  • Filtre statut RDV (?status=pending)                       │
└─────────────────────────────────────────────────────────────┘
```

---

## 7. Spécification des APIs

### 7.1 Server Actions (Mutations)

Les Server Actions Next.js sont privilégiées pour les mutations.

#### Booking Actions

```typescript
// lib/actions/booking.actions.ts

'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { bookingSchema } from '@/lib/validators/booking.schema';
import { BookingService } from '@/lib/services/booking.service';
import { EmailService } from '@/lib/services/email.service';

// Action: Créer un rendez-vous
export async function createAppointment(formData: FormData) {
  // 1. Extraire et valider les données
  const rawData = {
    client_name: formData.get('client_name'),
    client_email: formData.get('client_email'),
    client_phone: formData.get('client_phone'),
    date: formData.get('date'),
    start_time: formData.get('start_time'),
    event_type: formData.get('event_type'),
    message: formData.get('message'),
  };

  const validatedData = bookingSchema.parse(rawData);

  // 2. Vérifier disponibilité
  const isAvailable = await BookingService.checkAvailability(
    validatedData.date,
    validatedData.start_time
  );

  if (!isAvailable) {
    return { error: 'Ce créneau n\'est plus disponible.' };
  }

  // 3. Créer le rendez-vous
  const appointment = await BookingService.create(validatedData);

  // 4. Envoyer les emails
  await Promise.all([
    EmailService.sendBookingConfirmation(appointment),
    EmailService.sendAdminNotification(appointment),
  ]);

  // 5. Revalider le cache
  revalidatePath('/booking');
  revalidatePath('/admin/appointments');

  return { success: true, appointment };
}

// Action: Mettre à jour le statut
export async function updateAppointmentStatus(
  appointmentId: string,
  status: 'confirmed' | 'cancelled'
) {
  // Vérifier l'authentification admin
  const session = await getSession();
  if (!session) {
    return { error: 'Non autorisé' };
  }

  const appointment = await BookingService.updateStatus(appointmentId, status);

  // Notifier le client
  await EmailService.sendStatusUpdate(appointment);

  revalidatePath('/admin/appointments');

  return { success: true };
}
```

#### Gallery Actions

```typescript
// lib/actions/gallery.actions.ts

'use server';

import { revalidatePath } from 'next/cache';
import { GalleryService } from '@/lib/services/gallery.service';

// Action: Upload photo
export async function uploadPhoto(formData: FormData) {
  const session = await getSession();
  if (!session) {
    return { error: 'Non autorisé' };
  }

  const file = formData.get('file') as File;
  const category = formData.get('category') as string;
  const alt = formData.get('alt') as string;

  // 1. Upload vers Supabase Storage
  const url = await GalleryService.uploadToStorage(file);

  // 2. Créer l'entrée en base
  const photo = await GalleryService.create({
    url,
    category,
    alt,
  });

  revalidatePath('/');
  revalidatePath('/admin/gallery');

  return { success: true, photo };
}

// Action: Supprimer photo
export async function deletePhoto(photoId: string) {
  const session = await getSession();
  if (!session) {
    return { error: 'Non autorisé' };
  }

  await GalleryService.delete(photoId);

  revalidatePath('/');
  revalidatePath('/admin/gallery');

  return { success: true };
}

// Action: Réorganiser photos
export async function reorderPhotos(orderedIds: string[]) {
  const session = await getSession();
  if (!session) {
    return { error: 'Non autorisé' };
  }

  await GalleryService.updateOrder(orderedIds);

  revalidatePath('/');

  return { success: true };
}
```

### 7.2 Data Fetching (Server Components)

```typescript
// lib/services/booking.service.ts

import { createServerClient } from '@/lib/supabase/server';

export class BookingService {
  // Récupérer les créneaux disponibles pour une date
  static async getAvailableSlots(date: string): Promise<TimeSlot[]> {
    const supabase = createServerClient();

    // 1. Récupérer les heures d'ouverture du jour
    const dayOfWeek = new Date(date).getDay();
    const { data: hours } = await supabase
      .from('business_hours')
      .select('*')
      .eq('day_of_week', dayOfWeek)
      .single();

    if (!hours?.is_open) {
      return [];
    }

    // 2. Récupérer les créneaux déjà pris
    const { data: appointments } = await supabase
      .from('appointments')
      .select('start_time')
      .eq('date', date)
      .neq('status', 'cancelled');

    // 3. Récupérer les créneaux bloqués
    const { data: blocked } = await supabase
      .from('blocked_slots')
      .select('start_time')
      .eq('date', date);

    // 4. Générer les créneaux disponibles
    const bookedTimes = new Set([
      ...appointments?.map(a => a.start_time) || [],
      ...blocked?.map(b => b.start_time) || [],
    ]);

    const slots: TimeSlot[] = [];
    let current = parseTime(hours.open_time);
    const end = parseTime(hours.close_time);

    while (current < end) {
      const timeStr = formatTime(current);
      slots.push({
        time: timeStr,
        available: !bookedTimes.has(timeStr),
      });
      current += 60; // +1 heure
    }

    return slots;
  }

  // Récupérer tous les rendez-vous (admin)
  static async getAll(filters?: {
    status?: AppointmentStatus;
    startDate?: string;
    endDate?: string;
  }): Promise<Appointment[]> {
    const supabase = createServerClient();

    let query = supabase
      .from('appointments')
      .select('*')
      .order('date', { ascending: true })
      .order('start_time', { ascending: true });

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.startDate) {
      query = query.gte('date', filters.startDate);
    }
    if (filters?.endDate) {
      query = query.lte('date', filters.endDate);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data;
  }
}
```

### 7.3 API Routes (Webhooks)

```typescript
// app/api/webhook/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';

// Webhook pour intégrations futures (ex: paiements, calendrier externe)
export async function POST(request: NextRequest) {
  const headersList = headers();
  const signature = headersList.get('x-webhook-signature');

  // Vérifier la signature
  if (!verifySignature(signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const body = await request.json();

  // Traiter l'événement
  switch (body.event) {
    case 'calendar.sync':
      // Synchroniser avec calendrier externe
      break;
    default:
      return NextResponse.json({ error: 'Unknown event' }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
```

---

## 8. Flux de Données

### 8.1 Flux de Réservation

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    BOOKING FLOW                                          │
└─────────────────────────────────────────────────────────────────────────┘

Visiteur                          Système                           Admin
   │                                 │                                 │
   │  1. Accède à /booking           │                                 │
   │────────────────────────────────▶│                                 │
   │                                 │                                 │
   │  2. RSC: Charge calendrier      │                                 │
   │◀────────────────────────────────│                                 │
   │     + dates disponibles         │                                 │
   │                                 │                                 │
   │  3. Sélectionne une date        │                                 │
   │────────────────────────────────▶│                                 │
   │                                 │                                 │
   │  4. Fetch créneaux disponibles  │                                 │
   │◀────────────────────────────────│                                 │
   │                                 │                                 │
   │  5. Sélectionne un créneau      │                                 │
   │────────────────────────────────▶│                                 │
   │                                 │                                 │
   │  6. Affiche formulaire          │                                 │
   │◀────────────────────────────────│                                 │
   │                                 │                                 │
   │  7. Soumet formulaire           │                                 │
   │────────────────────────────────▶│                                 │
   │                                 │  8. Valide données              │
   │                                 │  9. Vérifie disponibilité       │
   │                                 │  10. Crée appointment           │
   │                                 │  11. Envoie emails              │
   │                                 │────────────────────────────────▶│
   │                                 │     Email notification          │
   │  12. Confirmation               │                                 │
   │◀────────────────────────────────│                                 │
   │     + Email confirmation        │                                 │
   │                                 │                                 │
   │                                 │  13. Admin consulte dashboard   │
   │                                 │◀────────────────────────────────│
   │                                 │                                 │
   │                                 │  14. Admin accepte/refuse       │
   │                                 │◀────────────────────────────────│
   │                                 │                                 │
   │  15. Email statut update        │                                 │
   │◀────────────────────────────────│                                 │
   │                                 │                                 │
```

### 8.2 Flux de Gestion Galerie (Admin)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    GALLERY MANAGEMENT FLOW                               │
└─────────────────────────────────────────────────────────────────────────┘

Admin                             Système                          Storage
   │                                 │                                 │
   │  1. Accède /admin/gallery       │                                 │
   │────────────────────────────────▶│                                 │
   │                                 │  2. Fetch photos existantes     │
   │  3. Affiche grille photos       │◀────────────────────────────────│
   │◀────────────────────────────────│                                 │
   │                                 │                                 │
   │  4. Upload nouvelle photo       │                                 │
   │────────────────────────────────▶│                                 │
   │     (file, category, alt)       │                                 │
   │                                 │  5. Upload fichier              │
   │                                 │────────────────────────────────▶│
   │                                 │                                 │
   │                                 │  6. Retourne URL publique       │
   │                                 │◀────────────────────────────────│
   │                                 │                                 │
   │                                 │  7. Crée entrée BDD             │
   │                                 │  8. Revalide cache /            │
   │  9. Confirmation + preview      │                                 │
   │◀────────────────────────────────│                                 │
   │                                 │                                 │
   │  10. Drag & drop réorganiser    │                                 │
   │────────────────────────────────▶│                                 │
   │                                 │  11. Update display_order       │
   │                                 │  12. Revalide cache             │
   │  13. Nouvel ordre confirmé      │                                 │
   │◀────────────────────────────────│                                 │
```

---

## 9. Authentification & Sécurité

### 9.1 Architecture d'Authentification

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    AUTHENTICATION FLOW                                   │
└─────────────────────────────────────────────────────────────────────────┘

                         ┌──────────────────┐
                         │  Supabase Auth   │
                         │  (Magic Link ou  │
                         │   Email/Password)│
                         └────────┬─────────┘
                                  │
          ┌───────────────────────┼───────────────────────┐
          │                       │                       │
          ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│    Browser      │    │   Middleware    │    │  Server Actions │
│    (Client)     │    │   (Route Guard) │    │  (Mutations)    │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ supabase-js     │    │ Vérifie session │    │ Vérifie session │
│ stocke tokens   │    │ Redirige si     │    │ avant mutation  │
│ dans cookies    │    │ non authentifié │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### 9.2 Configuration Middleware

```typescript
// middleware.ts

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  const { data: { session } } = await supabase.auth.getSession();

  // Protection des routes admin
  if (request.nextUrl.pathname.startsWith('/admin')) {
    if (!session) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // Redirection si déjà connecté
  if (request.nextUrl.pathname === '/login' && session) {
    return NextResponse.redirect(new URL('/admin', request.url));
  }

  return response;
}

export const config = {
  matcher: ['/admin/:path*', '/login'],
};
```

### 9.3 Mesures de Sécurité

| Mesure | Implémentation |
|--------|----------------|
| **CSRF Protection** | Tokens SameSite cookies via Supabase |
| **Rate Limiting** | Vercel Edge Functions limiter |
| **Input Validation** | Zod schemas côté serveur |
| **SQL Injection** | Prevented par Supabase client |
| **XSS** | React échappe par défaut + CSP headers |
| **RLS (Row Level Security)** | Supabase policies par table |
| **HTTPS** | Forcé par Vercel |
| **Secrets** | Variables d'environnement sécurisées |

### 9.4 Headers de Sécurité

```typescript
// next.config.js

const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block',
  },
  {
    key: 'Referrer-Policy',
    value: 'origin-when-cross-origin',
  },
  {
    key: 'Content-Security-Policy',
    value: `
      default-src 'self';
      script-src 'self' 'unsafe-eval' 'unsafe-inline';
      style-src 'self' 'unsafe-inline';
      img-src 'self' blob: data: https://*.supabase.co;
      font-src 'self';
      connect-src 'self' https://*.supabase.co;
    `.replace(/\n/g, ''),
  },
];

module.exports = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};
```

---

## 10. Performance & Optimisation

### 10.1 Stratégie de Rendu

| Page | Stratégie | Justification |
|------|-----------|---------------|
| **Page d'accueil** | SSG + ISR (1h) | Contenu semi-statique, SEO important |
| **Page booking** | SSR | Données temps réel (créneaux) |
| **Admin dashboard** | SSR | Données temps réel, protégé |
| **Galerie modal** | CSR | Interaction utilisateur |

### 10.2 Optimisation des Images

```typescript
// next.config.js

module.exports = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
};
```

```typescript
// Composant Image optimisé
import Image from 'next/image';

function GalleryImage({ photo }: { photo: Photo }) {
  return (
    <Image
      src={photo.url}
      alt={photo.alt}
      width={800}
      height={600}
      placeholder="blur"
      blurDataURL={generateBlurPlaceholder(photo.url)}
      loading="lazy"
      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
      className="object-cover"
    />
  );
}
```

### 10.3 Métriques Cibles (Core Web Vitals)

| Métrique | Cible | Stratégie |
|----------|-------|-----------|
| **LCP** | < 2.5s | Images optimisées, SSR, CDN |
| **FID** | < 100ms | Code splitting, lazy loading |
| **CLS** | < 0.1 | Dimensions images explicites |
| **TTFB** | < 600ms | Edge caching, Vercel |

### 10.4 Caching Strategy

```typescript
// lib/services/booking.service.ts

import { unstable_cache } from 'next/cache';

// Cache des créneaux disponibles (5 minutes)
export const getCachedAvailableSlots = unstable_cache(
  async (date: string) => {
    return BookingService.getAvailableSlots(date);
  },
  ['available-slots'],
  {
    revalidate: 300, // 5 minutes
    tags: ['booking'],
  }
);

// Cache des photos (1 heure)
export const getCachedPhotos = unstable_cache(
  async (category?: string) => {
    return GalleryService.getAll(category);
  },
  ['photos'],
  {
    revalidate: 3600, // 1 heure
    tags: ['gallery'],
  }
);
```

---

## 11. Stratégie de Déploiement

### 11.1 Architecture de Déploiement

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    DEPLOYMENT ARCHITECTURE                               │
└─────────────────────────────────────────────────────────────────────────┘

┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   GitHub     │────▶│   Vercel     │────▶│  Production  │
│   (Source)   │     │   (Build)    │     │   (Deploy)   │
└──────────────┘     └──────────────┘     └──────────────┘
       │                                         │
       │                                         ▼
       │                              ┌──────────────────┐
       │                              │   Vercel Edge    │
       │                              │   Network (CDN)  │
       │                              └──────────────────┘
       │                                         │
       ▼                                         ▼
┌──────────────┐                      ┌──────────────────┐
│   Preview    │                      │     Supabase     │
│   Branches   │                      │   (Database +    │
│              │                      │    Storage)      │
└──────────────┘                      └──────────────────┘
```

### 11.2 Environnements

| Environnement | URL | Branche | Base de données |
|---------------|-----|---------|-----------------|
| **Production** | aureluz.fr | main | Supabase Prod |
| **Preview** | *.vercel.app | PR branches | Supabase Staging |
| **Local** | localhost:3000 | - | Supabase Local |

### 11.3 Variables d'Environnement

```bash
# .env.example

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx
SUPABASE_SERVICE_ROLE_KEY=eyJxxx  # Server only

# Email (Resend)
RESEND_API_KEY=re_xxx

# App
NEXT_PUBLIC_APP_URL=https://aureluz.fr
ADMIN_EMAIL=aurelie@aureluz.fr
```

### 11.4 CI/CD Pipeline

```yaml
# .github/workflows/ci.yml (optionnel, Vercel gère le déploiement)

name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Type check
        run: npm run type-check

      - name: Lint
        run: npm run lint

      - name: Build
        run: npm run build
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
```

---

## 12. Plan d'Implémentation

### Phase 1: Fondations (Semaine 1)

- [ ] Initialiser projet Next.js + TypeScript
- [ ] Configurer Tailwind CSS + shadcn/ui
- [ ] Setup Supabase (projet, tables, RLS)
- [ ] Configurer variables d'environnement
- [ ] Créer structure de dossiers

### Phase 2: Site Vitrine (Semaine 2)

- [ ] Layout public (Header, Footer)
- [ ] Page d'accueil (Hero, Services, About)
- [ ] Composant Gallery + filtres
- [ ] Optimisation images
- [ ] Responsive design

### Phase 3: Système de Réservation (Semaine 3)

- [ ] Composant Calendar
- [ ] Composant TimeSlots
- [ ] Formulaire de réservation
- [ ] Server Actions (création RDV)
- [ ] Service Email (confirmation)

### Phase 4: Back-Office Admin (Semaine 4)

- [ ] Authentification Supabase
- [ ] Layout Admin (Sidebar)
- [ ] Dashboard (stats, RDV à venir)
- [ ] Gestion des RDV (liste, actions)
- [ ] Gestion des créneaux bloqués

### Phase 5: Galerie Admin + Polish (Semaine 5)

- [ ] Upload photos
- [ ] Gestion galerie (supprimer, réordonner)
- [ ] Tests manuels
- [ ] Optimisation performances
- [ ] Déploiement production

---

## Annexes

### A. Validation Schemas (Zod)

```typescript
// lib/validators/booking.schema.ts

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
    .regex(/^(\+33|0)[1-9](\d{2}){4}$/, 'Numéro de téléphone invalide'),

  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format de date invalide')
    .refine((date) => {
      const selected = new Date(date);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      return selected >= tomorrow;
    }, 'La date doit être au moins 24h à l\'avance'),

  start_time: z
    .string()
    .regex(/^(0[9]|1[0-7]):00$/, 'Créneau horaire invalide'),

  event_type: z
    .enum(['mariage', 'table', 'autre'], {
      errorMap: () => ({ message: 'Type d\'événement invalide' }),
    }),

  message: z
    .string()
    .max(1000, 'Le message est trop long')
    .optional(),
});

export type BookingFormData = z.infer<typeof bookingSchema>;
```

### B. Template Email (React Email)

```typescript
// emails/booking-confirmation.tsx

import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Heading,
  Hr,
} from '@react-email/components';

interface BookingConfirmationProps {
  clientName: string;
  date: string;
  time: string;
  eventType: string;
}

export default function BookingConfirmation({
  clientName,
  date,
  time,
  eventType,
}: BookingConfirmationProps) {
  return (
    <Html>
      <Head />
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Heading style={styles.heading}>
            Confirmation de votre demande
          </Heading>

          <Text style={styles.text}>
            Bonjour {clientName},
          </Text>

          <Text style={styles.text}>
            Nous avons bien reçu votre demande de consultation pour le{' '}
            <strong>{date}</strong> à <strong>{time}</strong>.
          </Text>

          <Section style={styles.details}>
            <Text style={styles.detailItem}>
              <strong>Type d'événement :</strong> {eventType}
            </Text>
          </Section>

          <Hr style={styles.hr} />

          <Text style={styles.text}>
            Nous reviendrons vers vous dans les plus brefs délais pour
            confirmer ce rendez-vous.
          </Text>

          <Text style={styles.signature}>
            L'équipe AureLuz
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const styles = {
  body: {
    backgroundColor: '#f6f9fc',
    fontFamily: '-apple-system, sans-serif',
  },
  container: {
    backgroundColor: '#ffffff',
    margin: '0 auto',
    padding: '40px',
    maxWidth: '600px',
  },
  heading: {
    color: '#1a1a1a',
    fontSize: '24px',
    fontWeight: '600',
    textAlign: 'center' as const,
  },
  text: {
    color: '#4a4a4a',
    fontSize: '16px',
    lineHeight: '24px',
  },
  details: {
    backgroundColor: '#f9f9f9',
    borderRadius: '8px',
    padding: '20px',
    margin: '20px 0',
  },
  detailItem: {
    margin: '8px 0',
  },
  hr: {
    borderColor: '#e6e6e6',
    margin: '20px 0',
  },
  signature: {
    color: '#888888',
    fontSize: '14px',
    fontStyle: 'italic',
  },
};
```

### C. Constantes de Configuration

```typescript
// lib/utils/constants.ts

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
  { value: 'mariage', label: 'Mariage' },
  { value: 'table', label: 'Art de la table' },
  { value: 'autre', label: 'Autre événement' },
] as const;

export const APPOINTMENT_STATUSES = {
  pending: { label: 'En attente', color: 'yellow' },
  confirmed: { label: 'Confirmé', color: 'green' },
  cancelled: { label: 'Annulé', color: 'red' },
} as const;
```

---

**Document préparé pour l'équipe de développement AureLuz**

*Ce document sert de référence technique pour l'implémentation. Toute question ou clarification peut être adressée à l'architecte.*
