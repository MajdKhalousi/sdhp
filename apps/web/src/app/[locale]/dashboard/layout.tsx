import { DashboardShell } from '@/components/layout/dashboard-shell';
import { AuthGuard } from '@/components/layout/auth-guard';
import { PlatformOnlyGuard } from '@/components/layout/platform-only-guard';
import { SubscriptionBanner } from '@/components/layout/subscription-banner';
import { Toaster } from '@/components/ui/toast';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <DashboardShell>
        <SubscriptionBanner />
        <PlatformOnlyGuard>{children}</PlatformOnlyGuard>
      </DashboardShell>
      <Toaster />
    </AuthGuard>
  );
}
