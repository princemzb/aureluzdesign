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
    default: 'Aureluz Design | Décoration Événementielle sur Mesure',
    template: '%s | Aureluz Design',
  },
  description:
    "Aureluz Design - L'art de sublimer vos instants précieux. Décoration événementielle haut de gamme : prestations signature, instants précieux et coaching personnalisé.",
  keywords: [
    'Aureluz',
    'Aureluz Design',
    'aureluzdesign',
    'aureluz design',
    'aure luz design',
    'décoration événementielle',
    'décoration sur mesure',
    'prestation signature',
    'instants précieux',
    'coaching décoration',
    'événements haut de gamme',
  ],
  authors: [{ name: 'Aureluz Design' }],
  creator: 'Aureluz Design',
  metadataBase: new URL('https://www.aureluzdesign.fr'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    url: 'https://www.aureluzdesign.fr',
    siteName: 'Aureluz Design',
    title: 'Aureluz Design | Décoration Événementielle sur Mesure',
    description: "Aureluz Design - L'art de sublimer vos instants précieux. Décoration événementielle haut de gamme.",
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Aureluz Design | Décoration Événementielle',
    description: "L'art de sublimer vos instants précieux.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
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
