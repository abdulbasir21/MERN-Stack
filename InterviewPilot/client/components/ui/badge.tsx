import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-[11px] font-semibold uppercase tracking-wider',
  {
    variants: {
      variant: {
        default: 'bg-surface-raised border border-border-strong text-text-secondary',
        live: 'bg-surface-raised border border-secondary/40 text-secondary',
        speaking: 'bg-surface-raised border border-primary/40 text-primary',
        thinking: 'bg-surface-raised border border-tertiary/40 text-tertiary',
        success: 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-400',
        danger: 'bg-rose-950/60 border border-rose-500/40 text-rose-400',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
