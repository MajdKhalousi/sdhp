import { redirect } from '@/i18n/navigation';

export default function RootPage({ params: { locale } }: { params: { locale: string } }) {
  redirect({ href: '/dashboard', locale });
}
