import { Eye } from 'lucide-react';
import { HeroSection } from '@/components/sections/hero';
import { ServicesSection } from '@/components/sections/services';
import { PortfolioSection } from '@/components/sections/portfolio';
import { AboutSection } from '@/components/sections/about';
import { Testimonials } from '@/components/sections/testimonials';
import { ContactCTASection } from '@/components/sections/contact-cta';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { getPhotos } from '@/lib/actions/gallery.actions';
import { getLogo, getContactSettings } from '@/lib/actions/settings.actions';
import { LogoProvider } from '@/components/providers/logo-provider';
import { ContactProvider } from '@/components/providers/contact-provider';
import { PreviewProvider } from '@/components/providers/preview-provider';
import { PreviewWrapper } from '@/components/admin/preview-wrapper';

export default async function PreviewPage() {
  const [photos, logoUrl, contactSettings] = await Promise.all([
    getPhotos(),
    getLogo(),
    getContactSettings(),
  ]);

  return (
    <div className="space-y-6">
      {/* Sticky header section */}
      <div className="sticky top-0 z-10 bg-background pb-4 space-y-4 -mx-6 px-6 pt-2 border-b border-border">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Eye className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-serif font-medium text-foreground">
              Aperçu du site client
            </h1>
            <p className="text-muted-foreground mt-1">
              Visualisez les modifications en temps réel
            </p>
          </div>
        </div>

        {/* Info banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>Mode aperçu :</strong> Les liens de navigation et boutons de validation sont désactivés.
            Utilisez les icônes ci-dessous pour tester le rendu responsive.
          </p>
        </div>
      </div>

      {/* Preview with device controls */}
      <PreviewWrapper>
        <LogoProvider logoUrl={logoUrl}>
          <ContactProvider contact={contactSettings}>
            <PreviewProvider isPreview={true}>
              <Header />
              <main>
                <HeroSection />
                <ServicesSection />
                <PortfolioSection photos={photos} />
                <AboutSection />
                <Testimonials />
                <ContactCTASection />
              </main>
              <Footer />
            </PreviewProvider>
          </ContactProvider>
        </LogoProvider>
      </PreviewWrapper>
    </div>
  );
}
