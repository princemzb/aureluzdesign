'use client';

import { useState, useRef } from 'react';
import { Upload, X, Loader2, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils/cn';
import { uploadPhoto } from '@/lib/actions/gallery.actions';
import { PHOTO_CATEGORIES, BUSINESS_CONFIG } from '@/lib/utils/constants';
import type { PhotoCategory } from '@/lib/types';

interface PhotoUploadProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function PhotoUpload({ onSuccess, onCancel }: PhotoUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [category, setCategory] = useState<PhotoCategory | ''>('');
  const [alt, setAlt] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (selectedFile: File | null) => {
    setError(null);

    if (!selectedFile) {
      setFile(null);
      setPreview(null);
      return;
    }

    // Validate type
    if (!(BUSINESS_CONFIG.ACCEPTED_IMAGE_TYPES as readonly string[]).includes(selectedFile.type)) {
      setError('Format non supporté. Utilisez JPG, PNG ou WebP.');
      return;
    }

    // Validate size
    if (selectedFile.size > BUSINESS_CONFIG.MAX_UPLOAD_SIZE) {
      const fileSizeMB = (selectedFile.size / (1024 * 1024)).toFixed(2);
      const maxSizeMB = (BUSINESS_CONFIG.MAX_UPLOAD_SIZE / (1024 * 1024)).toFixed(0);
      setError(`Image trop volumineuse (${fileSizeMB} MB). Limite autorisée : ${maxSizeMB} MB. Veuillez compresser l'image avant de réessayer.`);
      return;
    }

    setFile(selectedFile);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(selectedFile);

    // Auto-fill alt text with filename
    if (!alt) {
      const nameWithoutExt = selectedFile.name.replace(/\.[^/.]+$/, '');
      setAlt(nameWithoutExt.replace(/[-_]/g, ' '));
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!file || !category || !alt) {
      setError('Veuillez remplir tous les champs.');
      return;
    }

    setIsUploading(true);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', category);
    formData.append('alt', alt);

    const result = await uploadPhoto(formData);

    setIsUploading(false);

    if (!result.success) {
      setError(result.error || 'Erreur lors de l\'upload');
      return;
    }

    // Reset form
    setFile(null);
    setPreview(null);
    setCategory('');
    setAlt('');

    onSuccess?.();
  };

  const clearFile = () => {
    setFile(null);
    setPreview(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Drop zone */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={cn(
          'relative border-2 border-dashed rounded-xl p-8 text-center transition-colors',
          dragActive
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-primary/50',
          preview && 'border-solid'
        )}
      >
        {preview ? (
          <div className="relative">
            <img
              src={preview}
              alt="Preview"
              className="max-h-64 mx-auto rounded-lg"
            />
            <button
              type="button"
              onClick={clearFile}
              className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full hover:bg-black/70"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="w-16 h-16 mx-auto bg-secondary rounded-full flex items-center justify-center">
              <ImageIcon className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <p className="text-foreground font-medium">
                Glissez une image ici
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                ou cliquez pour sélectionner
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                JPG, PNG ou WebP • Max 5 MB
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => inputRef.current?.click()}
            >
              <Upload className="h-4 w-4 mr-2" />
              Choisir un fichier
            </Button>
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </div>

      {/* Form fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="category">Catégorie</Label>
          <Select
            value={category}
            onValueChange={(value) => setCategory(value as PhotoCategory)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner..." />
            </SelectTrigger>
            <SelectContent>
              {PHOTO_CATEGORIES.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="alt">Description (alt)</Label>
          <Input
            id="alt"
            value={alt}
            onChange={(e) => setAlt(e.target.value)}
            placeholder="Description de l'image"
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <p className="text-sm text-destructive text-center">{error}</p>
      )}

      {/* Actions */}
      <div className="flex gap-3 justify-end">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Annuler
          </Button>
        )}
        <Button type="submit" disabled={isUploading || !file}>
          {isUploading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Upload en cours...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Ajouter la photo
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
