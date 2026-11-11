import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, Eye, EyeOff, ArrowRight, Lock, AlertCircle } from 'lucide-react';
import { useAuth } from '../../features/auth/AuthContext';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [roleSelection, setRoleSelection] = useState('general_contractor');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (password.length < 10) {
      setErrorMessage('Password must be at least 10 characters in length.');
      return;
    }

    setLoading(true);

    try {
      await register({ name, email, password });
      navigate('/app');
    } catch (err) {
      setErrorMessage(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full min-h-[calc(100vh-4rem)] flex flex-col lg:flex-row overflow-hidden bg-surface">
      {/* LEFT HALF: Construction Visual & Quality Guarantee */}
      <section className="relative w-full lg:w-1/2 min-h-[380px] lg:min-h-full overflow-hidden shrink-0 bg-secondary-navy flex flex-col justify-between p-8 lg:p-14 text-white">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:48px_48px] pointer-events-none"></div>

        {/* Brand */}
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

        {/* Center */}
        <div className="relative z-10 my-auto py-10 max-w-lg">
          <h1 className="font-headline font-extrabold text-3xl sm:text-4xl text-white tracking-tight leading-[1.2] mb-6">
            Eliminate scope gap ambiguity across your project portfolio.
          </h1>
          <p className="text-sm text-slate-300 leading-relaxed mb-8">
            Upload original specifications and revised revisions. Get deterministic line-item deltas, verified contract citations, and append-only audit histories.
          </p>

          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm text-white/90">
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold">✓</span>
              <span>Deterministic quantity comparison and exact cost deltas</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-white/90">
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold">✓</span>
              <span>100% verified citations linked to real document chunks</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-white/90">
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold">✓</span>
              <span>SOC2 compliant secure private storage</span>
            </div>
          </div>
        </div>

        <div className="relative z-10 pt-4 text-xs text-slate-400">
          Professional construction intelligence for general contractors, engineers, and owners.
        </div>
      </section>

      {/* RIGHT HALF: Registration Form */}
      <section className="w-full lg:w-1/2 flex flex-col justify-between p-6 sm:p-10 lg:p-14 overflow-y-auto bg-surface">
        <div className="w-full flex items-center justify-end text-xs text-secondary mb-6">
          <span>Already have an account?</span>
          <Link to="/login" className="text-primary-container font-semibold hover:underline ml-1.5">
            Log in →
          </Link>
        </div>

        <div className="w-full max-w-[420px] mx-auto my-auto py-6">
          <div className="mb-8">
            <h2 className="font-headline font-bold text-2xl sm:text-3xl text-secondary-navy tracking-tight">
              Create an account
            </h2>
            <p className="text-sm text-secondary mt-1.5">
              Set up your executive workspace
            </p>
          </div>

          {errorMessage && (
            <div className="mb-6 p-4 rounded-lg bg-danger-bg border border-danger-border flex items-center gap-3 text-danger-text text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-secondary-navy uppercase tracking-wider mb-2">
                Full Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. John Doe, P.E."
                className="w-full h-11 px-3.5 bg-surface border border-border rounded-lg text-sm text-on-surface placeholder:text-slate-400 focus:outline-none focus:border-primary-container focus:ring-2 focus:ring-primary-container/20 transition-all"
              />
            </div>

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
                Stakeholder Role
              </label>
              <select
                value={roleSelection}
                onChange={(e) => setRoleSelection(e.target.value)}
                className="w-full h-11 px-3.5 bg-surface border border-border rounded-lg text-sm text-on-surface focus:outline-none focus:border-primary-container focus:ring-2 focus:ring-primary-container/20 transition-all cursor-pointer"
              >
                <option value="general_contractor">General Contractor</option>
                <option value="subcontractor">Subcontractor</option>
                <option value="project_owner">Project Owner / Developer</option>
                <option value="dispute_counsel">Construction Dispute Counsel</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-secondary-navy uppercase tracking-wider mb-2">
                Password (minimum 10 characters)
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 10 characters"
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

            <p className="text-[11px] text-slate-500 leading-normal pt-1">
              By creating an account, you agree that findings and estimates require human review and do not constitute legal or contractual conclusions.
            </p>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-primary-container hover:bg-primary-hover text-white font-headline text-sm font-semibold rounded-xl shadow-sm active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50 pt-2"
            >
              {loading ? (
                <span>Creating workspace...</span>
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        <div className="w-full text-center border-t border-border pt-4 mt-6">
          <p className="text-xs text-slate-400 flex items-center justify-center gap-2">
            <Lock className="w-3.5 h-3.5 text-secondary" />
            <span>Single-tenant data isolation • AES-256 encrypted storage</span>
          </p>
        </div>
      </section>
    </div>
  );
}
