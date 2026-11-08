import React from 'react';
import Link from 'next/link';
import { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionHref,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="rounded-xl border border-dashed border-brand-border dark:border-slate-800 bg-white dark:bg-slate-900/60 p-10 text-center space-y-4">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-mint dark:bg-emerald-950/60 text-brand-emerald dark:text-emerald-400 mx-auto">
        <Icon className="h-6 w-6" />
      </div>
      <div className="space-y-1 max-w-sm mx-auto">
        <h3 className="text-base font-bold text-brand-navy dark:text-slate-100">{title}</h3>
        <p className="text-xs text-brand-slate dark:text-slate-400 leading-relaxed">{description}</p>
      </div>
      {actionHref && actionLabel && (
        <div className="pt-2">
          <Link href={actionHref}>
            <Button variant="emerald" size="sm">
              {actionLabel}
            </Button>
          </Link>
        </div>
      )}
      {!actionHref && onAction && actionLabel && (
        <div className="pt-2">
          <Button variant="emerald" size="sm" onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
}
