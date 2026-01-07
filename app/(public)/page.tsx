import { HeroSection } from '@/components/sections/hero';
import { ServicesSection } from '@/components/sections/services';
import { PortfolioSection } from '@/components/sections/portfolio';
import { AboutSection } from '@/components/sections/about';
import { Testimonials } from '@/components/sections/testimonials';
import { ContactCTASection } from '@/components/sections/contact-cta';
import { getPhotos } from '@/lib/actions/gallery.actions';

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'LocalBusiness',
  name: 'Aureluz Design',
  description: "Décoration événementielle sur mesure - L'art de sublimer vos instants précieux.",
  url: 'https://www.aureluzdesign.fr',
  telephone: '+33661434365',
  email: 'contact@aureluzdesign.fr',
  image: 'https://www.aureluzdesign.fr/images/aureluz-design-logo-decoration-evenementielle.png',
  priceRange: '€€€',
  serviceType: ['Décoration événementielle', 'Prestation signature', 'Coaching décoration'],
  areaServed: {
    '@type': 'Country',
    name: 'France',
  },
  sameAs: [
    'https://www.instagram.com/aure_luz_design/',
  ],
};

export default async function HomePage() {
  const photos = await getPhotos();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <HeroSection />
      <ServicesSection />
      <PortfolioSection photos={photos} />
      <AboutSection />
      <Testimonials />
      <ContactCTASection />
    </>
  );
}
