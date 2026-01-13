# Système de Preview

## Vue d'ensemble

Le système de preview permet à l'administrateur de visualiser le rendu du site client directement depuis le back-office, sans affecter le site en production. Les interactions (liens, boutons de soumission) sont désactivées en mode preview.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Page Preview (Server Component)               │
│                   app/(admin)/admin/preview/page.tsx             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌──────────────────────────────────────────────────────────┐  │
│   │              PreviewWrapper (Client Component)            │  │
│   │         components/admin/preview-wrapper.tsx              │  │
│   │                                                           │  │
│   │   ┌────────────────────────────────────────────────────┐ │  │
│   │   │    Device Selector    │    Action Buttons          │ │  │
│   │   │   [Bureau] [Tablette] │  [Actualiser] [Ouvrir]     │ │  │
│   │   └────────────────────────────────────────────────────┘ │  │
│   │                                                           │  │
│   │   ┌────────────────────────────────────────────────────┐ │  │
│   │   │              Browser Chrome (fake)                  │ │  │
│   │   │   🔴 🟡 🟢   |  aureluzdesign.fr  |                 │ │  │
│   │   └────────────────────────────────────────────────────┘ │  │
│   │                                                           │  │
│   │   ┌────────────────────────────────────────────────────┐ │  │
│   │   │              Preview Container                      │ │  │
│   │   │   ┌──────────────────────────────────────────────┐ │ │  │
│   │   │   │         PreviewProvider (isPreview=true)     │ │ │  │
│   │   │   │   ┌──────────────────────────────────────┐   │ │ │  │
│   │   │   │   │            Site Components           │   │ │ │  │
│   │   │   │   │   Header, Hero, Services, etc.       │   │ │ │  │
│   │   │   │   └──────────────────────────────────────┘   │ │ │  │
│   │   │   └──────────────────────────────────────────────┘ │ │  │
│   │   └────────────────────────────────────────────────────┘ │  │
│   └──────────────────────────────────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Fichiers impliqués

| Fichier | Rôle |
|---------|------|
| `app/(admin)/admin/preview/page.tsx` | Page principale, Server Component qui charge les données |
| `components/admin/preview-wrapper.tsx` | Wrapper avec sélecteur de device et contrôles |
| `components/providers/preview-provider.tsx` | Context React pour propager l'état preview |
| `tailwind.config.ts` | Animation `spin-once` pour le bouton refresh |

## Concepts clés

### 1. React Context pour l'état Preview

Le `PreviewProvider` utilise React Context pour propager l'état `isPreview` à tous les composants enfants sans prop drilling.

```typescript
// components/providers/preview-provider.tsx
'use client';

import { createContext, useContext, ReactNode } from 'react';

interface PreviewContextType {
  isPreview: boolean;
}

const PreviewContext = createContext<PreviewContextType>({ isPreview: false });

export function PreviewProvider({ children, isPreview = false }: PreviewProviderProps) {
  return (
    <PreviewContext.Provider value={{ isPreview }}>
      {children}
    </PreviewContext.Provider>
  );
}

// Hook personnalisé pour consommer le contexte
export function usePreview(): boolean {
  const context = useContext(PreviewContext);
  return context.isPreview;
}
```

**Pourquoi ce pattern ?**
- Évite de passer `isPreview` en prop à travers 5+ niveaux de composants
- Permet à n'importe quel composant de savoir s'il est en mode preview
- Valeur par défaut `false` = comportement normal sur le site public

### 2. Désactivation conditionnelle des interactions

Chaque composant interactif vérifie l'état preview et désactive ses actions :

```typescript
// Exemple dans components/sections/hero.tsx
'use client';

import { usePreview } from '@/components/providers/preview-provider';

export function HeroSection() {
  const isPreview = usePreview();

  return (
    // ...
    {isPreview ? (
      // Bouton désactivé visuellement
      <Button size="xl" className="cursor-default opacity-80">
        Réserver une consultation
        <ArrowRight className="ml-2 h-5 w-5" />
      </Button>
    ) : (
      // Bouton fonctionnel avec lien
      <Button asChild size="xl">
        <Link href="/booking">
          Réserver une consultation
          <ArrowRight className="ml-2 h-5 w-5" />
        </Link>
      </Button>
    )}
  );
}
```

