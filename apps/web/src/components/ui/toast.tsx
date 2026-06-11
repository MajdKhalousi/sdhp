'use client';

import * as RadixToast from '@radix-ui/react-toast';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToastStore } from '@/hooks/use-toast';

const VARIANT_CLASSES: Record<string, string> = {
  default: 'border-border bg-background text-foreground',
  success: 'border-green-200 bg-green-50 text-green-900 dark:border-green-800 dark:bg-green-950 dark:text-green-100',
  error:   'border-destructive/20 bg-destructive/5 text-destructive',
};

export function Toaster() {
  const { toasts, dismiss } = useToastStore();

  return (
    <RadixToast.Provider swipeDirection="right">
      {toasts.map((t) => (
        <RadixToast.Root
          key={t.id}
          open
          onOpenChange={(open) => { if (!open) dismiss(t.id); }}
          duration={t.duration ?? 4000}
          className={cn(
            'flex items-start gap-3 rounded-xl border p-4 shadow-lg',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-80 data-[state=open]:slide-in-from-bottom-2',
            VARIANT_CLASSES[t.variant ?? 'default'],
          )}
        >
          <div className="flex-1 min-w-0">
            <RadixToast.Title className="text-sm font-medium">{t.title}</RadixToast.Title>
            {t.description && (
              <RadixToast.Description className="mt-0.5 text-xs opacity-70">
                {t.description}
              </RadixToast.Description>
            )}
            {t.action && (
              <a
                href={t.action.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => dismiss(t.id)}
                className="mt-1.5 inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-medium transition-colors hover:bg-accent"
              >
                {t.action.label}
              </a>
            )}
          </div>
          <RadixToast.Close
            onClick={() => dismiss(t.id)}
            className="shrink-0 rounded-md p-0.5 opacity-50 transition-opacity hover:opacity-100"
            aria-label="Close"
          >
            <X className="h-3.5 w-3.5" />
          </RadixToast.Close>
        </RadixToast.Root>
      ))}
      <RadixToast.Viewport className="fixed bottom-4 end-4 z-50 flex max-h-screen w-[360px] flex-col-reverse gap-2 outline-none" />
    </RadixToast.Provider>
  );
}
