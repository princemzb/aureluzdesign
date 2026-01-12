import { redirect } from 'next/navigation';
import { AdminSidebar } from '@/components/admin/admin-sidebar';
import { LogoProvider } from '@/components/providers/logo-provider';
import { getSession } from '@/lib/actions/auth.actions';
import { getLogo } from '@/lib/actions/settings.actions';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // DEV MODE: Skip auth check
  if (process.env.DEV_SKIP_AUTH !== 'true') {
    const user = await getSession();
    if (!user) {
      redirect('/login');
    }
  }

  const logoUrl = await getLogo();

  return (
    <LogoProvider logoUrl={logoUrl}>
      <div className="min-h-screen bg-secondary/30">
        <AdminSidebar />
        <main className="lg:pl-64">
          <div className="p-6 lg:p-8">{children}</div>
        </main>
      </div>
    </LogoProvider>
  );
}
