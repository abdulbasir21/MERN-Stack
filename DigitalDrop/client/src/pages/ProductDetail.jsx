import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import PaymentModal from '../components/PaymentModal';
import api from '../api/axios';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    api
      .get(`/api/products/${id}`)
      .then(({ data }) => setProduct(data))
      .catch(() => navigate('/'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!product) return null;

  const previewUrl = `${import.meta.env.VITE_API_URL}/${product.previewImage}`;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="pt-28 pb-24 px-margin-mobile md:px-margin-desktop max-w-[1440px] mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-on-surface-variant hover:text-primary transition-colors font-mono text-label-md mb-8"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Back
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          {/* Preview image */}
          <div className="rounded-xl overflow-hidden border border-outline-variant/30 bg-surface-container aspect-video flex items-center justify-center">
            {!imgError ? (
              <img
                src={previewUrl}
                alt={product.name}
                className="w-full h-full object-cover"
                onError={() => setImgError(true)}
              />
            ) : (
              <span className="material-symbols-outlined text-6xl text-on-surface-variant opacity-30">image</span>
            )}
          </div>

          {/* Details */}
          <div className="flex flex-col gap-6">
            <div>
              <span className="text-label-sm font-mono text-secondary uppercase tracking-widest">{product.category}</span>
              <h1 className="text-headline-lg text-on-surface mt-2">{product.name}</h1>
              <p className="text-body-md text-on-surface-variant mt-3">{product.description}</p>
            </div>

            <div className="glass-panel rounded-xl p-6 flex items-center justify-between">
              <div>
                <p className="text-label-sm font-mono text-outline uppercase tracking-wider">Price</p>
                <p className="text-headline-lg text-primary font-mono">${product.price}</p>
              </div>
              <div className="flex items-center gap-1 text-on-surface-variant text-label-sm font-mono">
                <span className="material-symbols-outlined text-secondary text-[18px]">verified</span>
                Instant Download
              </div>
            </div>

            <button
              onClick={() => setModalOpen(true)}
              className="w-full h-14 bg-primary text-on-primary font-mono text-label-md rounded-lg hover:bg-primary-fixed-dim active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-[0_0_24px_rgba(196,192,255,0.2)]"
            >
              <span className="material-symbols-outlined text-[20px]">shopping_bag</span>
              Buy Now
            </button>

            <ul className="space-y-2 text-label-sm font-mono text-on-surface-variant">
              {['Instant digital delivery via email', 'Secure payment — Stripe or Safepay', '48-hour download link'].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary text-[16px]">check_circle</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <PaymentModal product={product} isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
