# Architecture Logicielle - AureLuz Design

**Version :** 2.0
**Dernière mise à jour :** Janvier 2026
**Projet :** Site Vitrine avec Système de Réservation et Back-Office Complet

> Ce document est à la fois une référence technique et un guide pédagogique. Chaque concept est illustré par des exemples concrets tirés du code de l'application.

---

## Table des Matières

1. [Vue d'Ensemble](#1-vue-densemble)
2. [Stack Technique](#2-stack-technique)
3. [Architecture Système](#3-architecture-système)
4. [Structure du Projet](#4-structure-du-projet)
5. [Concepts Fondamentaux](#5-concepts-fondamentaux)
6. [Modèle de Données](#6-modèle-de-données)
7. [Patterns d'Architecture](#7-patterns-darchitecture)
8. [Flux de Données](#8-flux-de-données)
9. [Système d'Authentification](#9-système-dauthentification)
10. [Système d'Analytics](#10-système-danalytics)
11. [Système d'Emails](#11-système-demails)
12. [Bonnes Pratiques](#12-bonnes-pratiques)
13. [Référence des Fichiers](#13-référence-des-fichiers)

---

## 1. Vue d'Ensemble

### 1.1 Description du Projet

AureLuz Design est une application web complète pour une entreprise de décoration événementielle. Elle comprend :

- **Site vitrine public** : Présentation des services, portfolio, témoignages
- **Système de réservation** : Prise de rendez-vous avec calendrier et créneaux
- **Back-office administrateur** : Gestion complète de l'activité
- **Système d'analytics** : Suivi des visiteurs et conversions (RGPD-compliant)
- **Système de devis** : Création, envoi, acceptation client et paiement en ligne (Stripe)
- **Système de facturation** : Génération automatique de factures après paiement
- **Workflow devis** : draft → sent → accepted → paid (avec échéancier multi-paiements)
- **Campagnes email** : Envoi d'emails marketing personnalisés

### 1.2 Objectifs Architecturaux

| Objectif | Description | Comment c'est atteint |
|----------|-------------|----------------------|
| **Performance** | Temps de chargement < 2s | Server Components, CDN Vercel, optimisation images |
| **SEO** | Référencement optimal | SSR, métadonnées dynamiques, sitemap.xml |
| **Maintenabilité** | Code modulaire | Séparation services/actions/components |
| **Sécurité** | Protection des données | RLS Supabase, validation Zod, middleware auth |
| **Évolutivité** | Facilité d'ajout de features | Architecture en couches, providers React |

### 1.3 Diagramme d'Architecture Haut Niveau

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENTS                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                 │
│    │   Visiteur   │    │    Admin     │    │    Mobile    │                 │
│    │   (Public)   │    │  (Aurélie)   │    │  (Responsive)│                 │
│    └──────┬───────┘    └──────┬───────┘    └──────┬───────┘                 │
│           │                   │                   │                          │
└───────────┼───────────────────┼───────────────────┼──────────────────────────┘
            │                   │                   │
            └───────────────────┼───────────────────┘
                                │
                         ┌──────▼──────┐
                         │   Vercel    │
                         │  Edge CDN   │
                         └──────┬──────┘
                                │
┌───────────────────────────────┼──────────────────────────────────────────────┐
│                         NEXT.JS 15 APP                                        │
├───────────────────────────────┼──────────────────────────────────────────────┤
│                               │                                               │
│    ┌──────────────────────────┼──────────────────────────────┐               │
│    │                    APP ROUTER                            │               │
│    │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │               │
│    │  │   Pages     │  │     API     │  │   Middleware    │  │               │
│    │  │ (RSC + RCC) │  │   Routes    │  │   (Auth/CORS)   │  │               │
│    │  └──────┬──────┘  └──────┬──────┘  └────────┬────────┘  │               │
│    └─────────┼────────────────┼──────────────────┼───────────┘               │
│              │                │                  │                            │
│    ┌─────────▼────────────────▼──────────────────▼───────────┐               │
│    │                   SERVER ACTIONS                         │               │
│    │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │               │
│    │  │   Booking   │  │   Gallery   │  │    Analytics    │  │               │
│    │  │   Actions   │  │   Actions   │  │     Actions     │  │               │
│    │  └──────┬──────┘  └──────┬──────┘  └────────┬────────┘  │               │
│    └─────────┼────────────────┼──────────────────┼───────────┘               │
│              │                │                  │                            │
│    ┌─────────▼────────────────▼──────────────────▼───────────┐               │
│    │                   SERVICES LAYER                         │               │
│    │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────────────┐│               │
│    │  │ Email   │ │ Gallery │ │ Quotes  │ │    Settings     ││               │
│    │  │ Service │ │ Service │ │ Service │ │    Service      ││               │
│    │  └─────────┘ └─────────┘ └─────────┘ └─────────────────┘│               │
│    └─────────────────────────────────────────────────────────┘               │
│                                                                               │
└───────────────────────────────┬──────────────────────────────────────────────┘
                                │
┌───────────────────────────────┼──────────────────────────────────────────────┐
│                         SUPABASE                                              │
├───────────────────────────────┼──────────────────────────────────────────────┤
│    ┌─────────────┐    ┌───────┴───────┐    ┌─────────────┐                   │
│    │    Auth     │    │   PostgreSQL  │    │   Storage   │                   │
│    │  (Admin)    │    │  (12 tables)  │    │  (Photos)   │                   │
│    └─────────────┘    └───────────────┘    └─────────────┘                   │
└───────────────────────────────────────────────────────────────────────────────┘
                                │
              ┌─────────────────┼─────────────────┐
              │                 │                 │
       ┌──────▼──────┐   ┌──────▼──────┐   ┌──────▼──────┐
       │   Resend    │   │   ip-api    │   │  pdf-lib    │
       │   (Email)   │   │  (Geo IP)   │   │   (PDF)     │
       └─────────────┘   └─────────────┘   └─────────────┘
```

---

## 2. Stack Technique

### 2.1 Choix Technologiques et Justifications

| Technologie | Usage | Pourquoi ce choix ? |
|-------------|-------|---------------------|
| **Next.js 15** | Framework React | App Router, Server Components, Server Actions intégrés |
| **TypeScript** | Langage | Typage fort = moins de bugs, meilleure autocomplétion |
| **Tailwind CSS** | Styling | Utility-first, design system cohérent, responsive facile |
| **Supabase** | Backend | PostgreSQL + Auth + Storage en un seul service |
| **Resend** | Emails | API moderne, templates React, bon deliverability |
| **Zod** | Validation | Validation runtime type-safe, messages d'erreur français |
| **date-fns** | Dates | Légère, immutable, support français natif |
| **pdf-lib** | PDF | Génération côté serveur sans dépendances lourdes |
| **Vercel** | Hébergement | Intégration Next.js native, CDN global, preview deploys |

### 2.2 Concept Pédagogique : Pourquoi Supabase ?

> **Supabase** est un "Backend as a Service" (BaaS) qui fournit :
>
> 1. **PostgreSQL** : Base de données relationnelle puissante
> 2. **Auth** : Système d'authentification complet
> 3. **Storage** : Stockage de fichiers (images, PDF)
> 4. **RLS** : Row Level Security pour la sécurité au niveau des lignes
>
> **Avantage** : On n'a pas besoin de créer un backend séparé. Tout est géré par Supabase, et Next.js communique directement avec lui via le client JavaScript.

```typescript
// Exemple : Connexion à Supabase (lib/supabase/server.ts)
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );
}
```

---

## 3. Architecture Système

### 3.1 Pattern Architectural : Layered Architecture

L'application suit une architecture en couches avec séparation claire des responsabilités :

```
┌─────────────────────────────────────────────────────────────┐
│                    COUCHE PRÉSENTATION                       │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  Pages (app/)  →  Components (components/)              ││
│  │  • Server Components (données)                          ││
│  │  • Client Components (interactivité)                    ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    COUCHE MÉTIER                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  Actions (lib/actions/)  →  Services (lib/services/)    ││
│  │  • Validation des données                               ││
│  │  • Logique métier                                       ││
│  │  • Orchestration                                        ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    COUCHE DONNÉES                            │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  Supabase Client  →  PostgreSQL  →  Storage             ││
│  │  • Requêtes SQL                                         ││
│  │  • Gestion des fichiers                                 ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Concept Pédagogique : Server Components vs Client Components

Next.js 15 introduit deux types de composants React :

#### Server Components (par défaut)
- Exécutés sur le serveur uniquement
- Peuvent accéder directement à la base de données
- Ne peuvent pas utiliser `useState`, `useEffect`, ou les événements
- Meilleur pour le SEO et les performances

```typescript
// Exemple : Server Component (app/(public)/page.tsx)
// Pas de 'use client' = Server Component par défaut

import { getPhotos } from '@/lib/actions/gallery.actions';

export default async function HomePage() {
  // On peut appeler directement une fonction async
  const photos = await getPhotos();

  return (
    <main>
      <PortfolioSection photos={photos} />
    </main>
  );
}
```

#### Client Components
- Exécutés sur le client (navigateur)
- Peuvent utiliser les hooks React (`useState`, `useEffect`)
- Nécessaires pour l'interactivité (clics, formulaires)

```typescript
// Exemple : Client Component (components/booking/booking-calendar.tsx)
'use client';  // ← Directive obligatoire

import { useState } from 'react';

export function BookingCalendar() {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  return (
    <div onClick={() => setSelectedDate(new Date())}>
      {/* Interactivité possible */}
    </div>
  );
}
```

### 3.3 Concept Pédagogique : Server Actions

Les Server Actions sont des fonctions exécutées sur le serveur, appelables depuis le client :

```typescript
// lib/actions/booking.actions.ts
'use server';  // ← Directive obligatoire

import { revalidatePath } from 'next/cache';

export async function createAppointment(formData: FormData) {
  // 1. Extraire les données du formulaire
  const data = {
    client_name: formData.get('client_name') as string,
    client_email: formData.get('client_email') as string,
    // ...
  };

  // 2. Valider avec Zod
  const validated = bookingSchema.parse(data);

  // 3. Insérer en base de données
  const supabase = await createClient();
  const { data: appointment, error } = await supabase
    .from('appointments')
    .insert(validated)
    .select()
    .single();

  // 4. Invalider le cache pour rafraîchir les données
  revalidatePath('/admin/appointments');

  return { success: true, appointment };
}
```

**Utilisation dans un formulaire :**

```typescript
// components/booking/booking-form.tsx
'use client';

import { createAppointment } from '@/lib/actions/booking.actions';

export function BookingForm() {
  return (
    <form action={createAppointment}>
      <input name="client_name" required />
      <input name="client_email" type="email" required />
      <button type="submit">Réserver</button>
    </form>
  );
}
```

---

## 4. Structure du Projet

### 4.1 Arborescence Complète

```
aureluz/
├── app/                              # Next.js App Router
│   ├── (public)/                     # Route Group - Pages publiques
│   │   ├── page.tsx                  # Page d'accueil
│   │   ├── booking/page.tsx          # Système de réservation
│   │   ├── meeting/page.tsx          # Lien visioconférence
│   │   └── layout.tsx                # Layout avec Header/Footer
│   │
│   ├── (admin)/                      # Route Group - Back-office
│   │   ├── admin/
│   │   │   ├── page.tsx              # Dashboard
│   │   │   ├── appointments/         # Gestion des RDV
│   │   │   │   ├── page.tsx          # Liste des RDV
│   │   │   │   └── [id]/page.tsx     # Détail d'un RDV
│   │   │   ├── devis/                # Gestion des devis
│   │   │   │   ├── page.tsx          # Liste des devis
│   │   │   │   ├── nouveau/page.tsx  # Nouveau devis
│   │   │   │   └── [id]/             # Détail/modification
│   │   │   ├── analytics/page.tsx    # Tableau de bord analytics
│   │   │   ├── site/page.tsx         # Gestion du contenu
│   │   │   ├── preview/page.tsx      # Aperçu du site
│   │   │   ├── mailing/page.tsx      # Campagnes email
│   │   │   ├── settings/page.tsx     # Paramètres
│   │   │   └── layout.tsx            # Layout admin (sidebar)
│   │   └── login/page.tsx            # Connexion admin
│   │
│   ├── api/                          # API Routes
│   │   ├── analytics/track/route.ts  # Tracking analytics
│   │   └── quotes/[id]/
│   │       ├── pdf/route.ts          # Génération PDF
│   │       └── send/route.ts         # Envoi par email
│   │
│   ├── layout.tsx                    # Root layout
│   ├── error.tsx                     # Error boundary
│   ├── not-found.tsx                 # Page 404
│   ├── robots.ts                     # SEO robots.txt
│   └── sitemap.ts                    # SEO sitemap.xml
│
├── components/                       # Composants React
│   ├── ui/                           # Composants UI de base
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   └── ...
│   │
│   ├── layout/                       # Composants de mise en page
│   │   ├── header.tsx                # Navigation publique
│   │   └── footer.tsx                # Pied de page
│   │
│   ├── sections/                     # Sections de la page d'accueil
│   │   ├── hero.tsx                  # Bannière principale
│   │   ├── services.tsx              # Grille des services
│   │   ├── portfolio.tsx             # Galerie photos
│   │   ├── about.tsx                 # À propos
│   │   ├── testimonials.tsx          # Témoignages
│   │   └── contact-cta.tsx           # Call-to-action
│   │
│   ├── booking/                      # Système de réservation
│   │   ├── booking-wizard.tsx        # Conteneur multi-étapes
│   │   ├── booking-calendar.tsx      # Sélection de date
│   │   ├── time-slots.tsx            # Sélection d'heure
│   │   ├── booking-form.tsx          # Formulaire client
│   │   └── booking-confirmation.tsx  # Confirmation
│   │
│   ├── admin/                        # Composants admin
│   │   ├── admin-sidebar.tsx         # Navigation latérale
│   │   ├── stats-cards.tsx           # Cartes statistiques
│   │   ├── appointments-table.tsx    # Table des RDV
│   │   ├── quote-form.tsx            # Formulaire devis
│   │   ├── gallery-manager.tsx       # Gestion galerie
│   │   ├── services-manager.tsx      # Gestion services
│   │   ├── open-slots-manager.tsx    # Gestion ouvertures exceptionnelles
│   │   ├── business-hours-manager.tsx# Configuration jours/horaires
│   │   ├── preview-wrapper.tsx       # Aperçu responsive
│   │   └── ...
│   │
│   ├── analytics/                    # Composants analytics
│   │   ├── tracker.tsx               # Script de tracking
│   │   ├── analytics-overview.tsx    # Vue d'ensemble
│   │   ├── visitors-chart.tsx        # Graphique visiteurs
│   │   ├── conversion-funnel.tsx     # Entonnoir conversion
│   │   └── ...
│   │
│   ├── providers/                    # Context Providers
│   │   ├── logo-provider.tsx         # Contexte du logo
│   │   ├── contact-provider.tsx      # Contexte contact
│   │   └── preview-provider.tsx      # Mode aperçu
│   │
│   └── testimonials/                 # Témoignages
│       ├── testimonial-form.tsx      # Formulaire soumission
│       └── testimonial-form-toggle.tsx
│
├── lib/                              # Logique métier
│   ├── supabase/                     # Clients Supabase
│   │   ├── client.ts                 # Client navigateur
│   │   ├── server.ts                 # Client serveur
│   │   └── middleware.ts             # Client middleware
│   │
│   ├── services/                     # Services métier
│   │   ├── email.service.ts          # Envoi d'emails
│   │   ├── gallery.service.ts        # Gestion photos
│   │   ├── quotes.service.ts         # Gestion devis
│   │   ├── settings.service.ts       # Paramètres site
│   │   ├── site-services.service.ts  # Services configurables
│   │   ├── email-templates.service.ts # Templates email
│   │   └── geolocation.service.ts    # Géolocalisation IP
│   │
│   ├── actions/                      # Server Actions
│   │   ├── auth.actions.ts           # Authentification
│   │   ├── booking.actions.ts        # Réservations
│   │   ├── admin.actions.ts          # Administration
│   │   ├── gallery.actions.ts        # Galerie
│   │   ├── quotes.actions.ts         # Devis
│   │   ├── analytics.actions.ts      # Analytics
│   │   ├── services.actions.ts       # Services
│   │   ├── settings.actions.ts       # Paramètres
│   │   ├── testimonials.actions.ts   # Témoignages
│   │   ├── mailing.actions.ts        # Campagnes email
│   │   └── email-templates.actions.ts
│   │
│   ├── validators/                   # Schémas de validation
│   │   └── booking.schema.ts         # Validation réservation
│   │
│   ├── utils/                        # Utilitaires
│   │   ├── cn.ts                     # Fusion classes CSS
│   │   ├── date.ts                   # Manipulation dates
│   │   └── constants.ts              # Constantes métier
│   │
│   └── types/                        # Types TypeScript
│       └── index.ts                  # Tous les types
│
├── supabase/                         # Configuration Supabase
│   └── migrations/                   # Migrations SQL
│       ├── 001_create_appointments.sql
│       ├── 002_create_blocked_slots.sql
│       ├── 003_create_photos.sql
│       ├── 004_create_business_hours.sql
│       ├── 005_create_storage_bucket.sql
│       ├── 006_create_analytics.sql
│       ├── 007_create_quotes.sql
│       ├── 008_create_services.sql
│       ├── 009_create_site_settings.sql
│       ├── 010_create_email_templates.sql
│       ├── 011_add_contact_settings.sql
│       └── 20240106000000_create_testimonials.sql
│
├── public/                           # Assets statiques
│   └── images/
│
├── middleware.ts                     # Middleware Next.js (auth)
├── tailwind.config.ts                # Configuration Tailwind
└── architecture.md                   # Ce document
```

### 4.2 Concept Pédagogique : Route Groups

Les **Route Groups** (dossiers entre parenthèses) permettent d'organiser les routes sans affecter l'URL :

```
app/
├── (public)/           # URL: /
│   └── page.tsx        # accessible via /
│
├── (admin)/            # URL: /admin
│   └── admin/
│       └── page.tsx    # accessible via /admin
```

**Pourquoi ?** Chaque groupe peut avoir son propre `layout.tsx` :
- `(public)` : Header + Footer publics
- `(admin)` : Sidebar admin

---

## 5. Concepts Fondamentaux

### 5.1 React Context et Providers

Les **Providers** permettent de partager des données dans toute l'application sans passer les props manuellement (prop drilling).

#### Exemple : LogoProvider

```typescript
// components/providers/logo-provider.tsx
'use client';

import { createContext, useContext, ReactNode } from 'react';

// 1. Créer le contexte avec une valeur par défaut
const LogoContext = createContext<string>('/images/logo.png');

// 2. Créer le Provider qui enveloppe les enfants
interface LogoProviderProps {
  children: ReactNode;
  logoUrl: string;
}

export function LogoProvider({ children, logoUrl }: LogoProviderProps) {
  return (
    <LogoContext.Provider value={logoUrl}>
      {children}
    </LogoContext.Provider>
  );
}

// 3. Créer un hook personnalisé pour consommer le contexte
export function useLogo(): string {
  return useContext(LogoContext);
}
```

**Utilisation dans le layout :**

```typescript
// app/(public)/layout.tsx
import { getLogo } from '@/lib/actions/settings.actions';
import { LogoProvider } from '@/components/providers/logo-provider';

export default async function PublicLayout({ children }) {
  const logoUrl = await getLogo();  // Chargé côté serveur

  return (
    <LogoProvider logoUrl={logoUrl}>
      <Header />    {/* Peut utiliser useLogo() */}
      {children}
      <Footer />    {/* Peut utiliser useLogo() */}
    </LogoProvider>
  );
}
```

**Utilisation dans un composant :**

```typescript
// components/layout/header.tsx
'use client';

import { useLogo } from '@/components/providers/logo-provider';

export function Header() {
  const logoUrl = useLogo();  // Récupère le logo du contexte

  return (
    <header>
      <Image src={logoUrl} alt="Logo" />
    </header>
  );
}
```

### 5.2 Concept Pédagogique : Le Pattern Preview

L'application implémente un mode "aperçu" qui désactive les interactions dans l'admin :

```typescript
// components/providers/preview-provider.tsx
'use client';

import { createContext, useContext, ReactNode } from 'react';

interface PreviewContextType {
  isPreview: boolean;
}

const PreviewContext = createContext<PreviewContextType>({ isPreview: false });

export function PreviewProvider({ children, isPreview = false }) {
  return (
    <PreviewContext.Provider value={{ isPreview }}>
      {children}
    </PreviewContext.Provider>
  );
}

export function usePreview(): boolean {
  const context = useContext(PreviewContext);
  return context.isPreview;
}
```

**Utilisation pour désactiver les liens :**

```typescript
// components/layout/header.tsx
'use client';

import { usePreview } from '@/components/providers/preview-provider';

export function Header() {
  const isPreview = usePreview();

  return (
    <nav>
      {isPreview ? (
        // En mode preview : lien désactivé
        <span className="cursor-default opacity-80">Services</span>
      ) : (
        // Mode normal : lien fonctionnel
        <Link href="/#services">Services</Link>
      )}
    </nav>
  );
}
```

### 5.3 Validation avec Zod

**Zod** permet de valider les données côté serveur de manière type-safe :

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
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format de date invalide'),

  start_time: z
    .string()
    .regex(/^(0[9]|1[0-7]):00$/, 'Créneau horaire invalide'),

  event_type: z.enum(['signature', 'instants', 'coaching'], {
    errorMap: () => ({ message: "Type d'événement invalide" }),
  }),

  message: z
    .string()
    .max(1000, 'Le message est trop long')
    .optional(),
});

// Type TypeScript généré automatiquement
export type BookingFormData = z.infer<typeof bookingSchema>;
```

**Utilisation dans une Server Action :**

```typescript
// lib/actions/booking.actions.ts
'use server';

import { bookingSchema } from '@/lib/validators/booking.schema';

export async function createAppointment(formData: FormData) {
  try {
    // Validation avec messages d'erreur français
    const validated = bookingSchema.parse({
      client_name: formData.get('client_name'),
      client_email: formData.get('client_email'),
      // ...
    });

    // Si on arrive ici, les données sont valides
    // ...
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Retourner les erreurs de validation
      return {
        success: false,
        errors: error.errors.map(e => e.message)
      };
    }
    throw error;
  }
}
```

---

## 6. Modèle de Données

### 6.1 Diagramme Entité-Relation

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            BASE DE DONNÉES                                   │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────┐       ┌──────────────────────┐       ┌──────────────────────┐
│    appointments      │       │    blocked_slots     │       │   business_hours     │
├──────────────────────┤       ├──────────────────────┤       ├──────────────────────┤
│ id: uuid [PK]        │       │ id: uuid [PK]        │       │ id: uuid [PK]        │
│ client_name: varchar │       │ date: date           │       │ day_of_week: int     │
│ client_email: varchar│       │ start_time: time     │       │ open_time: time      │
│ client_phone: varchar│       │ end_time: time       │       │ close_time: time     │
│ date: date           │       │ reason: varchar?     │       │ is_open: boolean     │
│ start_time: time     │       │ created_at: timestamp│       └──────────────────────┘
│ end_time: time       │       └──────────────────────┘
│ event_type: enum     │                                      ┌──────────────────────┐
│ message: text?       │       ┌──────────────────────┐       │      open_slots      │
│ status: enum         │       │       photos         │       ├──────────────────────┤
│ created_at: timestamp│       ├──────────────────────┤       │ id: uuid [PK]        │
│ updated_at: timestamp│       │ id: uuid [PK]        │       │ date: date           │
└──────────────────────┘       │ url: varchar         │       │ start_time: time     │
                               │ alt: varchar         │       │ end_time: time       │
┌──────────────────────┐       │ category: enum       │       │ reason: varchar?     │
│       quotes         │       │ display_order: int   │       │ created_at: timestamp│
├──────────────────────┤       │ created_at: timestamp│       └──────────────────────┘
│ id: uuid [PK]        │       └──────────────────────┘
│ quote_number: varchar│                                      ┌──────────────────────┐
│ client_name: varchar │       ┌──────────────────────┐       │      services        │
│ client_email: varchar│       │    testimonials      │       ├──────────────────────┤
│ client_phone: varchar│       ├──────────────────────┤       │ id: uuid [PK]        │
│ client_address: text │       │ id: uuid [PK]        │       │ emoji: varchar       │
│ items: jsonb         │       │ client_name: varchar │       │ title: varchar       │
│ vat_rate: decimal    │       │ client_email: varchar│       │ description: text    │
│ subtotal: decimal    │       │ event_type: varchar  │       │ display_order: int   │
│ vat_amount: decimal  │       │ rating: int          │       │ is_active: boolean   │
│ total: decimal       │       │ title: varchar       │       │ created_at: timestamp│
│ notes: text?         │       │ content: text        │       └──────────────────────┘
│ validity_days: int   │       │ status: enum         │
│ status: enum         │       │ approved_at: timestamp│      ┌──────────────────────┐
│ created_at: timestamp│       │ created_at: timestamp│       │   site_settings      │
│ sent_at: timestamp?  │       └──────────────────────┘       ├──────────────────────┤
└──────────────────────┘                                      │ id: uuid [PK]        │
                                                              │ key: varchar [UK]    │
                                                              │ value: text          │
                                                              │ type: varchar        │
                                                              │ description: text    │
                                                              │ updated_at: timestamp│
                                                              └──────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│                            ANALYTICS TABLES                                   │
├──────────────────────────────────────────────────────────────────────────────┤

┌──────────────────────┐       ┌──────────────────────┐       ┌──────────────────────┐
│  analytics_sessions  │       │ analytics_page_views │       │   analytics_events   │
├──────────────────────┤       ├──────────────────────┤       ├──────────────────────┤
│ id: uuid [PK]        │       │ id: uuid [PK]        │       │ id: uuid [PK]        │
│ fingerprint: varchar │◄──────│ session_id: uuid [FK]│       │ session_id: uuid [FK]│
│ country/region/city  │       │ page_path: varchar   │       │ category: varchar    │
│ device_type: enum    │       │ referrer: varchar?   │       │ action: varchar      │
│ browser/os: varchar  │       │ time_on_page: int?   │       │ label: varchar?      │
│ utm_source/medium    │       │ scroll_depth: int?   │       │ value: decimal?      │
│ is_returning: boolean│       │ created_at: timestamp│       │ created_at: timestamp│
│ page_views_count: int│       └──────────────────────┘       └──────────────────────┘
│ created_at: timestamp│
└──────────────────────┘       ┌──────────────────────┐       ┌──────────────────────┐
                               │analytics_conversions │       │analytics_daily_stats │
                               ├──────────────────────┤       ├──────────────────────┤
                               │ id: uuid [PK]        │       │ id: uuid [PK]        │
                               │ session_id: uuid [FK]│       │ date: date [UK]      │
                               │ funnel_step: int     │       │ unique_visitors: int │
                               │ step_name: varchar   │       │ total_page_views: int│
                               │ is_converted: boolean│       │ avg_time_on_site: int│
                               │ created_at: timestamp│       │ bounce_rate: decimal │
                               └──────────────────────┘       │ conversion_rate: dec │
                                                              └──────────────────────┘
```

### 6.2 Concept Pédagogique : Row Level Security (RLS)

**RLS** est une fonctionnalité de PostgreSQL qui restreint l'accès aux lignes selon des règles :

```sql
-- Exemple : Migration 001_create_appointments.sql

-- Activer RLS sur la table
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Règle 1 : Tout le monde peut créer un RDV (visiteurs)
CREATE POLICY "Anyone can create appointments" ON appointments
    FOR INSERT
    WITH CHECK (true);  -- Toujours autorisé

-- Règle 2 : Seul l'admin peut lire tous les RDV
CREATE POLICY "Admin can read all appointments" ON appointments
    FOR SELECT
    USING (auth.role() = 'authenticated');  -- Doit être connecté

-- Règle 3 : Seul l'admin peut modifier
CREATE POLICY "Admin can update appointments" ON appointments
    FOR UPDATE
    USING (auth.role() = 'authenticated');

-- Règle 4 : Seul l'admin peut supprimer
CREATE POLICY "Admin can delete appointments" ON appointments
    FOR DELETE
    USING (auth.role() = 'authenticated');
```

**Résultat :**
- Un visiteur peut **créer** un RDV (réservation publique)
- Seul l'admin connecté peut **voir**, **modifier** ou **supprimer** les RDV
- Tout cela est géré au niveau de la base de données, pas du code

### 6.3 Types TypeScript

Les types sont centralisés dans `lib/types/index.ts` :

```typescript
// Statuts possibles pour un RDV
export type AppointmentStatus = 'pending' | 'confirmed' | 'cancelled';

// Type d'événement
export type EventType = 'signature' | 'instants' | 'coaching';

// Interface complète d'un rendez-vous
export interface Appointment {
  id: string;
  client_name: string;
  client_email: string;
  client_phone: string;
  date: string;           // Format: YYYY-MM-DD
  start_time: string;     // Format: HH:mm
  end_time: string;
  event_type: EventType;
  message: string | null;
  status: AppointmentStatus;
  created_at: string;
  updated_at: string;
}

// Type pour la création (sans id ni timestamps)
export interface CreateAppointmentInput {
  client_name: string;
  client_email: string;
  client_phone: string;
  date: string;
  start_time: string;
  event_type: EventType;
  message?: string;
}

// Type générique pour les résultats d'actions
export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };
```

---

## 7. Patterns d'Architecture

### 7.1 Pattern Service Layer

Les **Services** encapsulent la logique métier et les accès à la base de données :

```typescript
// lib/services/gallery.service.ts

import { createClient, createAdminClient } from '@/lib/supabase/server';

export class GalleryService {
  // Récupérer toutes les photos
  static async getAll(category?: string): Promise<Photo[]> {
    const supabase = await createClient();

    let query = supabase
      .from('photos')
      .select('*')
      .order('display_order', { ascending: true });

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  // Uploader vers Supabase Storage
  static async uploadToStorage(file: File): Promise<string> {
    const supabase = await createAdminClient();  // Admin pour écriture

    // Nom unique pour éviter les collisions
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const extension = file.name.split('.').pop();
    const filePath = `gallery/${fileName}.${extension}`;

    const { error } = await supabase.storage
      .from('photos')
      .upload(filePath, file);

    if (error) throw error;

    // Retourner l'URL publique
    const { data: { publicUrl } } = supabase.storage
      .from('photos')
      .getPublicUrl(filePath);

    return publicUrl;
  }

  // Supprimer une photo
  static async delete(photoId: string): Promise<void> {
    const supabase = await createAdminClient();

    // 1. Récupérer l'URL pour supprimer du storage
    const { data: photo } = await supabase
      .from('photos')
      .select('url')
      .eq('id', photoId)
      .single();

    // 2. Supprimer du storage
    if (photo?.url) {
      const filePath = photo.url.split('/').pop();
      await supabase.storage.from('photos').remove([`gallery/${filePath}`]);
    }

    // 3. Supprimer de la base de données
    await supabase.from('photos').delete().eq('id', photoId);
  }
}
```

### 7.2 Pattern Action → Service

Les **Actions** orchestrent les Services et gèrent le cache :

```typescript
// lib/actions/gallery.actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import { GalleryService } from '@/lib/services/gallery.service';

export async function uploadPhoto(formData: FormData) {
  const file = formData.get('file') as File;
  const category = formData.get('category') as string;
  const alt = formData.get('alt') as string;

  // Validation
  if (!file || file.size === 0) {
    return { success: false, error: 'Fichier requis' };
  }

  if (file.size > 5 * 1024 * 1024) {  // 5MB max
    return { success: false, error: 'Fichier trop volumineux (max 5MB)' };
  }

  try {
    // 1. Upload vers Storage via le service
    const url = await GalleryService.uploadToStorage(file);

    // 2. Créer l'entrée en BDD
    const photo = await GalleryService.create({ url, category, alt });

    // 3. Invalider le cache des pages concernées
    revalidatePath('/');                  // Page d'accueil (portfolio)
    revalidatePath('/admin/site');        // Page admin galerie

    return { success: true, photo };
  } catch (error) {
    console.error('Upload error:', error);
    return { success: false, error: 'Erreur lors de l\'upload' };
  }
}
```

### 7.3 Concept Pédagogique : Revalidation du Cache

Next.js met en cache les pages pour les performances. Après une modification, il faut invalider ce cache :

```typescript
import { revalidatePath, revalidateTag } from 'next/cache';

// Invalider une page spécifique
revalidatePath('/admin/appointments');

// Invalider par tag (plus granulaire)
revalidateTag('appointments');
```

### 7.4 Pattern Lazy Initialization

Pour éviter les erreurs au build (quand les variables d'env ne sont pas disponibles) :

```typescript
// lib/services/email.service.ts

import { Resend } from 'resend';

// Ne pas initialiser directement au niveau du module
let resendClient: Resend | null = null;

// Initialisation paresseuse
function getResendClient(): Resend {
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
}

export class EmailService {
  static async sendBookingConfirmation(appointment: Appointment) {
    const resend = getResendClient();  // Initialisé à la première utilisation

    await resend.emails.send({
      from: 'AureLuz <contact@aureluzdesign.fr>',
      to: appointment.client_email,
      subject: 'Confirmation de votre demande',
      html: generateEmailHTML(appointment),
    });
  }
}
```

---

## 8. Flux de Données

### 8.1 Flux de Réservation Complet

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    FLUX DE RÉSERVATION                                       │
└─────────────────────────────────────────────────────────────────────────────┘

Visiteur                          Système                           Admin
   │                                 │                                 │
   │  1. Accède à /booking           │                                 │
   │────────────────────────────────▶│                                 │
   │                                 │                                 │
   │  ◄─────────────────────────────│  2. Server Component charge     │
   │     Calendrier + créneaux       │     - getAvailableSlots()      │
   │     disponibles                 │     - business_hours           │
   │                                 │     - blocked_slots            │
   │                                 │     - existing appointments    │
   │                                 │                                 │
   │  3. Sélectionne date + heure    │                                 │
   │────────────────────────────────▶│                                 │
   │                                 │                                 │
   │  ◄─────────────────────────────│  4. Affiche formulaire         │
   │     Formulaire client           │                                 │
   │                                 │                                 │
   │  5. Remplit et soumet           │                                 │
   │────────────────────────────────▶│                                 │
   │                                 │                                 │
   │                                 │  6. Server Action:              │
   │                                 │     - Valide avec Zod          │
   │                                 │     - Vérifie disponibilité    │
   │                                 │     - Insère en BDD            │
   │                                 │     - Envoie emails            │
   │                                 │────────────────────────────────▶│
   │                                 │     Email notification         │
   │                                 │                                 │
   │  ◄─────────────────────────────│  7. Retourne confirmation      │
   │     Page confirmation           │                                 │
   │     + Email de confirmation     │                                 │
   │                                 │                                 │
   │                                 │                                 │
   │                                 │  8. Admin consulte dashboard   │
   │                                 │◀────────────────────────────────│
   │                                 │                                 │
   │                                 │  9. Admin confirme/refuse      │
   │                                 │◀────────────────────────────────│
   │                                 │                                 │
   │  ◄─────────────────────────────│  10. Email statut update       │
   │     Email avec nouveau statut   │                                 │
   │                                 │                                 │
```

### 8.2 Code du Flux de Réservation

**Étape 1-2 : Chargement des créneaux disponibles**

```typescript
// lib/actions/booking.actions.ts
'use server';

export async function getAvailableSlots(date: string): Promise<TimeSlot[]> {
  const supabase = await createClient();
  const dayOfWeek = new Date(date).getDay();

  // 1. Récupérer les horaires d'ouverture du jour
  const { data: hours } = await supabase
    .from('business_hours')
    .select('*')
    .eq('day_of_week', dayOfWeek)
    .single();

  if (!hours?.is_open) {
    return [];  // Jour fermé
  }

  // 2. Récupérer les RDV existants pour cette date
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

  // 4. Générer les créneaux avec disponibilité
  const bookedTimes = new Set([
    ...appointments?.map(a => a.start_time) || [],
    ...blocked?.map(b => b.start_time) || [],
  ]);

  const slots: TimeSlot[] = [];
  let hour = parseInt(hours.open_time.split(':')[0]);
  const closeHour = parseInt(hours.close_time.split(':')[0]);

  while (hour < closeHour) {
    const time = `${hour.toString().padStart(2, '0')}:00`;
    slots.push({
      time,
      available: !bookedTimes.has(time),
    });
    hour++;
  }

  return slots;
}
```

**Étape 5-7 : Création du rendez-vous**

```typescript
// lib/actions/booking.actions.ts
'use server';

export async function createAppointment(formData: FormData) {
  const supabase = await createClient();

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

  try {
    const validated = bookingSchema.parse(rawData);

    // 2. Vérifier que le créneau est toujours disponible
    const { data: existing } = await supabase
      .from('appointments')
      .select('id')
      .eq('date', validated.date)
      .eq('start_time', validated.start_time)
      .neq('status', 'cancelled')
      .single();

    if (existing) {
      return { success: false, error: 'Ce créneau vient d\'être réservé' };
    }

    // 3. Calculer l'heure de fin (1h après)
    const startHour = parseInt(validated.start_time.split(':')[0]);
    const end_time = `${(startHour + 1).toString().padStart(2, '0')}:00`;

    // 4. Insérer en base de données
    const { data: appointment, error } = await supabase
      .from('appointments')
      .insert({
        ...validated,
        end_time,
        status: 'pending',
      })
      .select()
      .single();

    if (error) throw error;

    // 5. Envoyer les emails
    await Promise.all([
      EmailService.sendBookingConfirmation(appointment),
      EmailService.sendAdminNotification(appointment),
    ]);

    // 6. Invalider le cache
    revalidatePath('/booking');
    revalidatePath('/admin/appointments');

    return { success: true, appointment };

  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }
    return { success: false, error: 'Erreur lors de la réservation' };
  }
}
```

### 8.3 Flux Analytics (RGPD-Compliant)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    FLUX ANALYTICS                                            │
└─────────────────────────────────────────────────────────────────────────────┘

Visiteur (Browser)                API Route                    Base de données
       │                              │                              │
       │  1. Page chargée             │                              │
       │  ─ FingerprintJS génère ID   │                              │
       │  ─ Pas de cookies !          │                              │
       │                              │                              │
       │  2. POST /api/analytics/track│                              │
       │  {type: 'session',           │                              │
       │   fingerprint: 'abc123',     │                              │
       │   device: 'desktop',         │                              │
       │   browser: 'Chrome'}         │                              │
       │─────────────────────────────▶│                              │
       │                              │  3. Géolocalise via IP       │
       │                              │  ─ ip-api.com (gratuit)      │
       │                              │                              │
       │                              │  4. INSERT analytics_sessions│
       │                              │─────────────────────────────▶│
       │                              │                              │
       │  5. Navigation sur /booking  │                              │
       │                              │                              │
       │  6. POST /api/analytics/track│                              │
       │  {type: 'page_view',         │                              │
       │   page_path: '/booking'}     │                              │
       │─────────────────────────────▶│                              │
       │                              │  7. INSERT analytics_page_views
       │                              │  8. UPDATE analytics_conversions
       │                              │     (funnel_step = 2)        │
       │                              │─────────────────────────────▶│
       │                              │                              │
       │  9. Réservation confirmée    │                              │
       │                              │                              │
       │  10. POST {type: 'funnel',   │                              │
       │      step: 7, converted: true}│                             │
       │─────────────────────────────▶│                              │
       │                              │  11. UPDATE is_converted=true│
       │                              │─────────────────────────────▶│
```

**Pourquoi c'est RGPD-compliant :**
- Pas de cookies
- Pas de données personnelles identifiables (PII)
- Le fingerprint est un hash, pas réversible
- La géolocalisation est basée sur l'IP (approximative)

---

## 9. Système d'Authentification

### 9.1 Architecture d'Authentification

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    FLUX D'AUTHENTIFICATION                                   │
└─────────────────────────────────────────────────────────────────────────────┘

                         ┌──────────────────┐
                         │  Supabase Auth   │
                         │  (Email/Password)│
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

### 9.2 Middleware de Protection des Routes

```typescript
// middleware.ts
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options) {
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options) {
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  const { data: { session } } = await supabase.auth.getSession();

  // Protection des routes /admin/*
  if (request.nextUrl.pathname.startsWith('/admin')) {
    if (!session) {
      // Rediriger vers la page de connexion
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // Si déjà connecté et sur /login, rediriger vers /admin
  if (request.nextUrl.pathname === '/login' && session) {
    return NextResponse.redirect(new URL('/admin', request.url));
  }

  return response;
}

// Appliquer le middleware uniquement sur ces routes
export const config = {
  matcher: ['/admin/:path*', '/login'],
};
```

### 9.3 Server Action de Connexion

```typescript
// lib/actions/auth.actions.ts
'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export async function login(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: 'Email ou mot de passe incorrect' };
  }

  redirect('/admin');
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}

export async function getSession() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}
```

---

## 10. Système d'Analytics

### 10.1 Architecture Analytics

Le système d'analytics est conçu pour être **RGPD-compliant** tout en fournissant des métriques utiles :

```typescript
// components/analytics/tracker.tsx
'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

export function AnalyticsTracker() {
  const pathname = usePathname();
  const sessionId = useRef<string | null>(null);
  const pageLoadTime = useRef<number>(Date.now());

  useEffect(() => {
    // Générer un fingerprint unique (sans cookies)
    const generateFingerprint = async () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      ctx?.fillText('fingerprint', 10, 10);

      const data = [
        navigator.userAgent,
        navigator.language,
        screen.width,
        screen.height,
        new Date().getTimezoneOffset(),
        canvas.toDataURL(),
      ].join('|');

      // Hasher pour anonymiser
      const hash = await crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(data)
      );
      return Array.from(new Uint8Array(hash))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    };

    const initSession = async () => {
      const fingerprint = await generateFingerprint();

      // Créer la session côté serveur
      const response = await fetch('/api/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'session',
          fingerprint,
          device_type: getDeviceType(),
          browser: getBrowser(),
          os: getOS(),
          referrer: document.referrer,
          utm_source: new URLSearchParams(location.search).get('utm_source'),
        }),
      });

      const { sessionId: id } = await response.json();
      sessionId.current = id;
    };

    initSession();
  }, []);

  // Tracker les changements de page
  useEffect(() => {
    if (!sessionId.current) return;

    // Envoyer le temps passé sur la page précédente
    const timeOnPage = Date.now() - pageLoadTime.current;

    fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'page_view',
        session_id: sessionId.current,
        page_path: pathname,
        time_on_previous_page: timeOnPage,
      }),
    });

    pageLoadTime.current = Date.now();
  }, [pathname]);

  return null;  // Composant invisible
}
```

### 10.2 Entonnoir de Conversion

Le système track un entonnoir en 7 étapes :

```typescript
// Étapes du funnel de conversion
const FUNNEL_STEPS = [
  { step: 1, name: 'homepage', label: 'Page d\'accueil' },
  { step: 2, name: 'booking_page', label: 'Page réservation' },
  { step: 3, name: 'date_selected', label: 'Date sélectionnée' },
  { step: 4, name: 'time_selected', label: 'Créneau sélectionné' },
  { step: 5, name: 'form_started', label: 'Formulaire commencé' },
  { step: 6, name: 'form_submitted', label: 'Formulaire soumis' },
  { step: 7, name: 'confirmation', label: 'Confirmation' },
];
```

---

## 11. Système d'Emails

### 11.1 Architecture Email

```typescript
// lib/services/email.service.ts

import { Resend } from 'resend';

let resendClient: Resend | null = null;

function getResendClient(): Resend {
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
}

export class EmailService {
  // Email de confirmation au client
  static async sendBookingConfirmation(appointment: Appointment) {
    const resend = getResendClient();

    await resend.emails.send({
      from: 'AureLuz Design <contact@aureluzdesign.fr>',
      to: appointment.client_email,
      subject: 'Confirmation de votre demande de rendez-vous',
      html: this.generateConfirmationHTML(appointment),
    });
  }

  // Notification à l'admin
  static async sendAdminNotification(appointment: Appointment) {
    const resend = getResendClient();
    const adminEmail = await SettingsService.get('admin_email');

    await resend.emails.send({
      from: 'AureLuz Design <noreply@aureluzdesign.fr>',
      to: adminEmail || 'aureluzdesign@gmail.com',
      subject: `Nouvelle demande de RDV - ${appointment.client_name}`,
      html: this.generateAdminNotificationHTML(appointment),
    });
  }

  // Template HTML responsive
  private static generateConfirmationHTML(appointment: Appointment): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #c9a227;">Merci pour votre demande !</h1>

            <p>Bonjour ${appointment.client_name},</p>

            <p>Nous avons bien reçu votre demande de consultation pour :</p>

            <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Date :</strong> ${formatDate(appointment.date)}</p>
              <p><strong>Heure :</strong> ${appointment.start_time}</p>
              <p><strong>Type :</strong> ${appointment.event_type}</p>
            </div>

            <p>Nous reviendrons vers vous très rapidement pour confirmer ce rendez-vous.</p>

            <p style="color: #888; font-size: 14px; margin-top: 40px;">
              L'équipe AureLuz Design
            </p>
          </div>
        </body>
      </html>
    `;
  }
}
```

### 11.2 Détection Gmail pour Templates Simplifiés

Gmail traite différemment les emails HTML complexes. On détecte et adapte :

```typescript
// lib/services/email.service.ts

static async sendSalonCampaignEmail(
  to: string,
  subject: string,
  content: EmailTemplateContent
) {
  const resend = getResendClient();
  const isGmail = this.isGmailAddress(to);

  // Template différent selon le client email
  const html = isGmail
    ? this.generateSimpleTemplate(content)   // Version texte simple
    : this.generateDesignTemplate(content);  // Version HTML riche

  await resend.emails.send({
    from: 'AureLuz Design <contact@aureluzdesign.fr>',
    to,
    subject,
    html,
  });
}

private static isGmailAddress(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase();
  return domain === 'gmail.com' || domain === 'googlemail.com';
}
```

---

## 12. Bonnes Pratiques

### 12.1 Gestion des Erreurs

```typescript
// Pattern try-catch avec typage
export async function safeAction<T>(
  action: () => Promise<T>
): Promise<ActionResult<T>> {
  try {
    const data = await action();
    return { success: true, data };
  } catch (error) {
    console.error('Action error:', error);

    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }

    if (error instanceof Error) {
      return { success: false, error: error.message };
    }

    return { success: false, error: 'Une erreur est survenue' };
  }
}
```

### 12.2 Constantes Métier Centralisées

```typescript
// lib/utils/constants.ts

export const BUSINESS_CONFIG = {
  // Horaires
  DEFAULT_OPEN_TIME: '09:00',
  DEFAULT_CLOSE_TIME: '18:00',
  SLOT_DURATION: 60,  // minutes

  // Réservation
  MIN_BOOKING_NOTICE: 24,  // heures
  MAX_BOOKING_MONTHS_AHEAD: 3,

  // Upload
  MAX_UPLOAD_SIZE: 5 * 1024 * 1024,  // 5MB
  ACCEPTED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  MAX_GALLERY_PHOTOS: 20,
} as const;

export const EVENT_TYPES = [
  { value: 'signature', label: 'Signature' },
  { value: 'instants', label: 'Instants' },
  { value: 'coaching', label: 'Coaching' },
] as const;

export const APPOINTMENT_STATUSES = {
  pending: { label: 'En attente', color: 'yellow' },
  confirmed: { label: 'Confirmé', color: 'green' },
  cancelled: { label: 'Annulé', color: 'red' },
} as const;
```

### 12.3 Utilitaires de Date avec Locale Français

```typescript
// lib/utils/date.ts

import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

// Formater une date en français
export function formatDate(date: string | Date, pattern = 'dd MMMM yyyy'): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, pattern, { locale: fr });
}

// Exemples d'utilisation :
// formatDate('2026-01-15') → "15 janvier 2026"
// formatDate('2026-01-15', 'EEEE dd MMMM') → "jeudi 15 janvier"
```

### 12.4 Fusion de Classes CSS (Tailwind)

```typescript
// lib/utils/cn.ts

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Fusionne les classes en gérant les conflits Tailwind
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Exemple d'utilisation :
// cn('px-4 py-2', isActive && 'bg-primary', 'px-6')
// → 'py-2 px-6 bg-primary' (px-4 est remplacé par px-6)
```

---

## 13. Référence des Fichiers

### 13.1 Pages Publiques

| Fichier | URL | Description |
|---------|-----|-------------|
| `app/(public)/page.tsx` | `/` | Page d'accueil avec toutes les sections |
| `app/(public)/booking/page.tsx` | `/booking` | Système de réservation |
| `app/(public)/meeting/page.tsx` | `/meeting` | Lien visioconférence |

### 13.2 Pages Admin

| Fichier | URL | Description |
|---------|-----|-------------|
| `app/(admin)/admin/page.tsx` | `/admin` | Dashboard avec statistiques |
| `app/(admin)/admin/appointments/page.tsx` | `/admin/appointments` | Liste des RDV |
| `app/(admin)/admin/appointments/[id]/page.tsx` | `/admin/appointments/:id` | Détail d'un RDV |
| `app/(admin)/admin/devis/page.tsx` | `/admin/devis` | Liste des devis |
| `app/(admin)/admin/devis/nouveau/page.tsx` | `/admin/devis/nouveau` | Créer un devis |
| `app/(admin)/admin/devis/[id]/page.tsx` | `/admin/devis/:id` | Voir un devis |
| `app/(admin)/admin/analytics/page.tsx` | `/admin/analytics` | Tableau de bord analytics |
| `app/(admin)/admin/site/page.tsx` | `/admin/site` | Gestion du contenu |
| `app/(admin)/admin/preview/page.tsx` | `/admin/preview` | Aperçu responsive |
| `app/(admin)/admin/mailing/page.tsx` | `/admin/mailing` | Campagnes email |
| `app/(admin)/admin/settings/page.tsx` | `/admin/settings` | Paramètres |

### 13.3 Services

| Service | Responsabilité |
|---------|---------------|
| `EmailService` | Envoi d'emails (confirmation, notification, campagnes) |
| `GalleryService` | Upload, gestion et ordonnancement des photos |
| `QuotesService` | CRUD devis, acceptation, paiement, génération PDF, statistiques |
| `SettingsService` | Paramètres site (logo, contact, réseaux sociaux) |
| `SiteServicesService` | Services configurables (Signature, Instants, Coaching) |
| `EmailTemplatesService` | Templates email éditables |
| `GeolocationService` | Géolocalisation IP pour analytics |

### 13.4 Migrations SQL

| Migration | Tables créées |
|-----------|---------------|
| `001` | `appointments` - Rendez-vous |
| `002` | `blocked_slots` - Créneaux bloqués |
| `003` | `photos` - Galerie |
| `004` | `business_hours` - Horaires |
| `005` | Bucket Storage `photos` |
| `006` | `analytics_*` - 5 tables analytics |
| `007` | `quotes` - Devis |
| `008` | `services` - Services configurables |
| `009` | `site_settings` - Paramètres |
| `010` | `email_templates` - Templates email |
| `011` | Ajout paramètres contact |
| `012-014` | `quote_payments`, `invoices` - Paiements multi-échéances |
| `015` | Ajout `accepted_at` - Date acceptation devis |
| `016` | `open_slots` - Créneaux ouverts exceptionnellement |
| `20240106*` | `testimonials` - Témoignages |

---

## Changelog

### Version 2.3 (Janvier 2026)
- Configuration des horaires d'ouverture depuis l'admin
- Nouvel onglet "Horaires" dans Gestion du site
- Composant `BusinessHoursManager` pour gérer jours ouvrables et plages horaires
- Server Actions `business-hours.actions.ts` pour CRUD
- Pièces jointes supportées dans l'envoi de devis et mailing

### Version 2.2 (Janvier 2026)
- Ouvertures exceptionnelles : possibilité d'ouvrir des créneaux sur jours fermés (weekends)
- Nouvelle table `open_slots` pour gérer les ouvertures
- Composant `OpenSlotsManager` dans l'admin (page Paramètres)
- Créneaux exceptionnels affichés en vert dans le calendrier et les slots
- Propriété `isExceptional` sur les créneaux pour distinction visuelle
- Les ouvertures exceptionnelles contournent le délai de 24h

### Version 2.1 (Janvier 2026)
- Workflow devis amélioré : acceptation client avant paiement
- Nouveau statut `paid` pour les devis payés
- Champ `accepted_at` pour tracer l'acceptation
- Échéancier de paiement personnalisable par l'admin
- UI admin mise à jour avec badges statuts (Accepté/Payé)

### Version 2.0 (Janvier 2026)
- Ajout système d'analytics RGPD-compliant
- Ajout gestion des devis avec PDF
- Ajout campagnes email avec templates
- Ajout aperçu responsive du site
- Ajout témoignages clients
- Ajout services configurables
- Documentation pédagogique complète

### Version 1.0 (Initial)
- Site vitrine avec sections
- Système de réservation
- Back-office admin basique
- Gestion galerie photos

---

**Document maintenu par l'équipe de développement AureLuz Design**

*Ce document est mis à jour à chaque évolution majeure de l'application.*
