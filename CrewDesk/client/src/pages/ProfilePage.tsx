import React, { useRef, useState } from 'react';
import { useAuth } from '../context/useAuth';
import { Avatar } from '../components/shared/Avatar';
import { Camera, Trash2, AlertCircle, CheckCircle2, LogOut } from 'lucide-react';
import { API_BASE } from '../lib/api';

export const ProfilePage: React.FC = () => {
  const { user, setUser, logout } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!user) return null;

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);

    try {
      const res = await fetch(`${API_BASE}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name, phone }),
      });

      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message || 'Failed to update profile');

      setUser({ ...user, name: body.data.user.name, phone: body.data.user.phone });
      setMessage({ type: 'success', text: 'Profile details updated successfully.' });
    } catch (err: unknown) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Error updating profile' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Image file size exceeds the 2 MB limit.' });
      return;
    }

    setIsUploading(true);
    setMessage(null);

    const formData = new FormData();
    formData.append('avatar', file);

    try {
      const res = await fetch(`${API_BASE}/profile/avatar`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message || 'Avatar upload failed');

      setUser({ ...user, avatarUrl: body.data.user.avatarUrl });
      setMessage({ type: 'success', text: 'Avatar uploaded and updated successfully.' });
    } catch (err: unknown) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Error uploading avatar' });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveAvatar = async () => {
    if (!user.avatarUrl) return;
    setIsUploading(true);
    setMessage(null);

    try {
      const res = await fetch(`${API_BASE}/profile/avatar`, {
        method: 'DELETE',
        credentials: 'include',
      });

      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message || 'Failed to remove avatar');

      setUser({ ...user, avatarUrl: null });
      setMessage({ type: 'success', text: 'Avatar removed.' });
    } catch (err: unknown) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Error removing avatar' });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-white border border-outline-variant rounded-lg p-6 shadow-sm">
        <h1 className="text-lg font-bold text-ink mb-1">My Profile</h1>
        <p className="text-xs text-ink-muted mb-6">Manage your account picture and personal contact details.</p>

        {message && (
          <div
            className={`mb-5 p-3 rounded text-xs flex items-center gap-2 ${
              message.type === 'success'
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                : 'bg-red-50 border border-red-200 text-red-700'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {/* Avatar Section */}
        <div className="flex items-center gap-5 pb-6 border-b border-outline-variant">
          <div className="relative group">
            <Avatar name={user.name} avatarUrl={user.avatarUrl} size="xl" />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png, image/jpeg, image/webp"
                className="hidden"
                onChange={handleAvatarChange}
              />
              <button
                type="button"
                disabled={isUploading}
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-primary-container hover:bg-primary-hover text-white text-xs font-medium transition-colors disabled:opacity-50"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>{isUploading ? 'Uploading...' : 'Upload Picture'}</span>
              </button>

              {user.avatarUrl && (
                <button
                  type="button"
                  disabled={isUploading}
                  onClick={handleRemoveAvatar}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-outline-variant hover:bg-red-50 text-red-600 text-xs font-medium transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove</span>
                </button>
              )}
            </div>
            <span className="text-[11px] text-ink-muted">
              JPEG, PNG, or WebP. Maximum size 2 MB.
            </span>
          </div>
        </div>

        {/* Profile Info Form */}
        <form onSubmit={handleUpdateProfile} className="space-y-4 pt-6">
          <div>
            <label className="block text-xs font-medium text-ink-muted mb-1.5">Full Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-9 px-3 rounded border border-outline-variant text-sm text-ink bg-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-ink-muted mb-1.5">Email (Read-only)</label>
            <input
              type="email"
              disabled
              value={user.email}
              className="w-full h-9 px-3 rounded border border-outline-variant text-sm text-ink-muted bg-[#F8F8F5] cursor-not-allowed"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-ink-muted mb-1.5">Role (System-assigned)</label>
              <input
                type="text"
                disabled
                value={user.role}
                className="w-full h-9 px-3 rounded border border-outline-variant text-sm text-ink-muted bg-[#F8F8F5] cursor-not-allowed font-semibold text-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-muted mb-1.5">Phone Number</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 555-0199"
                className="w-full h-9 px-3 rounded border border-outline-variant text-sm text-ink bg-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 rounded bg-primary-container hover:bg-primary-hover text-white text-xs font-semibold transition-colors disabled:opacity-50"
            >
              {isSaving ? 'Saving changes...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </div>

      {/* Account Session & Explicit Logout Card */}
      <div className="bg-white border border-outline-variant rounded-lg p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-ink">Active Session</h3>
          <p className="text-xs text-ink-muted mt-0.5">
            Sign out of your CrewDesk account on this device.
          </p>
        </div>
        <button
          type="button"
          onClick={() => logout()}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 hover:border-rose-300 text-rose-700 text-xs font-semibold transition-colors shadow-xs"
        >
          <LogOut className="w-4 h-4 text-rose-600" />
          <span>Sign Out / Log Out</span>
        </button>
      </div>
    </div>
  );
};
