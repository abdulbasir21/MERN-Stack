import { useState } from 'react';
import api from '../api/axios';

export default function PaymentModal({ product, isOpen, onClose }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !product) return null;

  const handleProceed = async () => {
    setError('');

    if (!email || !email.includes('@') || !email.includes('.')) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post('/api/payment/stripe/create-session', {
        productId: product._id,
        buyerEmail: email,
      });

      window.location.href = data.url;
    } catch (err) {
      setError(err?.response?.data?.message || 'Payment failed. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-[480px] bg-[#1A1A28] rounded-xl border border-[#2A2A3A] shadow-2xl overflow-hidden transition-all duration-300">
        
        {/* Header */}
        <div className="p-6 border-b border-[#2A2A3A] flex justify-between items-center">
          <div>
            <h2 className="text-white font-bold text-lg">Complete Purchase</h2>
            <p className="text-[#8888AA] text-sm font-mono mt-0.5">
              {product.name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-[#8888AA] hover:text-white transition-colors p-1 rounded-lg hover:bg-white/5"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          
          {/* Email */}
          <div>
            <label className="block text-[#8888AA] text-xs font-mono uppercase tracking-wider mb-2">
              Your Email
            </label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-[#111118] border border-[#2A2A3A] rounded-lg px-4 py-3 text-white focus:border-[#6C63FF] focus:ring-2 focus:ring-[#6C63FF]/20 transition-all outline-none placeholder:text-[#555570] text-sm"
              />
            </div>
            <p className="text-[#555570] text-xs mt-1.5 font-mono">
              Download link will be sent to this email
            </p>
          </div>

          {/* Payment Method — Stripe only */}
          <div>
            <label className="block text-[#8888AA] text-xs font-mono uppercase tracking-wider mb-2">
              Payment Method
            </label>
            <div className="flex items-center gap-3 p-4 bg-[#111118] border border-[#6C63FF] rounded-xl bg-[#6C63FF]/5">
              <div className="w-10 h-10 rounded-full bg-[#6C63FF]/20 flex items-center justify-center flex-shrink-0">
                <span className="text-xl">💳</span>
              </div>
              <div className="flex-1">
                <p className="text-white font-semibold text-sm">Pay with Card</p>
                <p className="text-[#8888AA] text-xs mt-0.5">Visa · Mastercard · Amex</p>
              </div>
              <span className="bg-blue-500/20 text-blue-400 text-xs px-2 py-1 rounded-md font-mono">
                International
              </span>
            </div>
          </div>

          {/* Order Summary */}
          <div className="bg-[#111118] p-3 rounded-lg border border-[#2A2A3A] flex items-center justify-between">
            <span className="text-[#8888AA] text-sm font-mono">Total</span>
            <span className="text-[#6C63FF] font-bold font-mono">${product.price} USD</span>
          </div>

          {/* Error */}
          {error && (
            <p className="text-red-400 text-sm font-mono bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6">
          <button
            onClick={handleProceed}
            disabled={loading}
            className="w-full h-14 bg-[#6C63FF] hover:bg-[#5A52E5] active:scale-[0.98] text-white font-mono font-semibold flex items-center justify-center gap-2 rounded-xl shadow-[0_0_20px_rgba(108,99,255,0.3)] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Processing...
              </>
            ) : (
              <>
                Proceed to Payment →
              </>
            )}
          </button>
          <p className="text-[11px] font-mono text-[#555570] text-center mt-3">
            🔒 256-bit SSL encryption · Powered by Stripe
          </p>
        </div>

      </div>
    </div>
  );
}