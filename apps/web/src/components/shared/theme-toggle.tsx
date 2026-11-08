'use client';

import React, { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/components/providers/theme-provider';
import { cn } from '@/lib/utils';

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export function ThemeToggle({ className, showLabel = false }: ThemeToggleProps) {
  const { resolvedTheme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        className={cn(
          'h-9 w-9 rounded-lg border border-brand-border/60 bg-slate-100/50 dark:bg-slate-800/50',
          className,
        )}
        aria-hidden="true"
      />
    );
  }

  const isDark = resolvedTheme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={cn(
        'relative inline-flex items-center justify-center h-9 px-2.5 rounded-lg border border-brand-border bg-white text-brand-navy hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-emerald dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800',
        showLabel && 'px-3 gap-2 w-full justify-start',
        className,
      )}
      aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
    >
      {isDark ? (
        <Sun className="h-4 w-4 text-amber-400 transition-transform hover:rotate-45" />
      ) : (
        <Moon className="h-4 w-4 text-slate-700 transition-transform hover:-rotate-12" />
      )}
      {showLabel && (
        <span className="text-xs font-medium">
          {isDark ? 'Light Mode' : 'Dark Mode'}
        </span>
      )}
    </button>
  );
}

