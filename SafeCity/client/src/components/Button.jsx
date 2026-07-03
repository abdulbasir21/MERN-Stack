export default function Button({
  variant = 'primary',
  onClick,
  type = 'button',
  disabled,
  children,
  className = '',
}) {
  const base =
    'font-label-md text-label-md px-space-lg py-space-sm rounded-lg transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed';
  const variants = {
    primary:   'bg-[#0d9488] hover:bg-[#0f766e] text-white shadow-sm',
    secondary: 'border border-primary text-primary hover:bg-surface-container-low',
    danger:    'bg-error text-on-error hover:bg-red-700',
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${variants[variant] || variants.primary} ${className}`}
    >
      {children}
    </button>
  );
}
