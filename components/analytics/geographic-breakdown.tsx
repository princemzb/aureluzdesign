'use client';

import { Globe } from 'lucide-react';
import type { GeographicData } from '@/lib/types';

interface GeographicBreakdownProps {
  data: GeographicData[];
}

// Mapping des codes pays vers les drapeaux emoji
const countryFlags: Record<string, string> = {
  FR: '🇫🇷',
  US: '🇺🇸',
  GB: '🇬🇧',
  DE: '🇩🇪',
  ES: '🇪🇸',
  IT: '🇮🇹',
  BE: '🇧🇪',
  CH: '🇨🇭',
  CA: '🇨🇦',
  NL: '🇳🇱',
  PT: '🇵🇹',
  BR: '🇧🇷',
  MA: '🇲🇦',
  DZ: '🇩🇿',
  TN: '🇹🇳',
  XX: '🌍',
};

function getFlag(countryCode: string): string {
  return countryFlags[countryCode] || '🌍';
}

export function GeographicBreakdown({ data }: GeographicBreakdownProps) {
  if (data.length === 0) {
    return (
      <div className="bg-background rounded-xl border border-border p-6">
        <div className="flex items-center gap-2 mb-4">
          <Globe className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-medium text-foreground">Pays</h3>
        </div>
        <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
          Aucune donnée géographique
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background rounded-xl border border-border p-6">
      <div className="flex items-center gap-2 mb-4">
        <Globe className="h-5 w-5 text-muted-foreground" />
        <h3 className="font-medium text-foreground">Pays</h3>
      </div>
      <div className="space-y-3">
        {data.map((country) => (
          <div key={country.country_code} className="flex items-center gap-3">
            <span className="text-xl">{getFlag(country.country_code)}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-foreground truncate">
                  {country.country_name}
                </span>
                <span className="text-sm text-muted-foreground">
                  {country.visitors}
                </span>
              </div>
              <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all"
                  style={{ width: `${country.percentage}%` }}
                />
              </div>
            </div>
            <span className="text-xs text-muted-foreground w-10 text-right">
              {country.percentage}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
