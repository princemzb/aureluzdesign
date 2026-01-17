import { Settings } from 'lucide-react';
import { getBlockedSlots, getOpenSlots } from '@/lib/actions/admin.actions';
import { getContactSettings } from '@/lib/actions/settings.actions';
import { BlockedSlotsManager } from '@/components/admin/blocked-slots-manager';
import { OpenSlotsManager } from '@/components/admin/open-slots-manager';
import { ContactSettingsManager } from '@/components/admin/contact-settings-manager';

export default async function SettingsPage() {
  const [blockedSlots, openSlots, contactSettings] = await Promise.all([
    getBlockedSlots(),
    getOpenSlots(),
    getContactSettings(),
  ]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Settings className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-serif font-medium text-foreground">
            Paramètres
          </h1>
          <p className="text-muted-foreground mt-1">
            Gérez vos informations de contact et disponibilités.
          </p>
        </div>
      </div>

      {/* Contact settings */}
      <ContactSettingsManager initialSettings={contactSettings} />

      {/* Open slots manager (exceptional openings) */}
      <OpenSlotsManager openSlots={openSlots} />

      {/* Blocked slots manager */}
      <BlockedSlotsManager blockedSlots={blockedSlots} />
    </div>
  );
}
