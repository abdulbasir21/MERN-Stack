import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className = '', id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-medium text-ink-secondary mb-1.5"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`w-full h-10 px-3.5 bg-paper-surface border rounded-control text-sm text-ink-primary placeholder:text-ink-muted transition-colors focus:outline-none focus:ring-2 focus:border-transparent disabled:opacity-50 disabled:bg-paper-sunken ${
            error
              ? 'border-semantic-error focus:ring-semantic-error'
              : 'border-paper-border focus:ring-brand-teal'
          } ${className}`}
          {...props}
        />
        {error ? (
          <p className="mt-1.5 text-xs text-semantic-error flex items-center gap-1">
            <span>•</span> {error}
          </p>
        ) : helperText ? (
          <p className="mt-1.5 text-xs text-ink-muted">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';
