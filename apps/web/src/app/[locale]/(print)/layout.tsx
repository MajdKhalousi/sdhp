import { AuthGuard } from '@/components/layout/auth-guard';

export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return <AuthGuard>{children}</AuthGuard>;
}
