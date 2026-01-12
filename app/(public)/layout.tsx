import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { LogoProvider } from '@/components/providers/logo-provider';
import { ContactProvider } from '@/components/providers/contact-provider';
import { getLogo, getContactSettings } from '@/lib/actions/settings.actions';

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [logoUrl, contactSettings] = await Promise.all([
    getLogo(),
    getContactSettings(),
  ]);

  return (
    <LogoProvider logoUrl={logoUrl}>
      <ContactProvider contact={contactSettings}>
        <Header />
        <main className="min-h-screen pt-[73px]">{children}</main>
        <Footer />
      </ContactProvider>
    </LogoProvider>
  );
}
