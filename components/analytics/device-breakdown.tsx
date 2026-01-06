'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Monitor, Smartphone, Tablet } from 'lucide-react';
import type { DeviceData, BrowserData } from '@/lib/types';


interface DeviceBreakdownProps {
  devices: DeviceData[];
  browsers: BrowserData[];
}

const DEVICE_COLORS = {
  desktop: '#3b82f6',
  mobile: '#8b5cf6',
  tablet: '#f59e0b',
  unknown: '#6b7280',
};

const BROWSER_COLORS = ['#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444'];

const DEVICE_ICONS = {
  desktop: Monitor,
  mobile: Smartphone,
  tablet: Tablet,
};

const DEVICE_LABELS = {
  desktop: 'Ordinateur',
  mobile: 'Mobile',
  tablet: 'Tablette',
  unknown: 'Inconnu',
};

export function DeviceBreakdown({ devices, browsers }: DeviceBreakdownProps) {
  const hasDeviceData = devices.length > 0;
  const hasBrowserData = browsers.length > 0;

  return (
    <div className="bg-background rounded-xl border border-border p-6">
      <h3 className="font-medium text-foreground mb-4">Appareils & Navigateurs</h3>

      <div className="grid grid-cols-2 gap-6">
        {/* Devices */}
        <div>
          <p className="text-sm text-muted-foreground mb-3">Appareils</p>
          {hasDeviceData ? (
            <>
              <div className="h-[120px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={devices as unknown as Record<string, unknown>[]}
                      dataKey="count"
                      nameKey="device_type"
                      cx="50%"
                      cy="50%"
                      innerRadius={30}
                      outerRadius={50}
                      paddingAngle={2}
                    >
                      {devices.map((entry) => (
                        <Cell
                          key={entry.device_type}
                          fill={DEVICE_COLORS[entry.device_type] || DEVICE_COLORS.unknown}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => [value, 'Visites']}
                      contentStyle={{
                        backgroundColor: '#fff',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 mt-2">
                {devices.map((device) => {
                  const Icon = DEVICE_ICONS[device.device_type as keyof typeof DEVICE_ICONS] || Monitor;
                  return (
                    <div
                      key={device.device_type}
                      className="flex items-center justify-between text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{
                            backgroundColor:
                              DEVICE_COLORS[device.device_type] || DEVICE_COLORS.unknown,
                          }}
                        />
                        <Icon className="h-3 w-3 text-muted-foreground" />
                        <span className="text-foreground">
                          {DEVICE_LABELS[device.device_type as keyof typeof DEVICE_LABELS] ||
                            device.device_type}
                        </span>
                      </div>
                      <span className="text-muted-foreground">{device.percentage}%</span>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="h-[120px] flex items-center justify-center text-muted-foreground text-sm">
              Aucune donnée
            </div>
          )}
        </div>

        {/* Browsers */}
        <div>
          <p className="text-sm text-muted-foreground mb-3">Navigateurs</p>
          {hasBrowserData ? (
            <>
              <div className="h-[120px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={browsers as unknown as Record<string, unknown>[]}
                      dataKey="count"
                      nameKey="browser"
                      cx="50%"
                      cy="50%"
                      innerRadius={30}
                      outerRadius={50}
                      paddingAngle={2}
                    >
                      {browsers.map((entry, index) => (
                        <Cell
                          key={entry.browser}
                          fill={BROWSER_COLORS[index % BROWSER_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => [value, 'Visites']}
                      contentStyle={{
                        backgroundColor: '#fff',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 mt-2">
                {browsers.map((browser, index) => (
                  <div
                    key={browser.browser}
                    className="flex items-center justify-between text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{
                          backgroundColor: BROWSER_COLORS[index % BROWSER_COLORS.length],
                        }}
                      />
                      <span className="text-foreground">{browser.browser}</span>
                    </div>
                    <span className="text-muted-foreground">{browser.percentage}%</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-[120px] flex items-center justify-center text-muted-foreground text-sm">
              Aucune donnée
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
