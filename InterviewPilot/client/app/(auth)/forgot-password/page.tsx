'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ForgotPasswordInputSchema } from '@interviewpilot/shared';
import { Mail, CheckCircle2, AlertCircle } from 'lucide-react';
import { requestPasswordResetEmail, ApiClientError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submittedMessage, setSubmittedMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldError(null);
    setFormError(null);

    const parsed = ForgotPasswordInputSchema.safeParse({ email });
    if (!parsed.success) {
      setFieldError(parsed.error.issues[0]?.message || 'Enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      const res = await requestPasswordResetEmail(parsed.data);
      setSubmittedMessage(res.data.message);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setFormError(err.message);
      } else {
        setFormError('Unable to send password reset request right now.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <div className="mb-8 text-center">
        <Link href="/" className="text-xl font-bold tracking-tight text-text-primary">
          Interview<span className="text-secondary">Pilot</span>
        </Link>
        <p className="mt-2 text-sm text-text-secondary">
          Request a 30-minute single-use password reset link
        </p>
      </div>

      <Card className="border-border bg-surface">
        <CardHeader>
          <CardTitle>Forgot Password</CardTitle>
        </CardHeader>
        <CardContent>
          {submittedMessage ? (
            <div className="space-y-4">
              <div className="flex items-start gap-2.5 rounded-md border border-emerald-500/40 bg-emerald-950/30 p-3.5 text-sm text-emerald-300">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{submittedMessage}</span>
              </div>
              <Link href="/login" className="block">
                <Button variant="secondary" className="w-full">
                  Return to Sign In
                </Button>
              </Link>
            </div>
          ) : (
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

              <div className="space-y-1.5">
                <Label htmlFor="forgot-email">Email Address</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-text-muted" />
                  <Input
                    id="forgot-email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@company.com"
                    className="pl-9"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                  />
                </div>
                {fieldError && <p className="text-xs text-rose-400">{fieldError}</p>}
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Sending link...' : 'Send Reset Link'}
              </Button>

              <p className="mt-4 text-center text-sm text-text-secondary">
                Remembered your password?{' '}
                <Link href="/login" className="font-medium text-primary hover:underline">
                  Sign in
                </Link>
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