**Composants modifiés pour le preview :**
- `Header` - liens de navigation désactivés
- `Footer` - liens désactivés
- `HeroSection` - boutons CTA désactivés
- `AboutSection` - bouton "Planifier une rencontre" désactivé
- `ContactCTASection` - bouton de contact désactivé
- `TestimonialForm` - soumission de formulaire bloquée

### 3. Preview Responsive avec état local

Le `PreviewWrapper` gère l'état du device sélectionné et applique dynamiquement la largeur :

```typescript
// components/admin/preview-wrapper.tsx
type DeviceMode = 'desktop' | 'tablet';

const devices: DeviceConfig[] = [
  { mode: 'desktop', icon: Monitor, label: 'Bureau', width: 'w-full' },
  { mode: 'tablet', icon: Tablet, label: 'Tablette', width: 'w-[768px]' },
];

export function PreviewWrapper({ children }: PreviewWrapperProps) {
  const [deviceMode, setDeviceMode] = useState<DeviceMode>('desktop');

  const currentDevice = devices.find((d) => d.mode === deviceMode)!;

  return (
    <div className={cn(
      'bg-white shadow-xl transition-all duration-300',
      currentDevice.width,  // Applique w-full ou w-[768px]
      deviceMode !== 'desktop' && 'rounded-lg'
    )}>
      {children}
    </div>
  );
}
```

### 4. Animation personnalisée Tailwind

L'icône de refresh fait une rotation complète au clic grâce à une animation custom :

```typescript
// tailwind.config.ts
keyframes: {
  'spin-once': {
    '0%': { transform: 'rotate(0deg)' },
    '100%': { transform: 'rotate(-360deg)' },
  },
},
animation: {
  'spin-once': 'spin-once 0.5s ease-in-out',
},
```

```typescript
// Utilisation dans preview-wrapper.tsx
const [isRefreshing, setIsRefreshing] = useState(false);

const handleRefresh = () => {
  setIsRefreshing(true);
  router.refresh();
  setTimeout(() => setIsRefreshing(false), 500); // Durée = animation
};

<RotateCcw className={cn(
  'h-4 w-4 transition-transform duration-500',
  isRefreshing && 'animate-spin-once'
)} />
```

## Points d'extension

### Ajouter un nouveau device

```typescript
// Dans preview-wrapper.tsx
const devices: DeviceConfig[] = [
  { mode: 'desktop', icon: Monitor, label: 'Bureau', width: 'w-full' },
  { mode: 'tablet', icon: Tablet, label: 'Tablette', width: 'w-[768px]' },
  // Ajouter ici :
  { mode: 'phone', icon: Smartphone, label: 'Mobile', width: 'w-[375px]' },
];
```

### Rendre un nouveau composant compatible preview

1. Convertir en Client Component (`'use client'`)
2. Importer et utiliser le hook `usePreview()`
3. Conditionner les interactions selon `isPreview`

```typescript
'use client';

import { usePreview } from '@/components/providers/preview-provider';

export function MonNouveauComposant() {
  const isPreview = usePreview();

  return (
    <button
      onClick={isPreview ? undefined : handleClick}
      className={cn(isPreview && 'cursor-default opacity-80')}
      disabled={isPreview}
    >
      Mon action
    </button>
  );
}
```

## Maintenance

### Checklist après ajout d'un bouton/lien sur le site public

- [ ] Le composant utilise-t-il `usePreview()` ?
- [ ] Les interactions sont-elles conditionnées par `isPreview` ?
- [ ] Le style visuel indique-t-il que l'élément est désactivé (`opacity-80`, `cursor-default`) ?

### Problèmes courants

| Problème | Cause | Solution |
|----------|-------|----------|
| Bouton cliquable en preview | `usePreview()` non appelé | Ajouter le hook et conditionner |
| "useContext" error | Composant Server Component | Ajouter `'use client'` en haut |
| Animation ne se déclenche pas | État pas réinitialisé | Vérifier le `setTimeout` reset |
