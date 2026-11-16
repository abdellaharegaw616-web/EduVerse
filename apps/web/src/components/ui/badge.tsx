import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'bg-brand-coffee text-white dark:bg-stone-800 dark:text-stone-100',
        secondary: 'bg-orange-50 text-brand-orange border border-brand-orange/20 dark:bg-orange-950/60 dark:text-orange-400 dark:border-orange-800/40',
        emerald: 'bg-orange-100 text-orange-900 border border-orange-200 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-800/40',
        orange: 'bg-orange-100 text-orange-900 border border-orange-200 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-800/40',
        coffee: 'bg-stone-900 text-stone-100 border border-stone-700 dark:bg-stone-800 dark:text-stone-100',
        amber: 'bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/40',
        destructive: 'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300 dark:border dark:border-red-800/40',
        outline: 'border border-brand-border text-brand-slate dark:border-stone-800 dark:text-stone-300',
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
