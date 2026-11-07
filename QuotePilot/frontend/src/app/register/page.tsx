'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { apiClient, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';

function RegisterForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { login } = useAuth();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || undefined;
  const companyName = searchParams.get('company') || undefined;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Client-side validation per SRS §2
    if (name.trim().length < 2) {
      setErrorMessage('Name must be at least 2 characters.');
      return;
    }

    if (password.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }

    if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
      setErrorMessage('Password must contain at least one letter and one number.');
      return;
    }

    setIsLoading(true);

    try {
      const payload: Record<string, string> = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
      };
      if (phone.trim()) {
        payload.phone = phone.trim();
      }

      const res = await apiClient<{ user: any; token: string }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      // Auto login on successful registration
      login(res.data.token, res.data.user, redirectUrl);
    } catch (err: any) {
      if (err instanceof ApiError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Registration failed. Please verify your connection.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[520px] mx-auto py-12 px-4">
      {/* Context Preservation Banner (If arriving from Request a Quote flow, FR-INQ-002) */}
      {companyName && (
        <div className="mb-6 bg-paper-sunken border border-paper-border rounded-card p-4 flex gap-3 text-sm">
          <div className="w-5 h-5 rounded-full bg-brand-teal text-white flex items-center justify-center shrink-0 text-xs font-bold mt-0.5">
            i
          </div>
          <div>
            <h4 className="font-semibold text-brand-teal leading-tight">
              Create an account to submit your quote request to {companyName}
            </h4>
            <p className="text-xs text-ink-secondary mt-1">
              Your inquiry details are safely queued and will be sent automatically upon registration.
            </p>
          </div>
        </div>
      )}

      {/* Main Registration Card */}
      <Card variant="surface" className="p-8 shadow-paper">
        <div className="mb-6 space-y-1.5">
          <div className="flex items-center gap-2 mb-1">
            <span className="h-2 w-2 rounded-full bg-brand-teal" />
            <span className="text-xs font-semibold uppercase tracking-wider text-ink-secondary">
              Customer Account
            </span>
          </div>
          <h1 className="font-serif text-3xl font-semibold text-ink-primary tracking-tight">
            Create your account
          </h1>
          <p className="text-sm text-ink-secondary leading-relaxed">
            Track inquiries, receive itemized quotation slips, and manage verified agency proposals.
          </p>
        </div>

        {errorMessage && (
          <div className="mb-5 p-3.5 bg-semantic-error-tint border border-semantic-error/20 rounded-control text-xs text-semantic-error flex items-center gap-2">
            <span className="font-bold">•</span>
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Full Name *"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Ali Khan"
            required
            autoComplete="name"
          />

          <Input
            label="Email Address *"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ali.khan@example.com"
            required
            autoComplete="email"
          />

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-medium text-ink-secondary">
                Password * (min. 8 characters, letter + number)
              </label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-xs text-brand-teal hover:underline font-medium"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="new-password"
              className="w-full h-10 px-3.5 bg-paper-surface border border-paper-border rounded-control text-sm text-ink-primary placeholder:text-ink-muted transition-colors focus:outline-none focus:ring-2 focus:ring-brand-teal focus:border-transparent"
            />
          </div>

          <Input
            label="Phone Number (Optional)"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+92 300 1234567"
            helperText="Used for formal inquiry notifications"
            autoComplete="tel"
          />

          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isLoading}
            className="w-full mt-4"
          >
            Create Customer Account
          </Button>
        </form>

        <div className="mt-8 pt-6 border-t border-paper-border space-y-3 text-center text-xs text-ink-secondary">
          <p>
            Already have an account?{' '}
            <Link
              href={`/login${redirectUrl ? `?redirect=${encodeURIComponent(redirectUrl)}` : ''}`}
              className="text-brand-teal font-semibold hover:underline"
            >
              Sign in
            </Link>
          </p>
          <p>
            Are you a service agency?{' '}
            <Link
              href="/register-company"
              className="text-brand-terracotta font-semibold hover:underline"
            >
              Register your company
            </Link>
          </p>
        </div>
      </Card>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-paper-canvas">
          <div className="w-8 h-8 border-2 border-brand-teal border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
