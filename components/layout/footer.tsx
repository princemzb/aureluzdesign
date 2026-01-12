'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Instagram, Mail, Phone, Facebook, Linkedin } from 'lucide-react';
import { useLogo } from '@/components/providers/logo-provider';
import { useContact } from '@/components/providers/contact-provider';
import { usePreview } from '@/components/providers/preview-provider';

const legalLinks = [
  { name: 'Mentions légales', href: '/mentions-legales' },
  { name: 'Politique de confidentialité', href: '/confidentialite' },
];

export function Footer() {
  const currentYear = new Date().getFullYear();
  const logoUrl = useLogo();
  const contact = useContact();
  const isPreview = usePreview();

  // Build social links with defaults for empty values
  const socialLinks = [
    {
      name: 'Instagram',
      href: contact.instagram || 'https://www.instagram.com',
      icon: Instagram,
      external: true,
    },
    {
      name: 'Facebook',
      href: contact.facebook || 'https://www.facebook.com',
      icon: Facebook,
      external: true,
    },
    {
      name: 'LinkedIn',
      href: contact.linkedin || 'https://www.linkedin.com',
      icon: Linkedin,
      external: true,
    },
    {
      name: 'Email',
      href: `mailto:${contact.email}`,
      icon: Mail,
      external: false,
    },
    {
      name: 'Téléphone',
      href: `tel:${contact.phone}`,
      icon: Phone,
      external: false,
    },
  ];

  return (
    <footer className="bg-foreground text-background">
      <div className="container-main py-6">
        {/* Logo centré */}
        <div className="flex justify-center mb-3">
          <Image
            src={logoUrl}
            alt="Aureluz Design - Décoration événementielle sur mesure"
            width={400}
            height={160}
            className="h-32 w-auto brightness-0 invert"
          />
        </div>

        {/* Liens en ligne */}
        <div className="flex flex-col md:flex-row justify-center items-center gap-3 md:gap-6 mb-3">
          {socialLinks.map((link) =>
            isPreview ? (
              <span
                key={link.name}
                className="flex items-center gap-2 text-background/70 cursor-default"
              >
                <link.icon className="h-4 w-4" />
                <span className="text-sm">{link.name}</span>
              </span>
            ) : (
              <a
                key={link.name}
                href={link.href}
                target={link.external ? '_blank' : undefined}
                rel={link.external ? 'noopener noreferrer' : undefined}
                className="flex items-center gap-2 text-background/70 hover:text-background transition-colors"
              >
                <link.icon className="h-4 w-4" />
                <span className="text-sm">{link.name}</span>
              </a>
            )
          )}
        </div>

        {/* Liens légaux */}
        <div className="flex justify-center gap-4 mb-3">
          {legalLinks.map((link) =>
            isPreview ? (
              <span
                key={link.name}
                className="text-sm text-background/50 cursor-default"
              >
                {link.name}
              </span>
            ) : (
              <Link
                key={link.name}
                href={link.href}
                className="text-sm text-background/50 hover:text-background transition-colors"
              >
                {link.name}
              </Link>
            )
          )}
        </div>

        {/* Copyright */}
        <div className="pt-3 border-t border-background/10">
          <p className="text-center text-sm text-background/50">
            © {currentYear} Aureluz Design. Tous droits réservés.
          </p>
        </div>
      </div>
    </footer>
  );
}
