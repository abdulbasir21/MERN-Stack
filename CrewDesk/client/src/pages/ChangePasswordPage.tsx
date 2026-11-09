import React, { useState } from 'react';
import { useAuth } from '../context/useAuth';
import { useNavigate } from 'react-router-dom';
import { KeyRound, AlertCircle, CheckCircle2 } from 'lucide-react';
import { API_BASE } from '../lib/api';

export const ChangePasswordPage: React.FC = () => {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch(`${API_BASE}/auth/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const body = await res.json();

      if (!res.ok) {
        throw new Error(body.error?.message || 'Failed to update password');
      }

      if (user) {
        setUser({ ...user, mustChangePassword: false });
      }

      navigate('/');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F5F0] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border border-outline-variant rounded-lg p-8 shadow-sm">
        <div className="w-10 h-10 rounded bg-amber-100 text-amber-800 flex items-center justify-center mb-4">
          <KeyRound className="w-5 h-5" />
        </div>

        <h1 className="text-xl font-bold text-ink mb-1">Set a new password</h1>
        <p className="text-xs text-ink-muted mb-6">
          Your account was provisioned with a temporary password. You must set a personal password before continuing.
        </p>

        {error && (
          <div className="mb-4 p-3 rounded bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-ink-muted mb-1.5">Current temporary password</label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full h-9 px-3 rounded border border-outline-variant text-sm text-ink bg-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-ink-muted mb-1.5">New password</label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 8 chars, 1 uppercase, 1 number"
              className="w-full h-9 px-3 rounded border border-outline-variant text-sm text-ink bg-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-ink-muted mb-1.5">Confirm new password</label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full h-9 px-3 rounded border border-outline-variant text-sm text-ink bg-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="bg-[#F8F8F5] p-3 rounded border border-outline-variant text-[11px] text-ink-muted space-y-1">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
              <span>Minimum 8 characters</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
              <span>At least one uppercase letter &amp; one number</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-9 rounded bg-primary-container hover:bg-primary-hover text-white text-xs font-semibold transition-colors disabled:opacity-50 mt-2"
          >
            {isSubmitting ? 'Updating password...' : 'Update password and continue'}
          </button>
        </form>
      </div>
    </div>
  );
};
