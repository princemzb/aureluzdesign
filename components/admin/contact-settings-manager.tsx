'use client';

import { useState } from 'react';
import { Save, Loader2, Phone, Mail, Instagram, Facebook, Linkedin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { updateContactSettings } from '@/lib/actions/settings.actions';
import type { ContactSettings } from '@/lib/services/settings.service';

interface ContactSettingsManagerProps {
  initialSettings: ContactSettings;
}

export function ContactSettingsManager({ initialSettings }: ContactSettingsManagerProps) {
  const [settings, setSettings] = useState<ContactSettings>(initialSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);

    try {
      const result = await updateContactSettings(settings);

      if (result.success) {
        setMessage({ type: 'success', text: 'Paramètres enregistrés avec succès' });
      } else {
        setMessage({ type: 'error', text: result.error || 'Erreur lors de la sauvegarde' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Erreur lors de la sauvegarde' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-background rounded-xl border border-border p-6 space-y-6">
      <div>
        <h2 className="text-lg font-medium text-foreground">Informations de contact</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Ces informations sont affichées sur le site et utilisées dans les emails.
        </p>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Contact info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="phone" className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-muted-foreground" />
            Téléphone
          </Label>
          <Input
            id="phone"
            value={settings.phone}
            onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
            placeholder="+33612345678"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email" className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            Email de contact
          </Label>
          <Input
            id="email"
            type="email"
            value={settings.email}
            onChange={(e) => setSettings({ ...settings, email: e.target.value })}
            placeholder="contact@exemple.fr"
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="adminEmail" className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            Email admin (notifications)
          </Label>
          <Input
            id="adminEmail"
            type="email"
            value={settings.adminEmail}
            onChange={(e) => setSettings({ ...settings, adminEmail: e.target.value })}
            placeholder="admin@exemple.fr"
          />
          <p className="text-xs text-muted-foreground">
            Adresse où seront envoyées les notifications de rendez-vous et demandes.
          </p>
        </div>
      </div>

      {/* Social links */}
      <div className="pt-4 border-t border-border">
        <h3 className="text-base font-medium text-foreground mb-4">Réseaux sociaux</h3>
        <div className="grid grid-cols-1 gap-4">
          <div className="space-y-2">
            <Label htmlFor="instagram" className="flex items-center gap-2">
              <Instagram className="h-4 w-4 text-muted-foreground" />
              Instagram
            </Label>
            <Input
              id="instagram"
              value={settings.instagram}
              onChange={(e) => setSettings({ ...settings, instagram: e.target.value })}
              placeholder="https://www.instagram.com/votre_compte/"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="facebook" className="flex items-center gap-2">
              <Facebook className="h-4 w-4 text-muted-foreground" />
              Facebook
            </Label>
            <Input
              id="facebook"
              value={settings.facebook}
              onChange={(e) => setSettings({ ...settings, facebook: e.target.value })}
              placeholder="https://www.facebook.com/votre_page/"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="linkedin" className="flex items-center gap-2">
              <Linkedin className="h-4 w-4 text-muted-foreground" />
              LinkedIn
            </Label>
            <Input
              id="linkedin"
              value={settings.linkedin}
              onChange={(e) => setSettings({ ...settings, linkedin: e.target.value })}
              placeholder="https://www.linkedin.com/in/votre_profil/"
            />
          </div>
        </div>
      </div>

      {/* Save button */}
      <div className="flex justify-end pt-4 border-t border-border">
        <Button onClick={handleSave} disabled={isSaving} className="gap-2">
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Enregistrement...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Enregistrer
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
