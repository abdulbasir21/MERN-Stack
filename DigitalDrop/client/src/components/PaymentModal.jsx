import { useState } from 'react';
import api from '../api/axios';

export default function PaymentModal({ product, isOpen, onClose }) {
  const [email, setEmail] = useState('');
  const [selectedMethod, setSelectedMethod] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !product) return null;

  const handleProceed = async () => {
    setError('');

    if (!email || !email.includes('@') || !email.includes('.')) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!selectedMethod || !['stripe', 'safepay'].includes(selectedMethod)) {
      setError('Please select a payment method.');
      return;
    }

    setLoading(true);
    try {
      const endpoint =
        selectedMethod === 'stripe'
          ? '/api/payment/stripe/create-session'
          : '/api/payment/safepay/create-session';

      const { data } = await api.post(endpoint, {
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-margin-mobile">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-[480px] bg-[#1A1A28] rounded-xl border border-[#2A2A3A] shadow-2xl overflow-hidden inner-glow transition-all duration-300 scale-100 opacity-100">
        {/* Header */}
        <div className="p-md border-b border-outline-variant/30 bg-surface-container-low flex justify-between items-center">
          <div>
            <h2 className="text-headline-md text-on-surface">Payment Method</h2>
            <p className="text-label-sm font-mono text-on-surface-variant mt-0.5">
              Complete your purchase for {product.name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-on-surface-variant hover:text-on-surface transition-colors p-1 rounded-lg hover:bg-white/5"
            aria-label="Close"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-md space-y-md">
          {/* Email */}
          <div>
            <label className="block text-label-sm font-mono text-outline uppercase tracking-wider mb-2">
              Your Email
            </label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-[#111118] border border-[#2A2A3A] rounded-lg px-md py-sm text-on-surface focus:border-[#6C63FF] focus:ring-2 focus:ring-[#6C63FF]/20 transition-all outline-none placeholder:text-outline-variant font-body-md pr-12"
              />
              <span
                className="material-symbols-outlined absolute right-md top-1/2 -translate-y-1/2 text-outline-variant text-[18px] pointer-events-none"
              >
                mail
              </span>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div className="grid grid-cols-2 gap-sm">
            {/* Stripe */}
            <label className="relative cursor-pointer">
              <input
                type="radio"
                name="payment_method"
                value="stripe"
                className="sr-only peer"
                onChange={() => setSelectedMethod('stripe')}
                checked={selectedMethod === 'stripe'}
              />
              <div className="border border-[#2A2A3A] rounded-lg p-md bg-[#111118] peer-checked:border-primary peer-checked:bg-primary/10 hover:border-primary-container/50 transition-all duration-200">
                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center mb-2">
                  <span className="material-symbols-outlined text-primary">credit_card</span>
                </div>
                <p className="text-label-md text-on-surface font-mono">Stripe</p>
                <p className="text-label-sm text-on-surface-variant uppercase tracking-wider text-[10px]">Pay with Card</p>
              </div>
              <span className="absolute top-2 right-2 hidden peer-checked:block">
                <span className="material-symbols-outlined text-primary text-[18px]">check_circle</span>
              </span>
            </label>

            {/* Safepay */}
            <label className="relative cursor-pointer">
              <input
                type="radio"
                name="payment_method"
                value="safepay"
                className="sr-only peer"
                onChange={() => setSelectedMethod('safepay')}
                checked={selectedMethod === 'safepay'}
              />
              <div className="border border-[#2A2A3A] rounded-lg p-md bg-[#111118] peer-checked:border-primary peer-checked:bg-primary/10 hover:border-primary-container/50 transition-all duration-200">
                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center mb-2">
                  <span className="material-symbols-outlined text-secondary">account_balance_wallet</span>
                </div>
                <p className="text-label-md text-on-surface font-mono">Safepay</p>
                <p className="text-label-sm text-on-surface-variant uppercase tracking-wider text-[10px]">Pay with Wallet</p>
              </div>
              <span className="absolute top-2 right-2 hidden peer-checked:block">
                <span className="material-symbols-outlined text-primary text-[18px]">check_circle</span>
              </span>
            </label>
          </div>

          {/* Summary */}
          <div className="bg-surface-container-high/50 p-sm rounded-lg border border-outline-variant/20 flex items-center justify-between">
            <span className="text-label-sm text-on-surface-variant font-mono">Transaction Total</span>
            <span className="text-secondary text-label-sm font-mono">${product.price} USD</span>
          </div>

          {/* Error */}
          {error && (
            <p className="text-error text-label-sm font-mono">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="p-md bg-surface-container-low border-t border-outline-variant/30">
          <button
            onClick={handleProceed}
            disabled={loading}
            className="w-full h-14 bg-[#6C63FF] hover:bg-[#5A52E5] active:scale-[0.98] text-white font-mono text-label-md flex items-center justify-center gap-2 rounded-lg shadow-[0_0_20px_rgba(108,99,255,0.3)] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
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
                Proceed to Payment
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </>
            )}
          </button>
          <p className="text-[11px] font-mono text-outline-variant text-center mt-md">
            Encrypted by SSL 256-bit security. No data stored on servers.
          </p>
        </div>
      </div>
    </div>
  );
}
