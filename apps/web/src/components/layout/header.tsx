'use client';

import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { useAuthStore } from '@/store/auth';

function formatRole(role: string): string {
  return role
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function todayLabel(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

export function Header() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  function handleLogout() {
    logout();
    router.replace('/login');
  }

  const initials = user
    ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    : '?';
  const displayName = user ? `${user.firstName} ${user.lastName}` : 'User';
  const displayRole = user ? formatRole(user.role) : '';

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b bg-card px-6">
      <p className="text-sm font-medium text-muted-foreground">{todayLabel()}</p>

      <div className="flex items-center gap-2">
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
