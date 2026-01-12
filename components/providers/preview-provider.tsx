'use client';

import { createContext, useContext, ReactNode } from 'react';

interface PreviewContextType {
  isPreview: boolean;
}

const PreviewContext = createContext<PreviewContextType>({ isPreview: false });

interface PreviewProviderProps {
  children: ReactNode;
  isPreview?: boolean;
}

export function PreviewProvider({ children, isPreview = false }: PreviewProviderProps) {
  return (
    <PreviewContext.Provider value={{ isPreview }}>
      {children}
    </PreviewContext.Provider>
  );
}

export function usePreview(): boolean {
  const context = useContext(PreviewContext);
  return context.isPreview;
}
