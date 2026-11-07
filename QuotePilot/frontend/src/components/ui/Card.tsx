import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'surface' | 'sunken' | 'docket';
}

export const Card: React.FC<CardProps> = ({
  variant = 'surface',
  children,
  className = '',
  ...props
}) => {
  const variantStyles = {
    surface: 'bg-paper-surface border-paper-border shadow-paper',
    sunken: 'bg-paper-sunken border-paper-border',
    docket: 'bg-paper-surface border-paper-border shadow-paper border-t-4 border-t-brand-teal',
  }[variant];

  return (
    <div
      className={`border rounded-card p-6 ${variantStyles} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
