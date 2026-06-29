import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const BADGE_MAP = {
  'ui-kit':   { bg: 'bg-secondary-container text-on-secondary-container', label: 'Hot' },
  'template': { bg: 'bg-[#1A1A28] text-primary-container', label: 'New' },
  'course':   { bg: 'bg-primary-container text-on-primary-container', label: 'Course' },
  'figma':    { bg: 'bg-tertiary text-on-tertiary', label: 'Design' },
};

const VERIFIED_LABEL = {
  'ui-kit':   'Instant Access',
  'template': 'Developer Ready',
  'course':   'Certification',
  'figma':    'Figma Only',
};

export default function ProductCard({ product, onBuyClick }) {
  const navigate = useNavigate();
  const cardRef = useRef(null);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          card.style.opacity = '1';
          card.style.transform = 'translateY(0)';
          observer.unobserve(card);
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(card);
    return () => observer.disconnect();
  }, []);

  const badge = BADGE_MAP[product.category] || BADGE_MAP['ui-kit'];
  const verifiedLabel = VERIFIED_LABEL[product.category] || 'Instant Access';
  const previewUrl = `${import.meta.env.VITE_API_URL}/${product.previewImage}`;

  return (
    <div
      ref={cardRef}
      onClick={() => navigate(`/product/${product._id}`)}
      className="glass-card inner-glow rounded-xl overflow-hidden group cursor-pointer"
      style={{
        opacity: 0,
        transform: 'translateY(20px)',
        transition: 'opacity 0.6s cubic-bezier(0.22,1,0.36,1), transform 0.6s cubic-bezier(0.22,1,0.36,1)',
      }}
    >
      {/* Image */}
      <div className="h-48 relative overflow-hidden">
        {!imgError ? (
          <div
            className="w-full h-full bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
            style={{ backgroundImage: `url(${previewUrl})` }}
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full bg-[#1c1d39] flex items-center justify-center text-on-surface-variant">
            <span className="material-symbols-outlined text-4xl opacity-40">image</span>
          </div>
        )}
        {/* Category badge */}
        <span
          className={`absolute top-3 left-3 text-[10px] font-bold px-2 py-1 rounded-sm uppercase ${badge.bg}`}
        >
          {badge.label}
        </span>
      </div>

      {/* Body */}
      <div className="p-6">
        <div className="flex items-start justify-between gap-2 mb-2">
          <span className="text-body-lg font-semibold text-on-surface leading-tight">{product.name}</span>
          <span className="text-primary font-mono text-headline-md whitespace-nowrap">${product.price}</span>
        </div>

        <p className="text-body-sm text-on-surface-variant mb-6 line-clamp-2">{product.description}</p>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <span className="material-symbols-outlined text-secondary" style={{ fontSize: '18px' }}>verified</span>
            <span className="text-label-sm font-mono text-on-surface-variant">{verifiedLabel}</span>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onBuyClick(product); }}
            className="bg-primary/10 hover:bg-primary text-primary hover:text-on-primary p-2 rounded-lg transition-colors"
            aria-label="Buy"
          >
            <span className="material-symbols-outlined">shopping_bag</span>
          </button>
        </div>
      </div>
    </div>
  );
}
