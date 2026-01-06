import { HeroSection } from '@/components/sections/hero';
import { ServicesSection } from '@/components/sections/services';
import { PortfolioSection } from '@/components/sections/portfolio';
import { AboutSection } from '@/components/sections/about';
import { Testimonials } from '@/components/sections/testimonials';
import { ContactCTASection } from '@/components/sections/contact-cta';
import { getPhotos } from '@/lib/actions/gallery.actions';

export default async function HomePage() {
  const photos = await getPhotos();

  return (
    <>
      <HeroSection />
      <ServicesSection />
      <PortfolioSection photos={photos} />
      <AboutSection />
      <Testimonials />
      <ContactCTASection />
    </>
  );
}
