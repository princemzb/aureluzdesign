'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { Upload, ImageIcon, Loader2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { updateLogo, setLogoUrl } from '@/lib/actions/settings.actions';

interface LogoManagerProps {
  currentLogo: string;
}

export function LogoManager({ currentLogo }: LogoManagerProps) {
  const [logo, setLogo] = useState(currentLogo);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);
    setError(null);
    setSuccess(false);
  };

  const handleUpload = async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);
    setSuccess(false);

    const formData = new FormData();
    formData.append('logo', file);

    const result = await updateLogo(formData);

    setIsUploading(false);

    if (result.success && result.url) {
      setLogo(result.url);
      setPreviewUrl(null);
      setSuccess(true);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setTimeout(() => setSuccess(false), 3000);
    } else {
      setError(result.error || 'Erreur lors de l\'upload');
    }
  };

  const handleCancel = () => {
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleReset = async () => {
    setIsUploading(true);
    setError(null);

    const defaultLogo = '/images/aureluz-design-logo-decoration-evenementielle.png';
    const result = await setLogoUrl(defaultLogo);

    setIsUploading(false);

    if (result.success) {
      setLogo(defaultLogo);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } else {
      setError(result.error || 'Erreur lors de la réinitialisation');
    }
  };

  return (
    <div className="bg-background rounded-xl border border-border">
      <div className="p-6 border-b border-border flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <ImageIcon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="font-medium text-foreground">Logo du site</h2>
          <p className="text-sm text-muted-foreground">
            Ce logo apparaît sur tout le site et dans les emails.
          </p>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Current logo preview */}
        <div className="flex flex-col sm:flex-row gap-6 items-start">
          <div className="space-y-2">
            <Label className="text-muted-foreground text-sm">Logo actuel</Label>
            <div className="bg-secondary/30 rounded-lg p-4 flex items-center justify-center min-h-[100px]">
              <Image
                src={logo}
                alt="Logo actuel"
                width={200}
                height={80}
                className="max-h-20 w-auto object-contain"
              />
            </div>
          </div>

          {previewUrl && (
            <div className="space-y-2">
              <Label className="text-muted-foreground text-sm">Nouveau logo (aperçu)</Label>
              <div className="bg-primary/5 border-2 border-dashed border-primary/30 rounded-lg p-4 flex items-center justify-center min-h-[100px]">
                <Image
                  src={previewUrl}
                  alt="Aperçu"
                  width={200}
                  height={80}
                  className="max-h-20 w-auto object-contain"
                />
              </div>
            </div>
          )}
        </div>

        {/* Upload section */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="logo-upload">Changer le logo</Label>
            <Input
              ref={fileInputRef}
              id="logo-upload"
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              onChange={handleFileSelect}
              className="cursor-pointer"
            />
            <p className="text-xs text-muted-foreground">
              Formats acceptés : PNG, JPG, WebP, SVG. Taille max : 2MB.
            </p>
          </div>

          {/* Error message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
              <X className="h-4 w-4" />
              {error}
            </div>
          )}

          {/* Success message */}
          {success && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm flex items-center gap-2">
              <Check className="h-4 w-4" />
              Logo mis à jour avec succès !
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2">
            {previewUrl ? (
              <>
                <Button onClick={handleUpload} disabled={isUploading}>
                  {isUploading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  Enregistrer le nouveau logo
                </Button>
                <Button variant="outline" onClick={handleCancel} disabled={isUploading}>
                  Annuler
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                onClick={handleReset}
                disabled={isUploading || logo === '/images/aureluz-design-logo-decoration-evenementielle.png'}
              >
                {isUploading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : null}
                Restaurer le logo par défaut
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
