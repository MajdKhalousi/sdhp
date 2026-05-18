import { Bell, Search } from 'lucide-react';

export function Header() {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b bg-card px-6">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search patients, appointments..."
          className="h-9 w-80 rounded-md border bg-background pl-9 pr-4 text-sm outline-none transition-colors focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-2">
        <button className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground">
          <Bell className="h-4 w-4" />
        </button>

        {/* User avatar */}
        <div className="flex items-center gap-2 rounded-md px-2 py-1 transition-colors hover:bg-accent">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
            A
          </div>
          <div className="leading-tight">
            <p className="text-sm font-medium">Admin</p>
            <p className="text-xs text-muted-foreground">Super Admin</p>
          </div>
        </div>
      </div>
    </header>
  );
}
