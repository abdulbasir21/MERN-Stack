import { useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { Shield, Eye, EyeOff, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { apiClient } from '../../lib/api';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [success, setSuccess] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!token) {
      setErrorMessage('Missing password reset token in URL.');
      return;
    }

    if (newPassword.length < 10) {
      setErrorMessage('Password must be at least 10 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      await apiClient('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, newPassword })
      });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2500);
    } catch (err) {
      setErrorMessage(err.message || 'Password reset failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full min-h-[calc(100vh-4rem)] flex items-center justify-center p-6 bg-background">
      <div className="w-full max-w-[440px] bg-surface rounded-2xl border border-border shadow-card p-8 sm:p-10">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-primary-container flex items-center justify-center text-white shadow-sm">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <span className="font-headline font-bold text-lg text-secondary-navy block leading-tight">
              ScopeSentry
            </span>
            <span className="text-[10px] uppercase font-mono tracking-wider text-secondary">
              Password Reset
            </span>
          </div>
        </div>

        {success ? (
          <div className="text-center py-4">
            <div className="w-12 h-12 rounded-xl bg-confirmed-bg border border-confirmed-border mx-auto flex items-center justify-center text-confirmed-text mb-4">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h2 className="font-headline font-bold text-2xl text-secondary-navy tracking-tight mb-2">
              Password Updated
            </h2>
            <p className="text-sm text-secondary leading-relaxed mb-6">
              Your password has been successfully reset. Redirecting you to login...
            </p>
            <Link
              to="/login"
              className="text-sm text-primary-container font-semibold hover:underline"
            >
              Click here if not redirected automatically
            </Link>
          </div>
        ) : (
          <div>
            <div className="mb-6">
              <h2 className="font-headline font-bold text-2xl text-secondary-navy tracking-tight">
                Create new password
              </h2>
              <p className="text-sm text-secondary mt-1.5 leading-relaxed">
                Choose a strong password with at least 10 characters.
              </p>
            </div>

            {errorMessage && (
              <div className="mb-6 p-4 rounded-lg bg-danger-bg border border-danger-border flex items-center gap-3 text-danger-text text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {!token && (
              <div className="mb-6 p-4 rounded-lg bg-estimate-bg border border-estimate-border text-estimate-text text-sm">
                Invalid reset link. No token parameter provided.
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-secondary-navy uppercase tracking-wider mb-2">
                  New Password (min 10 chars)
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full h-11 px-3.5 pr-11 bg-surface border border-border rounded-lg text-sm text-on-surface placeholder:text-slate-400 focus:outline-none focus:border-primary-container focus:ring-2 focus:ring-primary-container/20 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-secondary-navy uppercase tracking-wider mb-2">
                  Confirm Password
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full h-11 px-3.5 bg-surface border border-border rounded-lg text-sm text-on-surface placeholder:text-slate-400 focus:outline-none focus:border-primary-container focus:ring-2 focus:ring-primary-container/20 transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={loading || !token}
                className="w-full h-12 bg-primary-container hover:bg-primary-hover text-white font-headline text-sm font-semibold rounded-xl shadow-sm active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50 pt-1"
              >
                {loading ? (
                  <span>Updating password...</span>
                ) : (
                  <>
                    <span>Reset Password</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
