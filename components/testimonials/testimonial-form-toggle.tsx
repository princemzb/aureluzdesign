'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, MessageSquarePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TestimonialForm } from './testimonial-form';
import { cn } from '@/lib/utils/cn';

export function TestimonialFormToggle() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="max-w-2xl mx-auto">
      {/* Bouton pour ouvrir/fermer le formulaire */}
      <div className="text-center">
        <Button
          variant={isOpen ? 'outline' : 'default'}
          size="lg"
          onClick={() => setIsOpen(!isOpen)}
          className="gap-2"
        >
          <MessageSquarePlus className="w-5 h-5" />
          {isOpen ? 'Fermer' : 'Vous aussi, partagez votre expérience'}
          {isOpen ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </Button>
      </div>

      {/* Formulaire collapsible */}
      <div
        className={cn(
          'overflow-hidden transition-all duration-500 ease-in-out',
          isOpen ? 'max-h-[1000px] opacity-100 mt-8' : 'max-h-0 opacity-0 mt-0'
        )}
      >
        <div className="bg-background rounded-2xl p-8 shadow-sm border border-border">
          <h3 className="text-xl font-serif font-medium text-foreground text-center mb-2">
            Partagez votre expérience
          </h3>
          <p className="text-muted-foreground text-center mb-8">
            Vous avez collaboré avec AureLuz ? Racontez-nous votre histoire !
          </p>
          <TestimonialForm />
        </div>
      </div>
    </div>
  );
}
