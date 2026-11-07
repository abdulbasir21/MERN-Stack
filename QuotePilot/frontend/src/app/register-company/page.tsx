'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { apiClient, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

const CATEGORIES = [
  'Web Development',
  'Interior Design',
  'Logo Design',
  'Accounting',
  'Digital Marketing',
  'Content Writing',
  'Architecture & 3D',
  'App Development',
];

export default function RegisterCompanyPage() {
  const [companyName, setCompanyName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [mainCategory, setMainCategory] = useState(CATEGORIES[0]);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Frontend validation per SRS §2
    if (companyName.trim().length < 2) {
      setErrorMessage('Company name must be at least 2 characters.');
      return;
    }
    if (ownerName.trim().length < 2) {
      setErrorMessage('Owner name must be at least 2 characters.');
      return;
    }
    if (password.length < 8 || !/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
      setErrorMessage('Password must be at least 8 characters and contain both letters and numbers.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await apiClient<{ company: any; user: any; token: string }>('/companies/register', {
        method: 'POST',
        body: JSON.stringify({
          companyName: companyName.trim(),
          ownerName: ownerName.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          city: city.trim(),
          mainCategory,
          password,
        }),
      });

      // Login as company admin and navigate to company status page
      login(res.data.token, res.data.user, '/company/status');
    } catch (err: any) {
      if (err instanceof ApiError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Registration failed. Please check your network connection.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-paper-canvas text-ink-primary">
      {/* Top Header */}
      <header className="border-b border-paper-border bg-paper-surface">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-control bg-brand-teal text-white flex items-center justify-center font-serif text-lg font-bold shadow-sm">
              Q
            </div>
            <div className="flex flex-col">
              <span className="font-serif text-lg font-bold leading-none text-ink-primary">
                QuotePilot
              </span>
              <span className="text-[10px] uppercase tracking-wider text-ink-secondary mt-0.5">
                Commercial Desk
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <span className="text-xs text-ink-secondary hidden sm:inline">Already registered?</span>
            <Link href="/login">
              <Button variant="secondary" size="sm">
                Log In
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Canvas */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* Breadcrumb & Intro */}
        <div className="max-w-4xl mb-10">
          <Badge variant="new" className="mb-3">
            Institutional Provider Onboarding • 2025 Standard
          </Badge>
          <h1 className="font-serif text-3xl sm:text-4xl font-semibold tracking-tight text-ink-primary mb-3">
            Register your company on QuotePilot
          </h1>
          <p className="text-base text-ink-secondary leading-relaxed">
            Join our curated network of verified service studios and independent agencies. Receive structured inquiries, issue binding itemized quotation slips, and eliminate scope ambiguity.
          </p>
        </div>

        {/* 2-Column Grid: Form (65%) + Sidebar (35%) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Form Docket */}
          <div className="lg:col-span-8">
            <Card variant="surface" className="p-8 shadow-paper">
              <div className="border-b border-paper-border pb-4 mb-6 flex items-center justify-between">
                <div>
                  <h2 className="font-serif text-xl font-semibold text-ink-primary">
                    Commercial Onboarding Docket
                  </h2>
                  <p className="text-xs text-ink-secondary mt-0.5">
                    Formal intake protocol for enterprise studios & independent firms
                  </p>
                </div>
                <Badge variant="default">Form ID: QP-VET</Badge>
              </div>

              {errorMessage && (
                <div className="mb-6 p-3.5 bg-semantic-error-tint border border-semantic-error/20 rounded-control text-xs text-semantic-error flex items-center gap-2">
                  <span className="font-bold">•</span>
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Section 1: Business Identity */}
                <div className="space-y-4">
                  <div className="border-b border-paper-border pb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-brand-teal">
                      1. Business Identity
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <Input
                        label="Registered Company / Studio Name *"
                        type="text"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="e.g. Pixel & Pine Studio (Pvt.) Ltd."
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-ink-secondary mb-1.5">
                        Primary Service Category *
                      </label>
                      <select
                        value={mainCategory}
                        onChange={(e) => setMainCategory(e.target.value)}
                        className="w-full h-10 px-3 bg-paper-surface border border-paper-border rounded-control text-sm text-ink-primary focus:outline-none focus:ring-2 focus:ring-brand-teal"
                        required
                      >
                        {CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <Input
                        label="Operational City / Base *"
                        type="text"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="e.g. Lahore / Karachi / Islamabad"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Section 2: Owner / Administrator Credentials */}
                <div className="space-y-4 pt-4">
                  <div className="border-b border-paper-border pb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-brand-teal">
                      2. Administrator Account
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Input
                        label="Owner / Managing Director Name *"
                        type="text"
                        value={ownerName}
                        onChange={(e) => setOwnerName(e.target.value)}
                        placeholder="e.g. Tariq Malik"
                        required
                      />
                    </div>

                    <div>
                      <Input
                        label="Official Work Email *"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="tariq@pixelandpine.com"
                        required
                      />
                    </div>

                    <div>
                      <Input
                        label="Phone / WhatsApp Number *"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+92 321 9876543"
                        required
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-medium text-ink-secondary">
                          Password * (min. 8 chars, letters & numbers)
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
                        className="w-full h-10 px-3.5 bg-paper-surface border border-paper-border rounded-control text-sm text-ink-primary focus:outline-none focus:ring-2 focus:ring-brand-teal"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-paper-border flex flex-col sm:flex-row items-center justify-between gap-4">
                  <p className="text-xs text-ink-muted">
                    Submitting places your company into verification status.
                  </p>
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    isLoading={isLoading}
                    className="w-full sm:w-auto px-8"
                  >
                    Submit Company for Verification
                  </Button>
                </div>
              </form>
            </Card>
          </div>

          {/* Right Column: Assurances & Review Clock */}
          <div className="lg:col-span-4 space-y-6">
            <Card variant="sunken" className="p-6">
              <h3 className="font-serif text-lg font-semibold text-ink-primary mb-3">
                Review & Verification Clock
              </h3>
              <p className="text-xs text-ink-secondary leading-relaxed mb-4">
                All provider registrations are manually verified by QuotePilot administrators to guarantee client trust and enforce service standards.
              </p>
              <div className="p-3 bg-paper-surface border border-paper-border rounded-control text-xs text-ink-primary flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-semantic-warning" />
                <span>Typical review turnaround: <strong>12 to 24 hours</strong></span>
              </div>
            </Card>

            <Card variant="surface" className="p-6">
              <h4 className="text-xs uppercase tracking-wider text-ink-secondary font-semibold mb-3">
                What happens after registration?
              </h4>
              <ol className="space-y-3 text-xs text-ink-secondary">
                <li className="flex gap-2.5">
                  <span className="font-bold text-brand-teal">1.</span>
                  <span><strong>Pending Review:</strong> Your account is created and application submitted.</span>
                </li>
                <li className="flex gap-2.5">
                  <span className="font-bold text-brand-teal">2.</span>
                  <span><strong>Platform Approval:</strong> Platform admin reviews business details and city standing.</span>
                </li>
                <li className="flex gap-2.5">
                  <span className="font-bold text-brand-teal">3.</span>
                  <span><strong>Profile & Services Setup:</strong> Once approved, add services, portfolio, and requirements checklists.</span>
                </li>
                <li className="flex gap-2.5">
                  <span className="font-bold text-brand-teal">4.</span>
                  <span><strong>Go Live:</strong> Receive inquiries and send binding quotation dockets.</span>
                </li>
              </ol>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
