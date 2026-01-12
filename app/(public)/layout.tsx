import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { LogoProvider } from '@/components/providers/logo-provider';
import { getLogo } from '@/lib/actions/settings.actions';

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const logoUrl = await getLogo();

  return (
    <LogoProvider logoUrl={logoUrl}>
      <Header />
      <main className="min-h-screen pt-[73px]">{children}</main>
      <Footer />
    </LogoProvider>
  );
}
