import { redirect } from 'next/navigation';
import { AdminSidebar } from '@/components/admin/admin-sidebar';
import { getSession } from '@/lib/actions/auth.actions';

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

  return (
    <div className="min-h-screen bg-secondary/30">
      <AdminSidebar />
      <main className="lg:pl-64">
        <div className="p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
