'use client';

import { useState } from 'react';
import { Save, Loader2, Plus, Trash2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { updateSalonEmailTemplate } from '@/lib/actions/email-templates.actions';
import type { EmailTemplate, EmailTemplateContent } from '@/lib/services/email-templates.service';

interface EmailTemplateEditorProps {
  template: EmailTemplate;
}

const DEFAULT_CONTENT: EmailTemplateContent = {
  greeting: 'Bonjour {name},',
  paragraphs: [
    "C'était un réel plaisir de vous rencontrer lors du Salon du Mariage !",
    "J'espère que cette journée vous a inspiré pour votre futur événement. Comme promis, je reviens vers vous pour vous accompagner dans la création d'une décoration unique et à votre image.",
    "Je serais ravie d'échanger avec vous sur votre projet et de vous présenter mes différentes prestations lors d'un rendez-vous personnalisé.",
  ],
  ctaText: 'Prendre rendez-vous',
  instagramText: "N'hésitez pas à me suivre sur Instagram pour découvrir mes dernières réalisations !",
  signatureName: 'Aurélie',
  signatureTitle: "Fondatrice d'AureLuz Design",
};

export function EmailTemplateEditor({ template }: EmailTemplateEditorProps) {
  const [subject, setSubject] = useState(template.subject);
  const [content, setContent] = useState<EmailTemplateContent>(template.content);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const updateParagraph = (index: number, value: string) => {
    const newParagraphs = [...content.paragraphs];
    newParagraphs[index] = value;
    setContent({ ...content, paragraphs: newParagraphs });
  };

  const addParagraph = () => {
    setContent({ ...content, paragraphs: [...content.paragraphs, ''] });
  };

  const removeParagraph = (index: number) => {
    if (content.paragraphs.length > 1) {
      const newParagraphs = content.paragraphs.filter((_, i) => i !== index);
      setContent({ ...content, paragraphs: newParagraphs });
    }
  };

  const handleReset = () => {
    setSubject('Suite à notre rencontre au Salon du Mariage - AureLuz');
    setContent(DEFAULT_CONTENT);
    setMessage(null);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);

    try {
      const result = await updateSalonEmailTemplate(subject, content);

      if (result.success) {
        setMessage({ type: 'success', text: 'Template enregistré avec succès' });
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
    <div className="space-y-6">
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

      {/* Subject */}
      <div className="space-y-2">
        <Label htmlFor="subject" className="text-base font-medium">
          Objet de l&apos;email
        </Label>
        <Input
          id="subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Objet de l'email"
        />
      </div>

      {/* Greeting */}
      <div className="space-y-2">
        <Label htmlFor="greeting" className="text-base font-medium">
          Salutation
        </Label>
        <Input
          id="greeting"
          value={content.greeting}
          onChange={(e) => setContent({ ...content, greeting: e.target.value })}
          placeholder="Bonjour {name},"
        />
        <p className="text-sm text-muted-foreground">
          Utilisez <code className="bg-secondary px-1 rounded">{'{name}'}</code> pour insérer le nom du contact
        </p>
      </div>

      {/* Paragraphs */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-base font-medium">Corps du message</Label>
          <Button type="button" variant="outline" size="sm" onClick={addParagraph} className="gap-2">
            <Plus className="h-4 w-4" />
            Ajouter un paragraphe
          </Button>
        </div>
        {content.paragraphs.map((paragraph, index) => (
          <div key={index} className="flex gap-2">
            <Textarea
              value={paragraph}
              onChange={(e) => updateParagraph(index, e.target.value)}
              placeholder={`Paragraphe ${index + 1}`}
              rows={3}
              className="flex-1"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removeParagraph(index)}
              disabled={content.paragraphs.length === 1}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      {/* CTA Text */}
      <div className="space-y-2">
        <Label htmlFor="ctaText" className="text-base font-medium">
          Texte du bouton
        </Label>
        <Input
          id="ctaText"
          value={content.ctaText}
          onChange={(e) => setContent({ ...content, ctaText: e.target.value })}
          placeholder="Prendre rendez-vous"
        />
      </div>

      {/* Instagram Text */}
      <div className="space-y-2">
        <Label htmlFor="instagramText" className="text-base font-medium">
          Texte Instagram
        </Label>
        <Textarea
          id="instagramText"
          value={content.instagramText}
          onChange={(e) => setContent({ ...content, instagramText: e.target.value })}
          placeholder="N'hésitez pas à me suivre sur Instagram..."
          rows={2}
        />
      </div>

      {/* Signature */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="signatureName" className="text-base font-medium">
            Nom (signature)
          </Label>
          <Input
            id="signatureName"
            value={content.signatureName}
            onChange={(e) => setContent({ ...content, signatureName: e.target.value })}
            placeholder="Aurélie"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="signatureTitle" className="text-base font-medium">
            Titre (signature)
          </Label>
          <Input
            id="signatureTitle"
            value={content.signatureTitle}
            onChange={(e) => setContent({ ...content, signatureTitle: e.target.value })}
            placeholder="Fondatrice d'AureLuz Design"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t border-border">
        <Button type="button" variant="outline" onClick={handleReset} className="gap-2">
          <RotateCcw className="h-4 w-4" />
          Réinitialiser
        </Button>
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
