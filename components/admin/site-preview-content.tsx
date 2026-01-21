'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ExternalLink, RotateCcw, Monitor, Tablet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';

type DeviceMode = 'desktop' | 'tablet';

const devices = [
  { mode: 'desktop' as const, icon: Monitor, label: 'Bureau', width: 'w-full' },
  { mode: 'tablet' as const, icon: Tablet, label: 'Tablette', width: 'w-[768px]' },
];

export function SitePreviewContent() {
  const router = useRouter();
  const [deviceMode, setDeviceMode] = useState<DeviceMode>('desktop');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setIframeKey((k) => k + 1);
    router.refresh();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleOpenSite = () => {
    window.open('/', '_blank');
  };

  const currentDevice = devices.find((d) => d.mode === deviceMode)!;

  return (
    <div className="space-y-4">
      {/* Info banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Mode aperçu :</strong> Les liens de navigation et boutons de validation sont désactivés.
          Utilisez les icônes ci-dessous pour tester le rendu responsive.
        </p>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        {/* Device selector */}
        <div className="flex items-center gap-1 p-1 bg-secondary rounded-lg">
          {devices.map((device) => (
            <Button
              key={device.mode}
              variant={deviceMode === device.mode ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setDeviceMode(device.mode)}
              className="gap-2"
            >
              <device.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{device.label}</span>
            </Button>
          ))}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="gap-2"
          >
            <RotateCcw
              className={cn(
                'h-4 w-4 transition-transform duration-500',
                isRefreshing && 'animate-spin'
              )}
            />
            <span className="hidden sm:inline">Actualiser</span>
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleOpenSite}
            className="gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            <span className="hidden sm:inline">Ouvrir le site</span>
          </Button>
        </div>
      </div>

      {/* Preview container */}
      <div className="bg-secondary/30 rounded-xl border border-border overflow-hidden">
        {/* Browser chrome */}
        <div className="bg-neutral-100 border-b border-neutral-200 px-4 py-2 flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <div className="w-3 h-3 rounded-full bg-yellow-400" />
            <div className="w-3 h-3 rounded-full bg-green-400" />
          </div>
          <div className="flex-1 mx-4">
            <div className="bg-white rounded-md px-3 py-1 text-xs text-muted-foreground border max-w-xs mx-auto text-center">
              aureluzdesign.fr
            </div>
          </div>
        </div>

        {/* Site preview iframe */}
        <div className="bg-neutral-200 p-4 flex justify-center min-h-[70vh] overflow-auto">
          <div
            className={cn(
              'bg-white shadow-xl transition-all duration-300 overflow-hidden',
              currentDevice.width,
              deviceMode !== 'desktop' && 'rounded-lg'
            )}
          >
            <iframe
              key={iframeKey}
              src="/"
              className="w-full h-[65vh] border-0"
              title="Aperçu du site"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
