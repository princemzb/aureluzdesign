'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { Button } from '@/components/ui/button';

const navigation = [
  { name: 'Accueil', href: '/' },
  { name: 'Services', href: '/#services' },
  { name: 'Portfolio', href: '/#portfolio' },
  { name: 'Témoignages', href: '/#temoignages' },
  { name: 'À propos', href: '/#about' },
];

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
      <nav className="container-main flex items-center justify-between py-2">
        {/* Logo */}
        <Link href="/" className="flex items-center">
          <Image
            src="/images/aureluz-design-logo-decoration-evenementielle.png"
            alt="Aureluz Design - Décoration événementielle sur mesure"
            width={300}
            height={120}
            className="h-24 w-auto"
            priority
          />
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-8">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {item.name}
            </Link>
          ))}
        </div>

        {/* CTA Button */}
        <div className="hidden md:block">
          <Button asChild size="lg">
            <Link href="/booking">Réserver</Link>
          </Button>
        </div>

        {/* Mobile menu button */}
        <button
          type="button"
          className="md:hidden p-2 text-foreground"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          <span className="sr-only">Ouvrir le menu</span>
          {mobileMenuOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Menu className="h-6 w-6" />
          )}
        </button>
      </nav>

      {/* Mobile Navigation */}
      <div
        className={cn(
          'md:hidden overflow-hidden transition-all duration-300 ease-in-out',
          mobileMenuOpen ? 'max-h-96' : 'max-h-0'
        )}
      >
        <div className="container-main py-4 space-y-4 border-t border-border/50">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="block text-base font-medium text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              {item.name}
            </Link>
          ))}
          <Button asChild className="w-full" size="lg">
            <Link href="/booking" onClick={() => setMobileMenuOpen(false)}>
              Réserver une consultation
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
