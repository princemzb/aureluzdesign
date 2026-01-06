'use client';

import { Share2 } from 'lucide-react';
import type { TrafficSource } from '@/lib/types';

interface TrafficSourcesProps {
  data: TrafficSource[];
}

// Couleurs pour les sources de trafic
const SOURCE_COLORS: Record<string, string> = {
  Direct: '#6b7280',
  Google: '#4285f4',
  Facebook: '#1877f2',
  Instagram: '#e4405f',
  'Twitter/X': '#000000',
  LinkedIn: '#0a66c2',
  Pinterest: '#bd081c',
};

function getSourceColor(source: string): string {
  return SOURCE_COLORS[source] || '#8b5cf6';
}

export function TrafficSources({ data }: TrafficSourcesProps) {
  if (data.length === 0) {
    return (
      <div className="bg-background rounded-xl border border-border p-6">
        <div className="flex items-center gap-2 mb-4">
          <Share2 className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-medium text-foreground">Sources de trafic</h3>
        </div>
        <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
          Aucune donnée disponible
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background rounded-xl border border-border p-6">
      <div className="flex items-center gap-2 mb-4">
        <Share2 className="h-5 w-5 text-muted-foreground" />
        <h3 className="font-medium text-foreground">Sources de trafic</h3>
      </div>
      <div className="space-y-3">
        {data.map((source) => (
          <div key={source.source}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: getSourceColor(source.source) }}
                />
                <span className="text-sm text-foreground">{source.source}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-foreground">
                  {source.visitors.toLocaleString('fr-FR')}
                </span>
                {source.conversions > 0 && (
                  <span className="text-xs text-green-600 bg-green-50 px-1.5 py-0.5 rounded">
                    {source.conversions} conv.
                  </span>
                )}
              </div>
            </div>
            <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${source.percentage}%`,
                  backgroundColor: getSourceColor(source.source),
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
