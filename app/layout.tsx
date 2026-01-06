import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Inter, Playfair_Display } from 'next/font/google';
import { AnalyticsTracker } from '@/components/analytics/tracker';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const playfair = Playfair_Display({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-playfair',
});

export const metadata: Metadata = {
  title: {
    default: 'AureLuz | Décoration Événementielle',
    template: '%s | AureLuz',
  },
  description:
    "L'art de sublimer vos instants précieux. Décoration événementielle haut de gamme pour mariages, événements d'exception et art de la table.",
  keywords: [
    'décoration événementielle',
    'mariage',
    'art de la table',
    'événements',
    'luxe',
    'AureLuz',
  ],
  authors: [{ name: 'AureLuz' }],
  creator: 'AureLuz',
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    url: 'https://aureluz.fr',
    siteName: 'AureLuz',
    title: 'AureLuz | Décoration Événementielle',
    description: "L'art de sublimer vos instants précieux.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${inter.variable} ${playfair.variable}`}>
      <body className="min-h-screen font-sans antialiased">
        <Suspense fallback={null}>
          <AnalyticsTracker />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
