'use client';

import { useState, ReactNode } from 'react';
import { Sparkles, Image, MessageSquare, ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface SiteManagementTabsProps {
  servicesContent: ReactNode;
  galleryContent: ReactNode;
  testimonialsContent: ReactNode;
  logoContent: ReactNode;
  counts: {
    services: number;
    photos: number;
    testimonials: number;
  };
}

const TABS = [
  { id: 'services', label: 'Services', icon: Sparkles },
  { id: 'gallery', label: 'Galerie', icon: Image },
  { id: 'testimonials', label: 'Témoignages', icon: MessageSquare },
  { id: 'logo', label: 'Logo', icon: ImageIcon },
] as const;

type TabId = typeof TABS[number]['id'];

export function SiteManagementTabs({
  servicesContent,
  galleryContent,
  testimonialsContent,
  logoContent,
  counts,
}: SiteManagementTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>('services');

  const getCount = (tabId: TabId): number | undefined => {
    switch (tabId) {
      case 'services':
        return counts.services;
      case 'gallery':
        return counts.photos;
      case 'testimonials':
        return counts.testimonials;
      default:
        return undefined;
    }
  };

  const getContent = (tabId: TabId): ReactNode => {
    switch (tabId) {
      case 'services':
        return servicesContent;
      case 'gallery':
        return galleryContent;
      case 'testimonials':
        return testimonialsContent;
      case 'logo':
        return logoContent;
    }
  };

  return (
    <div className="space-y-6">
      {/* Tabs navigation */}
      <div className="bg-background rounded-xl border border-border p-1 flex flex-wrap gap-1">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const count = getCount(tab.id);
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
              {count !== undefined && (
                <span
                  className={cn(
                    'px-2 py-0.5 rounded-full text-xs',
                    isActive
                      ? 'bg-primary-foreground/20 text-primary-foreground'
                      : 'bg-secondary text-muted-foreground'
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div>{getContent(activeTab)}</div>
    </div>
  );
}
