import Button from './Button';

export default function EmptyState({ icon = 'inbox', message, ctaLabel, onCta }) {
  return (
    <div className="flex flex-col items-center justify-center py-space-3xl text-center">
      <span
        className="material-symbols-outlined text-on-tertiary-container mb-space-md"
        style={{ fontSize: '48px' }}
      >
        {icon}
      </span>
      <h3 className="font-headline-md text-headline-md text-primary mb-2">{message}</h3>
      {ctaLabel && onCta && (
        <Button onClick={onCta} className="mt-space-md">
          {ctaLabel}
        </Button>
      )}
    </div>
  );
}
