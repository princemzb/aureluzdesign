'use client';

import { useState } from 'react';
import { Eye, Monitor, Tablet, Smartphone, RefreshCw, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

type DeviceSize = 'desktop' | 'tablet' | 'mobile';

const DEVICE_SIZES: Record<DeviceSize, { width: string; icon: typeof Monitor }> = {
  desktop: { width: '100%', icon: Monitor },
  tablet: { width: '768px', icon: Tablet },
  mobile: { width: '375px', icon: Smartphone },
};

export default function PreviewPage() {
  const [device, setDevice] = useState<DeviceSize>('desktop');
  const [key, setKey] = useState(0);

  const handleRefresh = () => {
    setKey((prev) => prev + 1);
  };

  const openInNewTab = () => {
    window.open('/', '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Eye className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-serif font-medium text-foreground">
              Aperçu du site client
            </h1>
            <p className="text-muted-foreground mt-1">
              Visualisez les modifications en temps réel
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Device selector */}
          <div className="flex items-center gap-1 bg-secondary rounded-lg p-1">
            {(Object.keys(DEVICE_SIZES) as DeviceSize[]).map((deviceKey) => {
              const { icon: Icon } = DEVICE_SIZES[deviceKey];
              return (
                <button
                  key={deviceKey}
                  onClick={() => setDevice(deviceKey)}
                  className={`p-2 rounded-md transition-colors ${
                    device === deviceKey
                      ? 'bg-background shadow-sm text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  title={deviceKey.charAt(0).toUpperCase() + deviceKey.slice(1)}
                >
                  <Icon className="h-4 w-4" />
                </button>
              );
            })}
          </div>

          {/* Refresh button */}
          <Button variant="outline" size="icon" onClick={handleRefresh} title="Rafraîchir">
            <RefreshCw className="h-4 w-4" />
          </Button>

          {/* Open in new tab */}
          <Button variant="outline" size="icon" onClick={openInNewTab} title="Ouvrir dans un nouvel onglet">
            <ExternalLink className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Info banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Mode aperçu :</strong> Les liens de navigation et boutons de validation sont désactivés.
        </p>
      </div>

      {/* Preview container */}
      <div className="bg-secondary/30 rounded-xl border border-border p-4 min-h-[600px]">
        <div
          className="mx-auto bg-white rounded-lg shadow-lg overflow-hidden transition-all duration-300"
          style={{ width: DEVICE_SIZES[device].width, maxWidth: '100%' }}
        >
          {/* Browser chrome */}
          <div className="bg-neutral-100 border-b border-neutral-200 px-4 py-2 flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <div className="w-3 h-3 rounded-full bg-yellow-400" />
              <div className="w-3 h-3 rounded-full bg-green-400" />
            </div>
            <div className="flex-1 mx-4">
              <div className="bg-white rounded-md px-3 py-1 text-xs text-muted-foreground border">
                aureluzdesign.fr
              </div>
            </div>
          </div>

          {/* Iframe - Simple version */}
          <iframe
            key={key}
            src="/?preview=1"
            className="w-full border-0"
            style={{ height: '70vh', minHeight: '500px' }}
            title="Aperçu du site client"
          />
        </div>
      </div>
    </div>
  );
}
