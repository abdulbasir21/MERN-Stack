'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ChangePasswordInputSchema,
  UpdateProfileInputSchema,
  type AuthUserDto,
  type ExperienceLevel,
  type InterviewCategory,
  type UserStatusType,
} from '@interviewpilot/shared';
import {
  AlertCircle,
  CheckCircle2,
  Trash2,
  UserCheck,
  KeyRound,
  ShieldAlert,
} from 'lucide-react';
import {
  fetchMyProfile,
  updateMyProfile,
  submitPasswordChange,
  deleteMyAccount,
  ApiClientError,
} from '@/lib/api';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const CATEGORIES: InterviewCategory[] = ['TECHNICAL', 'HR', 'BEHAVIORAL'];

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUserDto | null>(null);
  const [loadingPage, setLoadingPage] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  // Profile state
  const [fullName, setFullName] = useState('');
  const [statusType, setStatusType] = useState<UserStatusType | ''>('');
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel | ''>('');
  const [targetRole, setTargetRole] = useState('');
  const [careerGoals, setCareerGoals] = useState('');
  const [preferredCategories, setPreferredCategories] = useState<InterviewCategory[]>([]);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Account deletion state (USR-3, USR-4)
  const [deletePassword, setDeletePassword] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetchMyProfile();
        const u = res.data.user;
        setUser(u);
        setFullName(u.profile?.fullName || '');
        setStatusType(u.profile?.statusType || '');
        setExperienceLevel(u.profile?.experienceLevel || '');
        setTargetRole(u.profile?.targetRole || '');
        setCareerGoals(u.profile?.careerGoals || '');
        setPreferredCategories(u.profile?.preferredCategories || []);
      } catch (err) {
        if (err instanceof ApiClientError && err.statusCode === 401) {
          router.push('/login');
          return;
        }
        setPageError(
          err instanceof Error ? err.message : 'Failed to load profile settings.'
        );
      } finally {
        setLoadingPage(false);
      }
    };
    void load();
  }, [router]);

  const toggleCategory = (cat: InterviewCategory) => {
    setPreferredCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMessage(null);
    setProfileError(null);

    const parsed = UpdateProfileInputSchema.safeParse({
      fullName,
      statusType: statusType || null,
      experienceLevel: experienceLevel || null,
      targetRole: targetRole || null,
      careerGoals: careerGoals || null,
      preferredCategories,
    });

    if (!parsed.success) {
      setProfileError(parsed.error.issues[0]?.message || 'Invalid profile input');
      return;
    }

    setProfileSaving(true);
    try {
      const res = await updateMyProfile(parsed.data);
      setUser(res.data.user);
      setProfileMessage('Profile saved successfully.');
    } catch (err) {
      setProfileError(
        err instanceof ApiClientError ? err.message : 'Unable to update profile.'
      );
    } finally {
      setProfileSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage(null);
    setPasswordError(null);

    const parsed = ChangePasswordInputSchema.safeParse({
      currentPassword,
      newPassword,
      confirmNewPassword,
    });

    if (!parsed.success) {
      setPasswordError(parsed.error.issues[0]?.message || 'Invalid password input');
      return;
    }

    setPasswordSaving(true);
    try {
      const res = await submitPasswordChange(parsed.data);
      setPasswordMessage(res.data.message);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err) {
      setPasswordError(
        err instanceof ApiClientError ? err.message : 'Unable to update password.'
      );
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeleteError(null);
    if (!deletePassword.trim()) {
      setDeleteError('Please enter your current password to confirm account deletion.');
      return;
    }

    setDeletingAccount(true);
    try {
      await deleteMyAccount({ password: deletePassword });
      router.push('/login');
    } catch (err) {
      setDeleteError(
        err instanceof ApiClientError
          ? err.message
          : 'Unable to delete account right now.'
      );
    } finally {
      setDeletingAccount(false);
    }
  };

  if (loadingPage) {
    return (
      <AppShell user={user}>
        <div className="space-y-4">
          <div className="h-8 w-64 rounded bg-surface-raised" />
          <div className="h-64 rounded-lg bg-surface" />
        </div>
      </AppShell>
    );
  }

  if (pageError) {
    return (
      <AppShell user={user}>
        <Card className="border-rose-500/40 bg-rose-950/20">
          <CardContent className="p-6 text-rose-300">{pageError}</CardContent>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell user={user}>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            Profile, Security &amp; Privacy Settings
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Manage your candidate profile, account password, and data retention controls.
          </p>
        </div>

        {/* Profile Card */}
        <Card className="border-border bg-surface">
          <CardHeader className="flex flex-row items-center gap-2.5">
            <UserCheck className="h-5 w-5 text-primary" />
            <CardTitle>Candidate Profile</CardTitle>
          </CardHeader>
          <CardContent>
            {profileMessage && (
              <div className="mb-4 flex items-center gap-2 rounded-md border border-emerald-500/40 bg-emerald-950/30 p-3 text-sm text-emerald-300">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{profileMessage}</span>
              </div>
            )}
            {profileError && (
              <div className="mb-4 flex items-center gap-2 rounded-md border border-rose-500/40 bg-rose-950/40 p-3 text-sm text-rose-300">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{profileError}</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-4" noValidate>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="profile-fullname">Full Name</Label>
                  <Input
                    id="profile-fullname"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    disabled={profileSaving || user?.isDemo}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="profile-role">Target Role</Label>
                  <Input
                    id="profile-role"
                    value={targetRole}
                    onChange={(e) => setTargetRole(e.target.value)}
                    disabled={profileSaving || user?.isDemo}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="profile-status">Current Status</Label>
                  <select
                    id="profile-status"
                    value={statusType}
                    onChange={(e) =>
                      setStatusType(e.target.value as UserStatusType | '')
                    }
                    disabled={profileSaving || user?.isDemo}
                    className="flex h-10 w-full rounded-[10px] border border-border bg-surface px-3 py-2 text-sm text-text-primary"
                  >
                    <option value="">Not specified</option>
                    <option value="STUDENT">Student</option>
                    <option value="PROFESSIONAL">Professional</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="profile-exp">Experience Level</Label>
                  <select
                    id="profile-exp"
                    value={experienceLevel}
                    onChange={(e) =>
                      setExperienceLevel(e.target.value as ExperienceLevel | '')
                    }
                    disabled={profileSaving || user?.isDemo}
                    className="flex h-10 w-full rounded-[10px] border border-border bg-surface px-3 py-2 text-sm text-text-primary"
                  >
                    <option value="">Not specified</option>
                    <option value="BEGINNER">Beginner</option>
                    <option value="INTERMEDIATE">Intermediate</option>
                    <option value="EXPERIENCED">Experienced</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="profile-goals">Career Goals</Label>
                <textarea
                  id="profile-goals"
                  rows={3}
                  value={careerGoals}
                  onChange={(e) => setCareerGoals(e.target.value)}
                  disabled={profileSaving || user?.isDemo}
                  className="flex w-full rounded-[10px] border border-border bg-surface px-3 py-2 text-sm text-text-primary"
                />
              </div>

              <div className="space-y-2">
                <Label>Preferred Categories</Label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((cat) => {
                    const selected = preferredCategories.includes(cat);
                    return (
                      <button
                        key={cat}
                        type="button"
                        disabled={profileSaving || user?.isDemo}
                        onClick={() => toggleCategory(cat)}
                        className={`rounded-md border px-3.5 py-2 text-xs font-semibold uppercase tracking-wider ${
                          selected
                            ? 'border-primary bg-primary/20 text-text-primary'
                            : 'border-border-strong bg-surface-raised text-text-secondary'
                        }`}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
              </div>

              <Button type="submit" disabled={profileSaving || user?.isDemo}>
                {profileSaving ? 'Saving...' : 'Save Profile'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Password Change Card */}
        <Card className="border-border bg-surface">
          <CardHeader className="flex flex-row items-center gap-2.5">
            <KeyRound className="h-5 w-5 text-secondary" />
            <CardTitle>Change Password</CardTitle>
          </CardHeader>
          <CardContent>
            {passwordMessage && (
              <div className="mb-4 flex items-center gap-2 rounded-md border border-emerald-500/40 bg-emerald-950/30 p-3 text-sm text-emerald-300">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{passwordMessage}</span>
              </div>
            )}
            {passwordError && (
              <div className="mb-4 flex items-center gap-2 rounded-md border border-rose-500/40 bg-rose-950/40 p-3 text-sm text-rose-300">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4" noValidate>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="current-password">Current Password</Label>
                  <Input
                    id="current-password"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    disabled={passwordSaving || user?.isDemo}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="new-password">New Password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={passwordSaving || user?.isDemo}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="confirm-new-password">Confirm New Password</Label>
                  <Input
                    id="confirm-new-password"
                    type="password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    disabled={passwordSaving || user?.isDemo}
                  />
                </div>
              </div>
              <Button
                type="submit"
                variant="secondary"
                disabled={passwordSaving || user?.isDemo}
              >
                {passwordSaving ? 'Updating...' : 'Update Password'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* USR-4: Exactly Three Privacy Controls (Delete Interview, Delete Document, Delete Account) */}
        <Card className="border-border bg-surface">
          <CardHeader className="flex flex-row items-center gap-2.5">
            <ShieldAlert className="h-5 w-5 text-rose-400" />
            <CardTitle>Privacy &amp; Data Deletion Controls</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-md border border-border bg-canvas p-4">
                <h4 className="text-sm font-semibold text-text-primary">
                  1. Delete an Interview
                </h4>
                <p className="mt-1 text-xs text-text-secondary">
                  Permanently remove any interview along with its transcript, evaluations, and report.
                </p>
                <Link href="/history" className="mt-3 inline-block">
                  <Button variant="secondary" size="sm">
                    Manage Interviews
                  </Button>
                </Link>
              </div>

              <div className="rounded-md border border-border bg-canvas p-4">
                <h4 className="text-sm font-semibold text-text-primary">
                  2. Delete a Document
                </h4>
                <p className="mt-1 text-xs text-text-secondary">
                  Permanently remove any uploaded CV or JD, its private storage file, summary, and RAG chunks.
                </p>
                <Link href="/documents" className="mt-3 inline-block">
                  <Button variant="secondary" size="sm">
                    Manage Documents
                  </Button>
                </Link>
              </div>
            </div>

            <div className="rounded-md border border-rose-500/30 bg-rose-950/20 p-4">
              <h4 className="text-sm font-semibold text-rose-300">
                3. Delete Account Permanently
              </h4>
              <p className="mt-1 text-xs text-text-secondary">
                Locks login immediately, deletes all stored private files, and cascades deletion of your profile, documents, interviews, and reports.
              </p>

              {deleteError && (
                <p className="mt-2 text-xs text-rose-400">{deleteError}</p>
              )}

              <form
                onSubmit={handleDeleteAccount}
                className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end"
              >
                <div className="flex-1 space-y-1">
                  <Label htmlFor="delete-account-password">
                    Confirm with Current Password
                  </Label>
                  <Input
                    id="delete-account-password"
                    type="password"
                    placeholder="Enter your password to confirm deletion"
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    disabled={deletingAccount || user?.isDemo || user?.role === 'ADMIN'}
                  />
                </div>
                <Button
                  type="submit"
                  variant="destructive"
                  disabled={deletingAccount || user?.isDemo || user?.role === 'ADMIN'}
                >
                  <Trash2 className="h-4 w-4" />
                  {deletingAccount ? 'Deleting...' : 'Delete Account'}
                </Button>
              </form>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
