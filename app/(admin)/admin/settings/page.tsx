import { getBlockedSlots } from '@/lib/actions/admin.actions';
import { getLogo } from '@/lib/actions/settings.actions';
import { BlockedSlotsManager } from '@/components/admin/blocked-slots-manager';
import { LogoManager } from '@/components/admin/logo-manager';

export default async function SettingsPage() {
  const blockedSlots = await getBlockedSlots();
  const currentLogo = await getLogo();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-serif font-medium text-foreground">
          Paramètres
        </h1>
        <p className="text-muted-foreground mt-1">
          Gérez votre logo, vos disponibilités et paramètres.
        </p>
      </div>

      {/* Logo manager */}
      <LogoManager currentLogo={currentLogo} />

      {/* Blocked slots manager */}
      <BlockedSlotsManager blockedSlots={blockedSlots} />
    </div>
  );
}
