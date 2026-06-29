const CATEGORIES = [
  { value: 'all', label: 'All Assets' },
  { value: 'ui-kit', label: 'UI Kits' },
  { value: 'template', label: 'Templates' },
  { value: 'course', label: 'Courses' },
  { value: 'figma', label: 'Figma' },
];

export default function CategoryFilter({ activeCategory, onCategoryChange }) {
  return (
    <div className="flex flex-wrap gap-3">
      {CATEGORIES.map((cat) => (
        <button
          key={cat.value}
          onClick={() => onCategoryChange(cat.value)}
          className={
            activeCategory === cat.value
              ? 'bg-primary text-on-primary px-6 py-2 rounded-full text-label-md font-mono transition-all'
              : 'bg-surface-variant/50 text-on-surface-variant hover:text-primary border border-outline-variant/30 px-6 py-2 rounded-full text-label-md font-mono transition-all'
          }
        >
          {cat.label}
        </button>
      ))}
    </div>
  );
}
