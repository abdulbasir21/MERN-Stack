import React from 'react';

export type BadgeVariant =
  | 'new'
  | 'in_discussion'
  | 'quoted'
  | 'accepted'
  | 'rejected'
  | 'destructive'
  | 'pending'
  | 'approved'
  | 'blocked'
  | 'draft'
  | 'success'
  | 'warning'
  | 'neutral'
  | 'secondary'
  | 'default';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  children: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'default',
  children,
  className = '',
  ...props
}) => {
  const variantStyles: Record<BadgeVariant, string> = {
    new: 'bg-semantic-info-tint text-semantic-info border-semantic-info/20',
    in_discussion: 'bg-paper-sunken text-ink-secondary border-paper-border',
    quoted: 'bg-semantic-warning-tint text-semantic-warning border-semantic-warning/20',
    accepted: 'bg-semantic-success-tint text-semantic-success border-semantic-success/20',
    approved: 'bg-semantic-success-tint text-semantic-success border-semantic-success/20',
    rejected: 'bg-semantic-error-tint text-semantic-error border-semantic-error/20',
    destructive: 'bg-semantic-error-tint text-semantic-error border-semantic-error/20',
    pending: 'bg-semantic-warning-tint text-semantic-warning border-semantic-warning/20',
    blocked: 'bg-semantic-error-tint text-semantic-error border-semantic-error/20',
    draft: 'bg-paper-sunken text-ink-muted border-paper-border',
    success: 'bg-semantic-success-tint text-semantic-success border-semantic-success/20',
    warning: 'bg-semantic-warning-tint text-semantic-warning border-semantic-warning/20',
    neutral: 'bg-paper-sunken text-ink-secondary border-paper-border',
    secondary: 'bg-paper-sunken text-ink-secondary border-paper-border',
    default: 'bg-paper-sunken text-ink-primary border-paper-border',
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-badge text-xs font-medium border ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
};
