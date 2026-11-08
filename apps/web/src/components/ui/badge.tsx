import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'bg-brand-navy text-white dark:bg-slate-800 dark:text-slate-100',
        secondary: 'bg-brand-mint text-brand-emerald border border-brand-emerald/20 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800/40',
        emerald: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border dark:border-emerald-800/40',
        amber: 'bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/40',
        destructive: 'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300 dark:border dark:border-red-800/40',
        outline: 'border border-brand-border text-brand-slate dark:border-slate-800 dark:text-slate-300',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
