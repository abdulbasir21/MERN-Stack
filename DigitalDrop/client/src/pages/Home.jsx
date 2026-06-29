import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import CategoryFilter from '../components/CategoryFilter';
import ProductCard from '../components/ProductCard';
import PaymentModal from '../components/PaymentModal';
import About from '../components/About';
import Footer from '../components/Footer';
import api from '../api/axios';

export default function Home() {
  const [products, setProducts] = useState([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    const params = activeCategory !== 'all' ? { category: activeCategory } : {};
    setLoading(true);
    api
      .get('/api/products', { params })
      .then(({ data }) => setProducts(data))
      .catch((err) => console.error('Failed to load products', err))
      .finally(() => setLoading(false));
  }, [activeCategory]);

  const handleBuyClick = (product) => {
    setSelectedProduct(product);
    setModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="relative pt-32 pb-20 px-margin-mobile md:px-margin-desktop overflow-hidden">
        <div className="dot-pattern absolute inset-0 pointer-events-none opacity-60" />
        <div className="relative max-w-[1440px] mx-auto text-center">
          <p className="text-label-md font-mono text-secondary uppercase tracking-widest mb-4">
            Premium Digital Marketplace
          </p>
          <h1 className="text-headline-xl text-on-background mb-6">
            Download{' '}
            <span className="text-gradient">Premium Assets</span>
            <br />
            Built for Creators
          </h1>
        <p className="text-body-lg text-on-surface-variant max-w-xl mx-auto mb-8 text-center">
  UI kits, templates, courses, and Figma files — all instantly downloadable
  after purchase. No subscriptions, just what you need.
</p>
        </div>
      </section>

      {/* Marketplace */}
      <section className="px-margin-mobile md:px-margin-desktop pb-24 max-w-[1440px] mx-auto">
        <div className="mb-8">
          <CategoryFilter
            activeCategory={activeCategory}
            onCategoryChange={setActiveCategory}
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-on-surface-variant">
            <span className="material-symbols-outlined text-5xl mb-4 opacity-40">inventory_2</span>
            <p className="text-body-md font-mono">No products found in this category.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product) => (
              <ProductCard
                key={product._id}
                product={product}
                onBuyClick={handleBuyClick}
              />
            ))}
          </div>
        )}
      </section>

      {/* About */}
      <About />

      {/* Footer */}
      <Footer />

      <PaymentModal
        product={selectedProduct}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}