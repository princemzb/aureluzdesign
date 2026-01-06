'use client';

import { Users, Eye, Clock, TrendingUp, TrendingDown, Target, MousePointerClick } from 'lucide-react';
import type { AnalyticsOverview } from '@/lib/types';

interface AnalyticsOverviewProps {
  data: AnalyticsOverview;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}

function ChangeIndicator({ value }: { value: number }) {
  if (value === 0) return null;

  const isPositive = value > 0;
  const Icon = isPositive ? TrendingUp : TrendingDown;
  const colorClass = isPositive ? 'text-green-600' : 'text-red-600';

  return (
    <span className={`flex items-center gap-1 text-xs ${colorClass}`}>
      <Icon className="h-3 w-3" />
      {Math.abs(value)}%
    </span>
  );
}

export function AnalyticsOverviewCards({ data }: AnalyticsOverviewProps) {
  const stats = [
    {
      label: 'Visiteurs uniques',
      value: data.uniqueVisitors.toLocaleString('fr-FR'),
      change: data.comparison.visitorsChange,
      icon: Users,
      color: 'bg-blue-100 text-blue-700',
    },
    {
      label: 'Pages vues',
      value: data.pageViews.toLocaleString('fr-FR'),
      change: data.comparison.pageViewsChange,
      icon: Eye,
      color: 'bg-purple-100 text-purple-700',
    },
    {
      label: 'Durée moyenne',
      value: formatDuration(data.avgSessionDuration),
      change: null,
      icon: Clock,
      color: 'bg-amber-100 text-amber-700',
    },
    {
      label: 'Taux de rebond',
      value: `${data.bounceRate}%`,
      change: -data.comparison.bounceRateChange, // Inverse car un rebond plus bas est mieux
      icon: MousePointerClick,
      color: 'bg-rose-100 text-rose-700',
    },
    {
      label: 'Conversions',
      value: data.conversions.toLocaleString('fr-FR'),
      change: data.comparison.conversionsChange,
      icon: Target,
      color: 'bg-green-100 text-green-700',
    },
    {
      label: 'Taux de conversion',
      value: `${data.conversionRate}%`,
      change: null,
      icon: TrendingUp,
      color: 'bg-emerald-100 text-emerald-700',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="bg-background rounded-xl border border-border p-4"
        >
          <div className="flex items-center gap-2 mb-3">
            <div className={`p-2 rounded-lg ${stat.color}`}>
              <stat.icon className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-semibold text-foreground">{stat.value}</p>
          <div className="flex items-center justify-between mt-1">
            <p className="text-xs text-muted-foreground">{stat.label}</p>
            {stat.change !== null && <ChangeIndicator value={stat.change} />}
          </div>
        </div>
      ))}
    </div>
  );
}
