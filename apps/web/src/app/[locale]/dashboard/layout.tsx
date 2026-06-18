import { DashboardShell } from '@/components/layout/dashboard-shell';
import { AuthGuard } from '@/components/layout/auth-guard';
import { PlatformOnlyGuard } from '@/components/layout/platform-only-guard';
import { Toaster } from '@/components/ui/toast';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <DashboardShell>
        <PlatformOnlyGuard>{children}</PlatformOnlyGuard>
      </DashboardShell>
      <Toaster />
    </AuthGuard>
  );
}
