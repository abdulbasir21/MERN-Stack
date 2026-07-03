export default function Card({ children, className = '' }) {
  return (
    <div className={`bg-surface-container-lowest border border-border-subtle rounded-xl level-1-shadow p-space-lg ${className}`}>
      {children}
    </div>
  );
}
