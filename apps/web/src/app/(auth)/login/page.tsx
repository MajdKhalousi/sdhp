'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore, type AuthUser } from '@/store/auth';

interface LoginResponse {
  accessToken: string;
  user: AuthUser;
}

const DEMO_ACCOUNTS = [
  { role: 'Org Admin',  phone: '+963912345678', name: 'Ahmad Khalil'    },
  { role: 'Secretary',  phone: '+963912002001', name: 'Sara Qassem'     },
  { role: 'Doctor',     phone: '+963912001001', name: 'Dr. Samer Hassan' },
  { role: 'Super Admin',phone: '+963900000001', name: 'Super Admin'     },
] as const;

const DEMO_PASSWORD = 'password123';

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showDemo, setShowDemo] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await api.post<LoginResponse>('/v1/auth/login', { phone, password });
      login(res.accessToken, res.user);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  function fillDemo(demoPhone: string) {
    setPhone(demoPhone);
    setPassword(DEMO_PASSWORD);
    setError(null);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <div className="w-full max-w-md space-y-5">
        <div className="rounded-xl border bg-card p-8 shadow-sm space-y-6">
          <div className="text-center space-y-1">
            <h1 className="text-2xl font-bold tracking-tight">SDHP</h1>
            <p className="text-sm text-muted-foreground">
              Syrian Digital Health Platform
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="phone">
                Phone Number
              </label>
              <input
                id="phone"
                type="tel"
                placeholder="+963 XXX XXX XXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                disabled={loading}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition-colors focus:ring-2 focus:ring-ring disabled:opacity-50"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition-colors focus:ring-2 focus:ring-ring disabled:opacity-50"
              />
            </div>

            {error && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-xs text-muted-foreground">
            Authorized personnel only
          </p>
        </div>

        {/* Demo accounts panel */}
        <div className="rounded-xl border bg-card shadow-sm">
          <button
            type="button"
            onClick={() => setShowDemo((v) => !v)}
            className="flex w-full items-center justify-between px-5 py-3 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <span>Demo accounts</span>
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform ${showDemo ? 'rotate-180' : ''}`}
            />
          </button>

          {showDemo && (
            <div className="border-t px-5 pb-4">
              <p className="py-2 text-xs text-muted-foreground">
                Password for all accounts: <span className="font-mono font-medium text-foreground">password123</span>
              </p>
              <div className="space-y-1">
                {DEMO_ACCOUNTS.map((acct) => (
                  <button
                    key={acct.phone}
                    type="button"
                    onClick={() => fillDemo(acct.phone)}
                    className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-xs transition-colors hover:bg-accent"
                  >
                    <div>
                      <span className="font-medium text-foreground">{acct.name}</span>
                      <span className="ml-2 text-muted-foreground">{acct.role}</span>
                    </div>
                    <span className="font-mono text-muted-foreground">{acct.phone}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
