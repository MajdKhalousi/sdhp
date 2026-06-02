'use client';

import { useState } from 'react';
import { Sidebar } from './sidebar';
import { Header } from './header';

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const close = () => setIsSidebarOpen(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Backdrop — mobile only, z-40 so it sits behind the z-50 drawer */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={close}
          aria-hidden="true"
        />
      )}

      {/* Desktop sidebar — always visible at lg+ */}
      <div className="hidden lg:flex">
        <Sidebar />
      </div>

      {/* Mobile drawer — conditionally mounted so pathname effect fires on open */}
      {isSidebarOpen && (
        <Sidebar isMobileDrawer onClose={close} />
      )}

      <div className="flex flex-1 flex-col overflow-hidden">
        <Header onMenuClick={() => setIsSidebarOpen(true)} />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
