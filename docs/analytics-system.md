# Systeme d'Analytics

## Vue d'ensemble

Systeme d'analytics custom et RGPD-compliant. Pas de cookies, pas de donnees personnelles stockees, identification par fingerprint hashe.

**Alternative a** : Google Analytics, Plausible, Fathom

**Avantages** :
- 100% proprietaire, donnees hebergees sur Supabase
- Pas de banniere cookies requise
- Funnel de conversion personnalise pour le business
- Donnees en temps reel

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│    ┌──────────────────────────────────────────────────────────────────────┐ │
│    │                    AnalyticsTracker (Client Component)                │ │
│    │                   components/analytics/tracker.tsx                    │ │
│    │                                                                       │ │
│    │   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                  │ │
│    │   │ Fingerprint │  │ Page Views  │  │ Scroll Depth│                  │ │
│    │   │   (hash)    │  │  Tracking   │  │  Tracking   │                  │ │
│    │   └──────┬──────┘  └──────┬──────┘  └──────┬──────┘                  │ │
│    │          │                │                │                          │ │
│    └──────────┼────────────────┼────────────────┼──────────────────────────┘ │
│               │                │                │                            │
│               └────────────────┼────────────────┘                            │
│                                │                                             │
│                        ┌───────▼───────┐                                     │
│                        │ POST /api/    │                                     │
│                        │ analytics/    │                                     │
│                        │ track         │                                     │
│                        └───────┬───────┘                                     │
└────────────────────────────────┼─────────────────────────────────────────────┘
                                 │
┌────────────────────────────────┼─────────────────────────────────────────────┐
│                           SUPABASE                                           │
├────────────────────────────────┼─────────────────────────────────────────────┤
│                                │                                             │
│    ┌───────────────────────────▼──────────────────────────────────────────┐ │
│    │                         TABLES                                        │ │
│    │  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐          │ │
│    │  │   sessions     │  │   page_views   │  │    events      │          │ │
│    │  │ (fingerprint,  │  │ (path, time,   │  │ (category,     │          │ │
│    │  │  device, geo)  │  │  scroll depth) │  │  action)       │          │ │
│    │  └────────────────┘  └────────────────┘  └────────────────┘          │ │
│    │  ┌────────────────┐  ┌────────────────┐                              │ │
│    │  │  conversions   │  │  daily_stats   │                              │ │
│    │  │ (funnel steps) │  │ (pre-agregees) │                              │ │
│    │  └────────────────┘  └────────────────┘                              │ │
│    └──────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

## Fichiers impliques

| Fichier | Role |
|---------|------|
| `components/analytics/tracker.tsx` | Client component, genere fingerprint, track pages/scroll |
| `app/api/analytics/track/route.ts` | API endpoint, recoit et stocke les donnees |
| `lib/actions/analytics.actions.ts` | Server Actions pour lire les stats (admin) |
| `components/analytics/analytics-overview.tsx` | Dashboard admin, affichage des metriques |
| `supabase/migrations/006_create_analytics.sql` | Schema des tables analytics |

## Concepts cles

### 1. Fingerprinting RGPD-compliant

Le fingerprint est un hash des caracteristiques du navigateur, **sans cookies ni donnees personnelles** :

```typescript
// components/analytics/tracker.tsx
function generateFingerprint(): string {
  const components = [
    navigator.userAgent,
    navigator.language,
    screen.width,
    screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
    navigator.hardwareConcurrency || 0,
    navigator.deviceMemory || 0,
  ].join('|');

  // Hash djb2 (non-reversible)
  let hash = 5381;
  for (let i = 0; i < components.length; i++) {
    hash = (hash * 33) ^ components.charCodeAt(i);
  }
  return Math.abs(hash).toString(16);
}
```

