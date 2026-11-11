import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, Eye, EyeOff, ArrowRight, PlayCircle, Lock, AlertCircle } from 'lucide-react';
import { useAuth } from '../../features/auth/AuthContext';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);

    try {
      await login({ email, password });
      navigate('/app');
    } catch (err) {
      setErrorMessage(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full min-h-[calc(100vh-4rem)] flex flex-col lg:flex-row overflow-hidden bg-surface">
      {/* LEFT HALF: Construction Visual Context & Floating Spec Cards */}
      <section className="relative w-full lg:w-1/2 min-h-[380px] lg:min-h-full overflow-hidden shrink-0 bg-secondary-navy flex flex-col justify-between p-8 lg:p-14 text-white">
        {/* Subtle Blueprint Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:48px_48px] pointer-events-none"></div>

        {/* Top: ScopeSentry Brand Mark */}
        <div className="relative z-10 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-sm">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-headline font-bold text-lg text-white tracking-tight block leading-tight">
              ScopeSentry
            </span>
            <span className="text-[10px] uppercase font-mono tracking-wider text-slate-300">
              Construction Verification Engine
            </span>
          </div>
        </div>

        {/* Center: Value Statement & Floating Spec Delta Card */}
        <div className="relative z-10 my-auto py-10 max-w-lg">
          <h1 className="font-headline font-extrabold text-3xl sm:text-4xl text-white tracking-tight leading-[1.2] mb-8">
            Every project change has a cost. Make sure you see it.
          </h1>

          {/* Floating Spec Delta Frosted Card */}
          <div className="inline-flex items-center gap-4 bg-white/10 backdrop-blur-xl border border-white/20 px-5 py-3.5 rounded-2xl shadow-raised">
            <div className="w-10 h-10 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center shrink-0">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div className="flex items-center gap-3">
              <span className="font-headline font-semibold text-white text-sm">
                +12 windows detected
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/25 border border-emerald-400/40 text-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Spec Rev #04
              </span>
            </div>
          </div>
        </div>

        {/* Bottom Badge: Citation Proof */}
        <div className="relative z-10 pt-4 flex items-center gap-2 text-white/80 text-xs">
          <span className="text-emerald-400 font-bold">✓</span>
          <span>Backed by original contract documents • 100% verifiable citations</span>
        </div>
      </section>

      {/* RIGHT HALF: Minimalist Executive Authentication Card */}
      <section className="w-full lg:w-1/2 flex flex-col justify-between p-6 sm:p-10 lg:p-14 overflow-y-auto bg-surface">
        {/* Top Utility Nav */}
        <div className="w-full flex items-center justify-between text-xs text-secondary mb-6">
          <div className="flex items-center gap-2 font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>SYSTEM OPERATIONAL: v2.48</span>
          </div>
          <Link to="/demo" className="text-secondary hover:text-primary transition-colors">
            Interactive Tour →
          </Link>
        </div>

        {/* Form Container */}
        <div className="w-full max-w-[420px] mx-auto my-auto py-6">
          <div className="mb-8">
            <h2 className="font-headline font-bold text-2xl sm:text-3xl text-secondary-navy tracking-tight">
              Welcome back
            </h2>
            <p className="text-sm text-secondary mt-1.5">
              Log in to your workspace
            </p>
          </div>

          {errorMessage && (
            <div className="mb-6 p-4 rounded-lg bg-danger-bg border border-danger-border flex items-center gap-3 text-danger-text text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-secondary-navy uppercase tracking-wider mb-2">
                Work Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@contracting.com"
                className="w-full h-11 px-3.5 bg-surface border border-border rounded-lg text-sm text-on-surface placeholder:text-slate-400 focus:outline-none focus:border-primary-container focus:ring-2 focus:ring-primary-container/20 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-secondary-navy uppercase tracking-wider mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your security token"
                  className="w-full h-11 px-3.5 pr-11 bg-surface border border-border rounded-lg text-sm text-on-surface placeholder:text-slate-400 focus:outline-none focus:border-primary-container focus:ring-2 focus:ring-primary-container/20 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  defaultChecked
                  className="w-4 h-4 rounded text-primary-container border-border focus:ring-primary-container/30 cursor-pointer"
                />
                <span className="text-xs text-secondary font-medium">Remember me for 30 days</span>
              </label>
              <Link
                to="/forgot-password"
                className="text-xs text-primary-container hover:text-primary font-medium hover:underline transition-colors"
              >
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-primary-container hover:bg-primary-hover text-white font-headline text-sm font-semibold rounded-xl shadow-sm active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <span>Logging in...</span>
              ) : (
                <>
                  <span>Log in</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="relative py-2 flex items-center justify-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border"></div>
              </div>
              <span className="relative bg-surface px-3 text-xs text-slate-400 font-mono uppercase tracking-wider">
                OR
              </span>
            </div>

            <Link
              to="/demo"
              className="w-full h-11 bg-surface border border-border hover:bg-surface-subtle text-secondary-navy text-sm font-semibold rounded-xl shadow-sm transition-all flex items-center justify-center gap-2"
            >
              <PlayCircle className="w-4 h-4 text-primary-container" />
              <span>Try the live demo instead</span>
            </Link>

            <div className="text-center pt-2">
              <p className="text-xs text-secondary">
                New here?{' '}
                <Link to="/register" className="text-primary-container font-semibold hover:underline ml-1">
                  Create an account
                </Link>
              </p>
            </div>
          </form>
        </div>

        {/* Security Footer */}
        <div className="w-full text-center border-t border-border pt-4 mt-6">
          <p className="text-xs text-slate-400 flex items-center justify-center gap-2">
            <Lock className="w-3.5 h-3.5 text-secondary" />
            <span>Enterprise SOC2 Type II Certified • Verified Contract Citations</span>
          </p>
        </div>
      </section>
    </div>
  );
}
