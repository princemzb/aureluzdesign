'use client';

import { FileText } from 'lucide-react';
import type { TopPage } from '@/lib/types';

interface TopPagesTableProps {
  data: TopPage[];
}

function formatDuration(seconds: number): string {
  if (seconds === 0) return '-';
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}

function getPageName(path: string): string {
  const pageNames: Record<string, string> = {
    '/': 'Accueil',
    '/booking': 'Réservation',
    '/gallery': 'Galerie',
    '/about': 'À propos',
    '/contact': 'Contact',
    '/login': 'Connexion',
    '/testimonials': 'Témoignages',
  };
  return pageNames[path] || path;
}

export function TopPagesTable({ data }: TopPagesTableProps) {
  if (data.length === 0) {
    return (
      <div className="bg-background rounded-xl border border-border p-6">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-medium text-foreground">Pages les plus visitées</h3>
        </div>
        <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
          Aucune donnée disponible
        </div>
      </div>
    );
  }

  const maxViews = Math.max(...data.map((p) => p.views));

  return (
    <div className="bg-background rounded-xl border border-border p-6">
      <div className="flex items-center gap-2 mb-4">
        <FileText className="h-5 w-5 text-muted-foreground" />
        <h3 className="font-medium text-foreground">Pages les plus visitées</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left text-xs font-medium text-muted-foreground pb-3">
                Page
              </th>
              <th className="text-right text-xs font-medium text-muted-foreground pb-3 w-20">
                Vues
              </th>
              <th className="text-right text-xs font-medium text-muted-foreground pb-3 w-24">
                Uniques
              </th>
              <th className="text-right text-xs font-medium text-muted-foreground pb-3 w-24">
                Temps moy.
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((page) => (
              <tr key={page.page_path} className="border-b border-border last:border-0">
                <td className="py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {getPageName(page.page_path)}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {page.page_path}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 h-1 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full"
                      style={{ width: `${(page.views / maxViews) * 100}%` }}
                    />
                  </div>
                </td>
                <td className="text-right text-sm text-foreground py-3">
                  {page.views.toLocaleString('fr-FR')}
                </td>
                <td className="text-right text-sm text-muted-foreground py-3">
                  {page.unique_views.toLocaleString('fr-FR')}
                </td>
                <td className="text-right text-sm text-muted-foreground py-3">
                  {formatDuration(page.avg_time_seconds)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
