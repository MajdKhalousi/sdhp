import { DashboardShell } from '@/components/layout/dashboard-shell';
import { AuthGuard } from '@/components/layout/auth-guard';
import { Toaster } from '@/components/ui/toast';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <DashboardShell>{children}</DashboardShell>
      <Toaster />
    </AuthGuard>
  );
}
