'use client';

import { useState, ReactNode } from 'react';
import { Send, FileEdit } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface MailingTabsProps {
  sendContent: ReactNode;
  editContent: ReactNode;
}

const TABS = [
  { id: 'send', label: 'Envoyer', icon: Send },
  { id: 'edit', label: 'Éditer le template', icon: FileEdit },
] as const;

type TabId = typeof TABS[number]['id'];

export function MailingTabs({ sendContent, editContent }: MailingTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>('send');

  const getContent = (tabId: TabId): ReactNode => {
    switch (tabId) {
      case 'send':
        return sendContent;
      case 'edit':
        return editContent;
    }
  };

  return (
    <div className="space-y-6">
      {/* Tabs navigation */}
      <div className="bg-background rounded-xl border border-border p-1 flex gap-1">
        {TABS.map((tab) => {
          const Icon = tab.icon;
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
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div>{getContent(activeTab)}</div>
    </div>
  );
}
