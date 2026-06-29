import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AdminLogin() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email || !password) {
      setError('Email and password are required.');
      return;
    }
    setLoading(true);
    try {
      await login(email, password);
      navigate('/admin');
    } catch (err) {
      setError(err?.response?.data?.message || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-margin-mobile">
      <div className="glass-panel inner-glow rounded-2xl p-10 w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <span
            className="material-symbols-outlined text-primary text-5xl"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            water_drop
          </span>
          <h1 className="text-headline-md text-on-surface mt-2">Admin Login</h1>
          <p className="text-body-sm text-on-surface-variant mt-1">DigitalDrop Control Panel</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-md">
          {/* Email */}
          <div>
            <label className="block text-label-sm font-mono text-outline uppercase tracking-wider mb-2">
              Email
            </label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@digitaldrop.io"
                className="w-full bg-[#111118] border border-[#2A2A3A] rounded-lg px-md py-sm text-on-surface focus:border-[#6C63FF] focus:ring-2 focus:ring-[#6C63FF]/20 transition-all outline-none placeholder:text-outline-variant font-body-md pr-12"
              />
              <span className="material-symbols-outlined absolute right-md top-1/2 -translate-y-1/2 text-outline-variant text-[18px] pointer-events-none">
                mail
              </span>
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-label-sm font-mono text-outline uppercase tracking-wider mb-2">
              Password
            </label>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#111118] border border-[#2A2A3A] rounded-lg px-md py-sm text-on-surface focus:border-[#6C63FF] focus:ring-2 focus:ring-[#6C63FF]/20 transition-all outline-none placeholder:text-outline-variant font-body-md pr-12"
              />
              <span className="material-symbols-outlined absolute right-md top-1/2 -translate-y-1/2 text-outline-variant text-[18px] pointer-events-none">
                lock
              </span>
            </div>
          </div>

          {error && (
            <p className="text-error text-label-sm font-mono">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 bg-[#6C63FF] hover:bg-[#5A52E5] active:scale-[0.98] text-white font-mono text-label-md rounded-lg flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(108,99,255,0.3)] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Logging in...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[18px]">login</span>
                Login
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
