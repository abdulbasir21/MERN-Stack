'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Clock,
  CheckCircle2,
  Lock,
  RefreshCw,
  Home,
  Building2,
  ShieldCheck,
  ShieldAlert,
  AlertOctagon,
  LogOut,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { apiClient, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

export default function CompanyStatusPage() {
  const { user, refreshUser, logout } = useAuth();
  const [company, setCompany] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Edit fields for rejected resubmit
  const [editName, setEditName] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resubmitSuccess, setResubmitSuccess] = useState(false);

  const router = useRouter();

  const fetchCompanyStatus = async (manualCheck = false) => {
    if (manualCheck) setIsRefreshing(true);
    setStatusMessage(null);
    try {
      const res = await apiClient<{ company: any }>('/company/me');
      const co = res.data.company;
      setCompany(co);
      setEditName(co.name || '');
      setEditCity(co.city || '');
      setEditPhone(co.contactPhone || '');

      if (co.status === 'approved') {
        setStatusMessage('Your company is approved! Redirecting to studio workspace...');
        setTimeout(() => {
          router.push('/company/inquiries');
        }, 1200);
      } else if (manualCheck) {
        setStatusMessage('Status checked: Application is still pending compliance review. Check back shortly.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Unable to load company status.');
    } finally {
      setIsLoading(false);
      if (manualCheck) setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCompanyStatus();
  }, [router]);

  const handleResubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      await apiClient('/company/me', {
        method: 'PATCH',
        body: JSON.stringify({
          name: editName.trim(),
          city: editCity.trim(),
          contactPhone: editPhone.trim(),
        }),
      });

      const res = await apiClient<{ company: any }>('/company/me/resubmit', {
        method: 'POST',
      });

      setCompany(res.data.company);
      setResubmitSuccess(true);
      await refreshUser();
    } catch (err: any) {
      if (err instanceof ApiError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Failed to resubmit application.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper-canvas">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-brand-teal border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-mono text-ink-secondary">Loading studio onboarding status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper-canvas text-ink-primary flex flex-col">
      {/* 1. SECP Status Trust Bar */}
      <aside className="bg-paper-100 border-b border-paper-200 px-4 sm:px-8 py-2 text-[11px] font-mono text-stone-600">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 inline-block animate-pulse" />
            <span className="font-semibold text-stone-900">Restricted Provider Onboarding Mode</span>
            <span className="text-stone-300">•</span>
            <span>Commercial Inquiries Gated</span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-teal-800" />
            <span>SECP Institutional Review in Progress</span>
          </div>
        </div>
      </aside>

      {/* 2. Top Header */}
      <header className="border-b border-paper-border bg-white sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-control bg-brand-teal flex items-center justify-center text-white font-serif font-bold text-sm">
                Q
              </div>
              <span className="font-serif text-lg font-bold text-ink-primary">QuotePilot</span>
            </Link>
            <span className="text-stone-300">/</span>
            <span className="text-xs font-mono text-ink-muted">Studio Onboarding Portal</span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 text-xs font-mono">
            <Link href="/companies">
              <Button variant="secondary" size="sm" className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-stone-600" />
                <span>Browse Marketplace</span>
              </Button>
            </Link>
            <Button variant="ghost" size="sm" onClick={logout} className="text-stone-500 hover:text-stone-900 flex items-center gap-1">
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </Button>
          </div>
        </div>
      </header>

      {/* 3. Main Body */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10 flex-1 w-full space-y-6">
        {statusMessage && (
          <div className="p-4 rounded-xl bg-teal-50 border border-teal-200 text-teal-900 text-xs font-mono flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-teal-800 shrink-0" />
              <span>{statusMessage}</span>
            </div>
            <button onClick={() => setStatusMessage(null)} className="text-teal-700 hover:text-teal-900 font-bold">
              ×
            </button>
          </div>
        )}

        {/* ===================== STATUS: PENDING ===================== */}
        {company?.status === 'pending' && (
          <div className="space-y-6">
            {/* Primary Status Card */}
            <Card variant="surface" className="p-6 sm:p-8 shadow-paper text-center">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center mx-auto mb-4 shadow-xs">
                <Clock className="w-7 h-7 text-amber-600 animate-pulse" />
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold bg-amber-50 text-amber-900 border border-amber-300 mb-3">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span>Application Status: Pending Platform Verification</span>
              </div>

              <h1 className="font-serif text-2xl sm:text-3xl font-bold text-ink-primary mb-2">
                Your Studio Application is Under Review
              </h1>
              <p className="text-xs sm:text-sm text-ink-secondary max-w-xl mx-auto leading-relaxed mb-6 font-mono">
                Our SECP compliance desk is currently reviewing the registration dossier for{' '}
                <strong className="text-stone-900">{company.name}</strong>. Verification is typically completed within 12 to 24 business hours.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => fetchCompanyStatus(true)}
                  disabled={isRefreshing}
                  className="font-mono text-xs flex items-center gap-2 bg-teal-900 hover:bg-teal-950 font-bold"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                  <span>{isRefreshing ? 'Verifying with Registry...' : 'Check Approval Status Now'}</span>
                </Button>

                <Link href="/">
                  <Button variant="secondary" size="md" className="font-mono text-xs flex items-center gap-1.5">
                    <Home className="w-3.5 h-3.5 text-stone-600" />
                    <span>Return to Home</span>
                  </Button>
                </Link>
              </div>
            </Card>

            {/* Two-Column Detail Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column: Registered Dossier */}
              <Card variant="surface" className="p-6 shadow-paper space-y-4">
                <div className="flex items-center justify-between border-b border-paper-border pb-3">
                  <h3 className="font-serif font-bold text-sm text-stone-900">
                    Registration Dossier Snapshot
                  </h3>
                  <Badge variant="pending">Submitted</Badge>
                </div>

                <div className="space-y-2.5 text-xs font-mono">
                  <div className="flex justify-between py-1 border-b border-paper-100">
                    <span className="text-ink-muted">Company Name:</span>
                    <span className="font-semibold text-ink-primary text-right">{company.name}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-paper-100">
                    <span className="text-ink-muted">Discipline Category:</span>
                    <span className="font-semibold text-ink-primary text-right">{company.mainCategory}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-paper-100">
                    <span className="text-ink-muted">City / Jurisdiction:</span>
                    <span className="font-semibold text-ink-primary text-right">{company.city}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-paper-100">
                    <span className="text-ink-muted">Contact Phone:</span>
                    <span className="font-semibold text-ink-primary text-right">{company.contactPhone || '—'}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-ink-muted">Submitted Date:</span>
                    <span className="font-semibold text-ink-primary text-right">
                      {new Date(company.submittedAt || Date.now()).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </Card>

              {/* Right Column: Feature Availability / Restriction Map */}
              <Card variant="surface" className="p-6 shadow-paper space-y-4">
                <div className="flex items-center justify-between border-b border-paper-border pb-3">
                  <h3 className="font-serif font-bold text-sm text-stone-900">
                    Workspace Feature Availability
                  </h3>
                  <span className="text-[10px] font-mono text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    Restricted Mode
                  </span>
                </div>

                <ul className="space-y-3 text-xs font-mono">
                  <li className="flex items-start gap-2.5 text-stone-700">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block text-stone-900">Studio Registration</span>
                      <span className="text-stone-500 text-[11px]">Dossier encrypted &amp; logged in platform database</span>
                    </div>
                  </li>

                  <li className="flex items-start gap-2.5 text-stone-500">
                    <Lock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block text-stone-900">Inbound Inquiries &amp; Quotation Pipeline</span>
                      <span className="text-stone-500 text-[11px]">Locked • Activates immediately upon admin approval</span>
                    </div>
                  </li>

                  <li className="flex items-start gap-2.5 text-stone-500">
                    <Lock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block text-stone-900">Services &amp; AI Checklist Builder</span>
                      <span className="text-stone-500 text-[11px]">Locked • Available to configure once approved</span>
                    </div>
                  </li>

                  <li className="flex items-start gap-2.5 text-stone-500">
                    <Lock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block text-stone-900">Public Marketplace Directory Listing</span>
                      <span className="text-stone-500 text-[11px]">Hidden from buyer search per rule BR-04 until verified</span>
                    </div>
                  </li>
                </ul>
              </Card>
            </div>
          </div>
        )}

        {/* ===================== STATUS: REJECTED ===================== */}
        {company?.status === 'rejected' && (
          <Card variant="surface" className="p-8 shadow-paper">
            <div className="flex items-center gap-2 mb-4">
              <Badge variant="rejected">Action Required</Badge>
              <span className="text-xs font-mono text-ink-secondary">Application Amendments Needed</span>
            </div>

            <h1 className="font-serif text-2xl font-semibold text-ink-primary mb-2">
              Your Application Requires Updates
            </h1>
            <p className="text-sm text-ink-secondary mb-6">
              The compliance reviewer provided the feedback below. You can update your registration details and resubmit for verification.
            </p>

            {company.rejectionReason && (
              <div className="mb-6 p-4 rounded-control bg-semantic-error-tint border border-semantic-error/20 text-xs text-semantic-error font-mono">
                <strong>Reviewer Feedback:</strong> &ldquo;{company.rejectionReason}&rdquo;
              </div>
            )}

            {errorMessage && (
              <div className="mb-4 p-3 bg-semantic-error-tint border border-semantic-error/20 rounded-control text-xs text-semantic-error">
                {errorMessage}
              </div>
            )}

            {resubmitSuccess && (
              <div className="mb-4 p-3 bg-semantic-success-tint border border-semantic-success/20 rounded-control text-xs text-semantic-success flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Application resubmitted successfully. Status is now pending review.</span>
              </div>
            )}

            {/* Amendment Form */}
            <form onSubmit={handleResubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase text-ink-secondary mb-1">Company Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-paper-border rounded-control focus:outline-none focus:ring-1 focus:ring-brand-teal"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-ink-secondary mb-1">City / Jurisdiction</label>
                <input
                  type="text"
                  value={editCity}
                  onChange={(e) => setEditCity(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-paper-border rounded-control focus:outline-none focus:ring-1 focus:ring-brand-teal"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-ink-secondary mb-1">Contact Phone</label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-paper-border rounded-control focus:outline-none focus:ring-1 focus:ring-brand-teal"
                  required
                />
              </div>

              <div className="pt-2 flex gap-3">
                <Button type="submit" variant="primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Submitting Amendments...' : 'Resubmit Application for Approval'}
                </Button>
                <Button type="button" variant="ghost" onClick={logout}>
                  Sign Out
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* ===================== STATUS: BLOCKED ===================== */}
        {company?.status === 'blocked' && (
          <Card variant="surface" className="p-8 shadow-paper text-center">
            <div className="w-14 h-14 rounded-full bg-semantic-error-tint text-semantic-error flex items-center justify-center mx-auto mb-4">
              <ShieldAlert className="w-8 h-8 text-semantic-error" />
            </div>
            <Badge variant="blocked" className="mb-3">
              Account Suspended
            </Badge>
            <h1 className="font-serif text-2xl font-semibold text-semantic-error mb-2">
              Company Registration Permanently Blocked
            </h1>
            <p className="text-sm text-ink-secondary max-w-md mx-auto leading-relaxed mb-6 font-mono text-xs">
              This company account has been permanently suspended by platform administration.
              {company.rejectionReason && (
                <span className="block mt-2 italic text-ink-primary">
                  Reason: &ldquo;{company.rejectionReason}&rdquo;
                </span>
              )}
            </p>
            <Button variant="ghost" size="sm" onClick={logout}>
              Sign Out
            </Button>
          </Card>
        )}
      </main>
    </div>
  );
}
