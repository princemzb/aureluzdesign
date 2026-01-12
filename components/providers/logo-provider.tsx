'use client';

import { createContext, useContext, ReactNode } from 'react';

interface LogoContextType {
  logoUrl: string;
}

const LogoContext = createContext<LogoContextType | null>(null);

interface LogoProviderProps {
  children: ReactNode;
  logoUrl: string;
}

export function LogoProvider({ children, logoUrl }: LogoProviderProps) {
  return (
    <LogoContext.Provider value={{ logoUrl }}>
      {children}
    </LogoContext.Provider>
  );
}

export function useLogo(): string {
  const context = useContext(LogoContext);
  if (!context) {
    // Fallback to default logo if context is not available
    return '/images/aureluz-design-logo-decoration-evenementielle.png';
  }
  return context.logoUrl;
}
