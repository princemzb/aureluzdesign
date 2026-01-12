import { getBlockedSlots } from '@/lib/actions/admin.actions';
import { BlockedSlotsManager } from '@/components/admin/blocked-slots-manager';

export default async function SettingsPage() {
  const blockedSlots = await getBlockedSlots();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-serif font-medium text-foreground">
          Paramètres
        </h1>
        <p className="text-muted-foreground mt-1">
          Gérez vos disponibilités et paramètres.
        </p>
      </div>

      {/* Blocked slots manager */}
      <BlockedSlotsManager blockedSlots={blockedSlots} />
    </div>
  );
}
