'use client';

import { Target } from 'lucide-react';
import type { FunnelStep } from '@/lib/types';

interface ConversionFunnelProps {
  data: FunnelStep[];
}

export function ConversionFunnel({ data }: ConversionFunnelProps) {
  if (data.length === 0 || data.every((d) => d.count === 0)) {
    return (
      <div className="bg-background rounded-xl border border-border p-6">
        <div className="flex items-center gap-2 mb-4">
          <Target className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-medium text-foreground">Funnel de conversion</h3>
        </div>
        <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
          Aucune donnée de conversion
        </div>
      </div>
    );
  }

  const maxCount = Math.max(...data.map((d) => d.count));

  return (
    <div className="bg-background rounded-xl border border-border p-6">
      <div className="flex items-center gap-2 mb-4">
        <Target className="h-5 w-5 text-muted-foreground" />
        <h3 className="font-medium text-foreground">Funnel de conversion</h3>
      </div>
      <div className="space-y-3">
        {data.map((step, index) => {
          const widthPercent = maxCount > 0 ? (step.count / maxCount) * 100 : 0;
          const isLast = index === data.length - 1;

          // Couleur dégradée du bleu au vert
          const colors = [
            'bg-blue-500',
            'bg-blue-400',
            'bg-cyan-500',
            'bg-teal-500',
            'bg-emerald-500',
            'bg-green-500',
            'bg-green-600',
          ];
          const color = colors[index % colors.length];

          return (
            <div key={step.step}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-foreground">{step.label}</span>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-foreground">
                    {step.count.toLocaleString('fr-FR')}
                  </span>
                  {!isLast && step.dropoff > 0 && (
                    <span className="text-xs text-red-500">-{step.dropoff}%</span>
                  )}
                </div>
              </div>
              <div className="h-8 bg-secondary rounded-lg overflow-hidden relative">
                <div
                  className={`h-full ${color} rounded-lg transition-all duration-500 flex items-center justify-end pr-3`}
                  style={{ width: `${Math.max(widthPercent, 2)}%` }}
                >
                  {widthPercent > 15 && (
                    <span className="text-xs text-white font-medium">
                      {step.percentage}%
                    </span>
                  )}
                </div>
                {widthPercent <= 15 && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                    {step.percentage}%
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Conversion rate summary */}
      {data.length > 0 && data[0].count > 0 && (
        <div className="mt-6 pt-4 border-t border-border">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Taux de conversion global
            </span>
            <span className="text-lg font-semibold text-green-600">
              {data[data.length - 1].percentage}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
