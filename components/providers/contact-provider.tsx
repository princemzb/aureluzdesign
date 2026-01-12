'use client';

import { createContext, useContext, ReactNode } from 'react';
import type { ContactSettings } from '@/lib/services/settings.service';

const DEFAULT_CONTACT: ContactSettings = {
  phone: '+33661434365',
  email: 'contact@aureluzdesign.fr',
  adminEmail: 'aureluzdesign@gmail.com',
  instagram: 'https://www.instagram.com/aure_luz_design/',
  facebook: '',
  linkedin: '',
};

const ContactContext = createContext<ContactSettings | null>(null);

interface ContactProviderProps {
  children: ReactNode;
  contact: ContactSettings;
}

export function ContactProvider({ children, contact }: ContactProviderProps) {
  return (
    <ContactContext.Provider value={contact}>
      {children}
    </ContactContext.Provider>
  );
}

export function useContact(): ContactSettings {
  const context = useContext(ContactContext);
  if (!context) {
    return DEFAULT_CONTACT;
  }
  return context;
}
