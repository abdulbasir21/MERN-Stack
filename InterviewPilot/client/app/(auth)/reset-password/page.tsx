'use client';

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ResetPasswordInputSchema } from '@interviewpilot/shared';
import { Lock, CheckCircle2, AlertCircle } from 'lucide-react';
import { submitPasswordReset, ApiClientError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const initialToken = searchParams.get('token') || '';

  const [token, setToken] = useState(initialToken);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});
    setFormError(null);

    const parsed = ResetPasswordInputSchema.safeParse({
      token,
      password,
      confirmPassword,
    });
    if (!parsed.success) {
      const nextErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] || 'form');
        if (!nextErrors[key]) nextErrors[key] = issue.message;
      }
      setFieldErrors(nextErrors);
      return;
    }

    setLoading(true);
    try {
      const res = await submitPasswordReset(parsed.data);
      setSuccessMessage(res.data.message);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setFormError(err.message);
      } else {
        setFormError('Unable to reset password right now.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (successMessage) {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-2.5 rounded-md border border-emerald-500/40 bg-emerald-950/30 p-3.5 text-sm text-emerald-300">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
        <Link href="/login" className="block">
          <Button className="w-full">Continue to Sign In</Button>
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {formError && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-md border border-rose-500/40 bg-rose-950/40 p-3 text-sm text-rose-300"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      {!initialToken && (
        <div className="space-y-1.5">
          <Label htmlFor="reset-token">Reset Token</Label>
          <Input
            id="reset-token"
            type="text"
            placeholder="Paste reset token"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            disabled={loading}
          />
          {fieldErrors.token && (
            <p className="text-xs text-rose-400">{fieldErrors.token}</p>
          )}
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="reset-password">New Password</Label>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-text-muted" />
          <Input
            id="reset-password"
            type="password"
            autoComplete="new-password"
            placeholder="At least 8 characters, 1 letter & 1 number"
            className="pl-9"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
          />
        </div>
        {fieldErrors.password && (
          <p className="text-xs text-rose-400">{fieldErrors.password}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="reset-confirm-password">Confirm New Password</Label>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-text-muted" />
          <Input
            id="reset-confirm-password"
            type="password"
            autoComplete="new-password"
            placeholder="Re-enter your new password"
            className="pl-9"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={loading}
          />
        </div>
        {fieldErrors.confirmPassword && (
          <p className="text-xs text-rose-400">{fieldErrors.confirmPassword}</p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Resetting password...' : 'Reset Password'}
      </Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <div className="mb-8 text-center">
        <Link href="/" className="text-xl font-bold tracking-tight text-text-primary">
          Interview<span className="text-secondary">Pilot</span>
        </Link>
        <p className="mt-2 text-sm text-text-secondary">Choose a new account password</p>
      </div>

      <Card className="border-border bg-surface">
        <CardHeader>
          <CardTitle>Reset Password</CardTitle>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<p className="text-sm text-text-secondary">Loading...</p>}>
            <ResetPasswordForm />
          </Suspense>
        </CardContent>
      </Card>
    </main>
  );
}