**Pourquoi c'est RGPD-compliant :**
- Le hash n'est pas reversible (impossible de retrouver l'utilisateur)
- Aucune donnee personnelle stockee (pas d'email, nom, IP)
- L'IP est utilisee pour geolocalisation mais **jamais stockee**

### 2. Session avec sessionStorage

La session est stockee dans `sessionStorage` (pas `localStorage`) = nouvelle session a chaque onglet/fenetre.

```typescript
const STORAGE_KEY = 'aureluz_session_id';

// A la creation de session
if (result?.sessionId) {
  sessionIdRef.current = result.sessionId as string;
  sessionStorage.setItem(STORAGE_KEY, result.sessionId as string);
}

// A la reprise
const existingSessionId = sessionStorage.getItem(STORAGE_KEY);
if (existingSessionId) {
  sessionIdRef.current = existingSessionId;
  return; // Pas de nouvelle session
}
```

### 3. Tracking automatique des pages

Le tracker utilise les hooks Next.js pour detecter les changements de route :

```typescript
const pathname = usePathname();
const searchParams = useSearchParams();

// Track a chaque changement de pathname
useEffect(() => {
  if (sessionIdRef.current) {
    trackPageView();
  }
}, [pathname, trackPageView]);
```

### 4. Scroll Depth avec requestAnimationFrame

Mesure la profondeur de scroll sans bloquer le thread principal :

```typescript
useEffect(() => {
  let maxScroll = 0;
  let ticking = false;

  const handleScroll = () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
        if (scrollHeight > 0) {
          const currentScroll = Math.round((window.scrollY / scrollHeight) * 100);
          maxScroll = Math.max(maxScroll, Math.min(currentScroll, 100));
        }
        ticking = false;
      });
      ticking = true;
    }
  };

  window.addEventListener('scroll', handleScroll, { passive: true });
  // ...
}, []);
```

**Pourquoi `requestAnimationFrame` :**
- Evite de ralentir le scroll (performance)
- Se synchronise avec le refresh de l'ecran
- Pattern standard pour les handlers de scroll

### 5. sendBeacon pour les donnees de sortie

Quand l'utilisateur quitte la page, `fetch()` peut etre annule. `sendBeacon` garantit l'envoi :

```typescript
const handleBeforeUnload = () => {
  if (pageViewIdRef.current && maxScroll > 0) {
    navigator.sendBeacon(
      '/api/analytics/track',
      JSON.stringify({
        type: 'scroll',
        pageViewId: pageViewIdRef.current,
        scrollDepth: maxScroll,
      })
    );
  }
};

window.addEventListener('beforeunload', handleBeforeUnload);
```

### 6. Funnel de Conversion

Le funnel suit les etapes du parcours de reservation :

```sql
-- Table analytics_conversions
step_homepage_visit TIMESTAMPTZ,
step_booking_page_visit TIMESTAMPTZ,
step_date_selected TIMESTAMPTZ,
step_time_selected TIMESTAMPTZ,
step_form_started TIMESTAMPTZ,
step_form_submitted TIMESTAMPTZ,
step_confirmation_viewed TIMESTAMPTZ,
```

Tracking depuis les composants :

```typescript
import { trackFunnelStep } from '@/components/analytics/tracker';

// Dans le composant de reservation
const handleDateSelect = (date: Date) => {
  trackFunnelStep('date_selected');
  setSelectedDate(date);
};

const handleTimeSelect = (slot: TimeSlot) => {
  trackFunnelStep('time_selected');
  setSelectedSlot(slot);
};
```

### 7. Row Level Security (RLS)

Les donnees analytics ont des regles RLS specifiques :

```sql
-- Tout le monde peut inserer (tracking anonyme)
CREATE POLICY "Anyone can insert sessions" ON analytics_sessions
    FOR INSERT WITH CHECK (true);

-- Seul admin peut lire (dashboard)
CREATE POLICY "Admin can read sessions" ON analytics_sessions
    FOR SELECT USING (auth.role() = 'authenticated');
```

**Pourquoi cette structure :**
- INSERT public = le tracker fonctionne sans authentification
- SELECT restreint = les stats ne sont visibles que par l'admin

### 8. Stats pre-agregees

Pour eviter des requetes lourdes, les stats quotidiennes sont pre-calculees :

```sql
CREATE TABLE analytics_daily_stats (
    date DATE UNIQUE NOT NULL,
    total_sessions INTEGER DEFAULT 0,
    unique_visitors INTEGER DEFAULT 0,
    total_page_views INTEGER DEFAULT 0,
    bounce_rate NUMERIC(5,2) DEFAULT 0,
    conversions INTEGER DEFAULT 0,
    -- ...
);

-- Fonction d'agregation
CREATE OR REPLACE FUNCTION aggregate_daily_analytics(target_date DATE)
RETURNS void AS $$
  -- Agregation des sessions du jour dans daily_stats
$$ LANGUAGE plpgsql;
```

**Execution** : via cron job quotidien (a configurer dans Supabase ou Vercel)

## Schema de la base

```
analytics_sessions          analytics_page_views
├── id (UUID)               ├── id (UUID)
├── fingerprint_hash        ├── session_id (FK)
├── started_at              ├── page_path
├── country_code/name       ├── page_title
├── device_type             ├── viewed_at
├── browser/version         ├── time_on_page_seconds
├── os/version              └── max_scroll_depth
├── screen_width/height
├── referrer_url/domain     analytics_events
├── utm_source/medium/      ├── id (UUID)
│   campaign                ├── session_id (FK)
├── page_views_count        ├── event_category
├── is_bounce               ├── event_action
└── is_converted            ├── event_label
                            └── event_value
analytics_conversions
├── id (UUID)               analytics_daily_stats
├── session_id (FK)         ├── date (UNIQUE)
├── step_* (timestamps)     ├── total_sessions
├── converted_at            ├── unique_visitors
└── appointment_id (FK)     └── bounce_rate, etc.
```

## Points d'extension

### Ajouter un nouvel evenement custom

```typescript
// Depuis n'importe quel composant client
import { trackEvent } from '@/components/analytics/tracker';

// Exemple : clic sur bouton CTA
const handleCTAClick = () => {
  trackEvent('engagement', 'cta_click', 'hero_button');
};

// Exemple : lecture video
const handleVideoPlay = () => {
  trackEvent('media', 'video_play', 'presentation_video');
};
```

### Ajouter une nouvelle etape au funnel

1. Modifier la migration SQL :
```sql
ALTER TABLE analytics_conversions
ADD COLUMN step_new_step TIMESTAMPTZ;
```

2. Ajouter le type dans le tracker :
```typescript
export function trackFunnelStep(
  step:
    | 'date_selected'
    | 'time_selected'
    // ...
    | 'new_step'  // Ajouter ici
): void
```

3. Modifier `getFunnelStats` dans `analytics.actions.ts`

### Ajouter une nouvelle metrique au dashboard

1. Ajouter le type dans `lib/types/index.ts`
2. Modifier `getAnalyticsData` dans `analytics.actions.ts`
3. Ajouter le composant d'affichage dans `analytics-overview.tsx`

## Maintenance

### Checklist quotidienne

- [ ] Verifier que l'agregation daily_stats fonctionne (cron)
- [ ] Monitorer la taille des tables (pagination si > 100k lignes)

### Purge des anciennes donnees

Pour respecter le RGPD et optimiser les performances :

```sql
-- Supprimer les sessions de plus de 2 ans
DELETE FROM analytics_sessions
WHERE started_at < NOW() - INTERVAL '2 years';

-- Garder les daily_stats indefiniment (agregees, anonymes)
```

### Debug du tracking

1. Ouvrir la console navigateur
2. Onglet Network, filtrer "track"
3. Verifier les requetes POST vers `/api/analytics/track`
4. Status 200 = tracking OK

### Problemes courants

| Probleme | Cause | Solution |
|----------|-------|----------|
| Pas de sessions creees | sessionStorage bloque | Verifier les extensions navigateur |
| Stats a 0 | RLS bloque les INSERT | Verifier la policy "Anyone can insert" |
| Page views manquantes | Composant non monte | Verifier que AnalyticsTracker est dans le layout |
| Scroll depth toujours 0 | Page courte | Normal si pas de scroll possible |
