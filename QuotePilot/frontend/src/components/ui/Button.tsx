import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'accent' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      disabled,
      className = '',
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none';

    const sizeStyles = {
      sm: 'h-8 px-3 text-xs rounded-control',
      md: 'h-10 px-4 text-sm rounded-control',
      lg: 'h-12 px-6 text-base rounded-control',
    }[size];

    const variantStyles = {
      primary:
        'bg-brand-teal text-white hover:bg-brand-teal-hover focus-visible:ring-brand-teal border border-transparent shadow-sm',
      secondary:
        'bg-paper-surface text-ink-primary hover:bg-paper-sunken border border-paper-border focus-visible:ring-brand-teal shadow-paper',
      ghost:
        'bg-transparent text-brand-teal hover:bg-brand-teal-tint border border-transparent focus-visible:ring-brand-teal',
      accent:
        'bg-brand-terracotta text-white hover:bg-[#c4532b] border border-transparent focus-visible:ring-brand-terracotta shadow-sm',
      destructive:
        'bg-semantic-error text-white hover:bg-[#99281f] border border-transparent focus-visible:ring-semantic-error shadow-sm',
    }[variant];

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`${baseStyles} ${sizeStyles} ${variantStyles} ${className}`}
        {...props}
      >
        {isLoading && (
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v8H4z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
