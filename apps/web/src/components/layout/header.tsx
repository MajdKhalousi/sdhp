'use client';

import { useLocale, useTranslations } from 'next-intl';
import { LogOut, Menu } from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { useRouter, usePathname } from '@/i18n/navigation';
import { formatDateDisplay } from '@/lib/format-date';

interface HeaderProps {
  onMenuClick?: () => void;
}

function todayLabel(): string {
  return formatDateDisplay(new Date());
}

function formatRole(role: string): string {
  return role
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function Header({ onMenuClick }: HeaderProps = {}) {
  const locale = useLocale();
  const t = useTranslations('nav');
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  function handleLogout() {
    logout();
    router.replace('/login');
  }

  function toggleLocale() {
    const next = locale === 'ar' ? 'en' : 'ar';
    router.replace(pathname, { locale: next });
  }

  const initials = user
    ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    : '?';
  const displayName = user ? `${user.firstName} ${user.lastName}` : 'User';
  const displayRole = user ? formatRole(user.role) : '';

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b bg-card px-6">
      <div className="flex items-center gap-2">
        {/* Hamburger — visible only below lg */}
        {onMenuClick && (
          <button
            onClick={onMenuClick}
            className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground lg:hidden"
            aria-label={t('openMenu')}
          >
            <Menu className="h-5 w-5" />
          </button>
        )}
        <p className="text-sm font-medium text-muted-foreground">{todayLabel()}</p>
      </div>

      <div className="flex items-center gap-2">
        {/* Language toggle */}
        <button
          onClick={toggleLocale}
          className="rounded-md border px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          aria-label="Switch language"
        >
          {locale === 'ar' ? 'EN' : 'عربي'}
        </button>

        <div className="flex items-center gap-2 rounded-md px-2 py-1">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
            {initials}
          </div>
          <div className="leading-tight">
            <p className="text-sm font-medium">{displayName}</p>
            <p className="text-xs text-muted-foreground">{displayRole}</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          aria-label="Sign out"
          className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
