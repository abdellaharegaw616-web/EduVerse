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
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionHref,
  actionLabel,
}: EmptyStateProps) {
  return (
    <div className="rounded-xl border border-dashed border-brand-border bg-white p-10 text-center space-y-4">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-mint text-brand-emerald mx-auto">
        <Icon className="h-6 w-6" />
      </div>
      <div className="space-y-1 max-w-sm mx-auto">
        <h3 className="text-base font-bold text-brand-navy">{title}</h3>
        <p className="text-xs text-brand-slate leading-relaxed">{description}</p>
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
    </div>
  );
}

