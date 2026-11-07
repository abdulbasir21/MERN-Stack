'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { apiClient, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { login } = useAuth();
  const searchParams = useSearchParams();
  const rawRedirect = searchParams.get('redirect') || undefined;
  // Clean redirect URL: ignore '/' or auth routes so users land on their dashboard
  const redirectUrl =
    rawRedirect && rawRedirect !== '/' && !rawRedirect.startsWith('/login') && !rawRedirect.startsWith('/register')
      ? rawRedirect
      : undefined;
  const companyName = searchParams.get('company') || undefined;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const res = await apiClient<{ user: any; token: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      login(res.data.token, res.data.user, redirectUrl);
    } catch (err: any) {
      if (err instanceof ApiError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Unable to sign in. Please verify your connection.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = (demoEmail: string, demoPass: string, defaultPath?: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setIsLoading(true);
    setErrorMessage(null);
    apiClient<{ user: any; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: demoEmail, password: demoPass }),
    })
      .then((res) => {
        // Instant demo personas always navigate straight to their role-specific dashboard
        login(res.data.token, res.data.user, defaultPath);
      })
      .catch((err: any) => {
        setIsLoading(false);
        if (err instanceof ApiError) {
          setErrorMessage(err.message);
        } else {
          setErrorMessage('Quick login failed.');
        }
      });
  };

  return (
    <div className="w-full max-w-[500px] mx-auto py-10 px-4">
      {/* Quick Demo Access Bar */}
      <div className="mb-6 p-4 rounded-2xl bg-white border border-paper-border shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-mono uppercase tracking-wider text-brand-teal font-bold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-brand-teal animate-pulse" />
            Instant One-Click Demo Personas
          </span>
          <span className="text-[10px] font-mono text-ink-muted">Pre-Seeded Real Data</span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs font-mono">
          <button
            type="button"
            onClick={() => handleQuickLogin('zain.customer@example.com', 'Password123!', '/inquiries')}
            className="p-2.5 rounded-xl border border-paper-border bg-paper-canvas hover:bg-brand-teal/5 hover:border-brand-teal/40 text-left transition-all group"
          >
            <div className="font-semibold text-ink-primary group-hover:text-brand-teal">Client / Buyer</div>
            <div className="text-[10px] text-ink-muted">Zain Ahmed</div>
          </button>
          <button
            type="button"
            onClick={() => handleQuickLogin('tariq.pixel@example.com', 'Password123!', '/company/inquiries')}
            className="p-2.5 rounded-xl border border-paper-border bg-paper-canvas hover:bg-brand-teal/5 hover:border-brand-teal/40 text-left transition-all group"
          >
            <div className="font-semibold text-ink-primary group-hover:text-brand-teal">Pixel & Pine Studio</div>
            <div className="text-[10px] text-ink-muted">Web Dev Provider</div>
          </button>
          <button
            type="button"
            onClick={() => handleQuickLogin('ayla.hearth@example.com', 'Password123!', '/company/inquiries')}
            className="p-2.5 rounded-xl border border-paper-border bg-paper-canvas hover:bg-brand-teal/5 hover:border-brand-teal/40 text-left transition-all group"
          >
            <div className="font-semibold text-ink-primary group-hover:text-brand-teal">Hearth Interiors</div>
            <div className="text-[10px] text-ink-muted">Ayla Hearth · Interior Studio</div>
          </button>
          <button
            type="button"
            onClick={() => handleQuickLogin('admin@quotepilot.com', 'AdminPassword123!', '/admin/companies')}
            className="p-2.5 rounded-xl border border-paper-border bg-paper-canvas hover:bg-brand-teal/5 hover:border-brand-teal/40 text-left transition-all group"
          >
            <div className="font-semibold text-ink-primary group-hover:text-brand-teal">Platform Admin</div>
            <div className="text-[10px] text-ink-muted">SECP Verification Desk</div>
          </button>
        </div>
      </div>

      {/* Preserved Context Banner (If arriving from Request a Quote flow, FR-INQ-002) */}
      {companyName && (
        <div className="mb-6 bg-paper-sunken border border-paper-border rounded-card p-4 flex gap-3 text-sm">
          <div className="w-5 h-5 rounded-full bg-brand-teal text-white flex items-center justify-center shrink-0 text-xs font-bold mt-0.5">
            i
          </div>
          <div>
            <h4 className="font-semibold text-brand-teal leading-tight">
              Log in to submit your quote request to {companyName}
            </h4>
            <p className="text-xs text-ink-secondary mt-1">
              Your drafted project description and requirements are safely preserved and will be sent immediately upon sign in.
            </p>
          </div>
        </div>
      )}

      {/* Main Paper Card */}
      <Card variant="surface" className="p-8 shadow-paper">
        <div className="mb-6 space-y-1.5">
          <h1 className="font-serif text-3xl font-semibold text-ink-primary tracking-tight">
            Welcome back
          </h1>
          <p className="text-sm text-ink-secondary leading-relaxed">
            Sign in with your email to access your inquiries, quotations, and commercial workspace.
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
            label="Email Address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@company.com"
            required
            autoComplete="email"
          />

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-medium text-ink-secondary">
                Password
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
              autoComplete="current-password"
              className="w-full h-10 px-3.5 bg-paper-surface border border-paper-border rounded-control text-sm text-ink-primary placeholder:text-ink-muted transition-colors focus:outline-none focus:ring-2 focus:ring-brand-teal focus:border-transparent"
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isLoading}
            className="w-full mt-2"
          >
            Sign In to Workspace
          </Button>
        </form>

        <div className="mt-8 pt-6 border-t border-paper-border space-y-3 text-center text-xs text-ink-secondary">
          <p>
            New to QuotePilot?{' '}
            <Link
              href={`/register${redirectUrl ? `?redirect=${encodeURIComponent(redirectUrl)}` : ''}`}
              className="text-brand-teal font-semibold hover:underline"
            >
              Create a customer account
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

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-paper-canvas">
          <div className="w-8 h-8 border-2 border-brand-teal border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
