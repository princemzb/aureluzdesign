'use client';

import { Activity, Eye, MousePointerClick, CheckCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { RecentActivity } from '@/lib/types';

interface RecentActivityProps {
  data: RecentActivity[];
}

function ActivityIcon({ type }: { type: RecentActivity['type'] }) {
  switch (type) {
    case 'page_view':
      return <Eye className="h-4 w-4 text-blue-500" />;
    case 'event':
      return <MousePointerClick className="h-4 w-4 text-purple-500" />;
    case 'conversion':
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    default:
      return <Activity className="h-4 w-4 text-gray-500" />;
  }
}

function getActivityBadge(type: RecentActivity['type']) {
  switch (type) {
    case 'page_view':
      return { label: 'Page', className: 'bg-blue-100 text-blue-700' };
    case 'event':
      return { label: 'Event', className: 'bg-purple-100 text-purple-700' };
    case 'conversion':
      return { label: 'Conversion', className: 'bg-green-100 text-green-700' };
    default:
      return { label: 'Activité', className: 'bg-gray-100 text-gray-700' };
  }
}

export function RecentActivityFeed({ data }: RecentActivityProps) {
  if (data.length === 0) {
    return (
      <div className="bg-background rounded-xl border border-border p-6">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-medium text-foreground">Activité récente</h3>
        </div>
        <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
          Aucune activité récente
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background rounded-xl border border-border p-6">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="h-5 w-5 text-muted-foreground" />
        <h3 className="font-medium text-foreground">Activité récente</h3>
        <span className="ml-auto text-xs text-muted-foreground">
          {data.length} événements
        </span>
      </div>
      <div className="space-y-3 max-h-[400px] overflow-y-auto">
        {data.map((activity) => {
          const badge = getActivityBadge(activity.type);
          const timeAgo = formatDistanceToNow(new Date(activity.timestamp), {
            addSuffix: true,
            locale: fr,
          });

          return (
            <div
              key={activity.id}
              className="flex items-start gap-3 p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
            >
              <div className="mt-0.5">
                <ActivityIcon type={activity.type} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${badge.className}`}>
                    {badge.label}
                  </span>
                  {activity.country && (
                    <span className="text-xs text-muted-foreground">
                      {activity.country}
                    </span>
                  )}
                  {activity.device && (
                    <span className="text-xs text-muted-foreground capitalize">
                      • {activity.device}
                    </span>
                  )}
                </div>
                <p className="text-sm text-foreground truncate">{activity.description}</p>
                <p className="text-xs text-muted-foreground mt-1">{timeAgo}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
