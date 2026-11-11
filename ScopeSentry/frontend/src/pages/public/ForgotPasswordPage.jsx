import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Shield, ArrowRight, ArrowLeft, MailCheck, AlertCircle } from 'lucide-react';
import { apiClient } from '../../lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);

    try {
      await apiClient('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email })
      });
      setSubmitted(true);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to submit password recovery request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full min-h-[calc(100vh-4rem)] flex items-center justify-center p-6 bg-background">
      <div className="w-full max-w-[440px] bg-surface rounded-2xl border border-border shadow-card p-8 sm:p-10">
        {/* Brand */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-primary-container flex items-center justify-center text-white shadow-sm">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <span className="font-headline font-bold text-lg text-secondary-navy block leading-tight">
              ScopeSentry
            </span>
            <span className="text-[10px] uppercase font-mono tracking-wider text-secondary">
              Security Recovery
            </span>
          </div>
        </div>

        {submitted ? (
          <div className="text-center py-4">
            <div className="w-12 h-12 rounded-xl bg-confirmed-bg border border-confirmed-border mx-auto flex items-center justify-center text-confirmed-text mb-4">
              <MailCheck className="w-6 h-6" />
            </div>
            <h2 className="font-headline font-bold text-2xl text-secondary-navy tracking-tight mb-2">
              Instructions Sent
            </h2>
            <p className="text-sm text-secondary leading-relaxed mb-8">
              If an account with work email <span className="font-semibold text-secondary-navy">{email}</span> exists, you will receive password reset instructions shortly.
            </p>
            <Link
              to="/login"
              className="w-full h-11 rounded-lg bg-surface border border-border text-secondary-navy text-sm font-semibold hover:bg-surface-subtle transition-all flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Return to Login</span>
            </Link>
          </div>
        ) : (
          <div>
            <div className="mb-6">
              <h2 className="font-headline font-bold text-2xl text-secondary-navy tracking-tight">
                Reset your password
              </h2>
              <p className="text-sm text-secondary mt-1.5 leading-relaxed">
                Enter your registered work email and we will generate a secure, 30-minute recovery token.
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

              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-primary-container hover:bg-primary-hover text-white font-headline text-sm font-semibold rounded-xl shadow-sm active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <span>Sending instructions...</span>
                ) : (
                  <>
                    <span>Send Recovery Instructions</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="text-center pt-2">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 text-xs text-secondary hover:text-primary transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to login</span>
                </Link>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
