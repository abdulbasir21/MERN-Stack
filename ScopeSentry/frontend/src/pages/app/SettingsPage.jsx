import { useState } from 'react';
import { useAuth } from '../../features/auth/AuthContext';
import { apiClient } from '../../lib/api';
import { Shield, User, KeyRound, CheckCircle2, AlertCircle } from 'lucide-react';

export default function SettingsPage() {
  const { user, refreshUser } = useAuth();

  // Profile name update state
  const [name, setName] = useState(user?.name || '');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError] = useState(null);

  // Password update state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState(null);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileSuccess(false);
    setProfileError(null);

    try {
      await apiClient('/settings', {
        method: 'PATCH',
        body: JSON.stringify({ name: name.trim() })
      });
      await refreshUser();
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 4000);
    } catch (err) {
      setProfileError(err.message || 'Failed to update profile');
    } finally {
      setProfileSaving(false);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setPasswordSaving(true);
    setPasswordSuccess(false);
    setPasswordError(null);

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      setPasswordSaving(false);
      return;
    }

    if (newPassword.length < 10) {
      setPasswordError('New password must be at least 10 characters');
      setPasswordSaving(false);
      return;
    }

    try {
      await apiClient('/settings', {
        method: 'PATCH',
        body: JSON.stringify({
          currentPassword,
          newPassword
        })
      });
      setPasswordSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(false), 4000);
    } catch (err) {
      setPasswordError(err.message || 'Failed to change password');
    } finally {
      setPasswordSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold font-headline text-primary tracking-tight">Account Settings</h1>
        <p className="text-sm text-secondary mt-1">
          Manage your executive credentials, organization profile, and security preferences.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left Column: Context / Identity Badge */}
        <div className="space-y-4">
          <div className="bg-surface rounded-xl p-5 border border-border space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary-container/10 flex items-center justify-center text-primary-container">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-sm text-primary">{user?.name || 'Executive User'}</p>
                <p className="text-xs font-mono text-secondary">{user?.role || 'PROJECT_OWNER'}</p>
              </div>
            </div>
            <div className="pt-3 border-t border-border text-xs text-secondary space-y-2">
              <div className="flex justify-between">
                <span>Account Tier:</span>
                <span className="font-semibold text-primary">Enterprise Single-Tenant</span>
              </div>
              <div className="flex justify-between">
                <span>Role Scope:</span>
                <span className="font-mono text-primary-container font-semibold">Strict Owner Isolation</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Columns: Forms */}
        <div className="md:col-span-2 space-y-6">
          {/* Profile Card */}
          <div className="bg-surface rounded-xl border border-border p-6 space-y-5">
            <div className="flex items-center gap-2 border-b border-border pb-4">
              <User className="w-5 h-5 text-primary-container" />
              <h2 className="text-base font-semibold text-primary">Personal Information</h2>
            </div>

            {profileSuccess && (
              <div className="flex items-center gap-2 text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 p-3 rounded-lg">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Profile information updated successfully.</span>
              </div>
            )}

            {profileError && (
              <div className="flex items-center gap-2 text-xs bg-rose-50 text-rose-800 border border-rose-200 p-3 rounded-lg">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{profileError}</span>
              </div>
            )}

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-primary mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary-container/20 focus:border-primary-container transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-secondary mb-1">
                  Email Address (Verified)
                </label>
                <input
                  type="email"
                  disabled
                  value={user?.email || ''}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-slate-100 text-slate-500 cursor-not-allowed"
                />
                <p className="text-[11px] text-slate-400 mt-1">Email address cannot be modified once provisioned.</p>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={profileSaving}
                  className="px-4 py-2 rounded-lg bg-primary-container text-white text-xs font-semibold hover:bg-primary-container/90 transition-all disabled:opacity-50"
                >
                  {profileSaving ? 'Saving Changes...' : 'Save Profile'}
                </button>
              </div>
            </form>
          </div>

          {/* Security / Password Card */}
          <div className="bg-surface rounded-xl border border-border p-6 space-y-5">
            <div className="flex items-center gap-2 border-b border-border pb-4">
              <KeyRound className="w-5 h-5 text-primary-container" />
              <h2 className="text-base font-semibold text-primary">Security & Password</h2>
            </div>

            {passwordSuccess && (
              <div className="flex items-center gap-2 text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 p-3 rounded-lg">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Password changed successfully. Your active session remains verified.</span>
              </div>
            )}

            {passwordError && (
              <div className="flex items-center gap-2 text-xs bg-rose-50 text-rose-800 border border-rose-200 p-3 rounded-lg">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}

            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-primary mb-1">
                  Current Password
                </label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary-container/20 focus:border-primary-container transition-all"
                  placeholder="Enter current password"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-primary mb-1">
                    New Password (min 10 chars)
                  </label>
                  <input
                    type="password"
                    required
                    minLength={10}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary-container/20 focus:border-primary-container transition-all"
                    placeholder="Min 10 characters"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-primary mb-1">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    required
                    minLength={10}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary-container/20 focus:border-primary-container transition-all"
                    placeholder="Repeat new password"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={passwordSaving}
                  className="px-4 py-2 rounded-lg bg-primary-container text-white text-xs font-semibold hover:bg-primary-container/90 transition-all disabled:opacity-50"
                >
                  {passwordSaving ? 'Updating Password...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
