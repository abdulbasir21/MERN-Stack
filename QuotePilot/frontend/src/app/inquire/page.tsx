'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Clock,
  Coins,
  FileText,
  Send,
  Check,
  Briefcase,
} from 'lucide-react';

interface ServiceDetail {
  id: string;
  _id?: string;
  title: string;
  category: string;
  description?: string;
  startingPrice?: number;
  pricingUnit?: string;
  deliveryTimeEstimate?: string;
  requirementsChecklist?: Array<{
    item: string;
    helpText?: string;
    required: boolean;
    order: number;
  }>;
}

interface CompanyDetail {
  id: string;
  _id?: string;
  name: string;
  slug: string;
  city: string;
  mainCategory: string;
  ratingAverage: number;
  ratingCount: number;
  logo?: { url: string };
}

interface ValidationResponse {
  isComplete: boolean;
  pass?: boolean;
  missing: string[];
  message?: string;
  notes?: string;
  skipped: boolean;
  canSubmitAnyway: boolean;
  round?: number;
}

function InquireContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const serviceId = searchParams.get('serviceId');
  const companySlug = searchParams.get('companySlug');

  const { user, token, isLoading: authLoading } = useAuth();
  const isAuthenticated = !!user;

  const [company, setCompany] = useState<CompanyDetail | null>(null);
  const [service, setService] = useState<ServiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  // Form states
  const [description, setDescription] = useState('');
  const [budget, setBudget] = useState<string>('');
  const [deadline, setDeadline] = useState('');
  const [round, setRound] = useState(0);
  const [auditedDescription, setAuditedDescription] = useState<string>('');
  const [clientRequestId] = useState(() =>
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `req_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
  );

  // AI Validation state
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResponse | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch company & service details
  useEffect(() => {
    async function loadData() {
      if (!companySlug || !serviceId) {
        setPageError('A valid company and service must be selected to request a quotation.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const [compRes, srvRes] = await Promise.all([
          api.get<{ company: CompanyDetail }>(`/companies/${companySlug}`),
          api.get<{ services: ServiceDetail[] }>(`/companies/${companySlug}/services`),
        ]);

        setCompany(compRes.data.company);
        const found = srvRes.data.services.find(
          (s) => s.id === serviceId || (s as { _id?: string })._id === serviceId
        );
        if (!found) {
          setPageError('Selected service is not currently available for this company.');
        } else {
          setService(found);
        }
      } catch (err: unknown) {
        const error = err as { message?: string };
        setPageError(error.message || 'Failed to load service or company details.');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [companySlug, serviceId]);

  // Execute AI intake audit (FR-AI-001)
  const runValidation = async (customRound?: number): Promise<ValidationResponse | null> => {
    if (!serviceId) return null;
    if (description.trim().length < 20) {
      setSubmitError('Please write at least 20 characters describing your project requirements.');
      return null;
    }

    setIsValidating(true);
    setSubmitError(null);

    const nextRound = customRound !== undefined ? customRound : round + 1;
    try {
      const res = await api.post<ValidationResponse>('/inquiries/validate', {
        serviceId,
        description: description.trim(),
        budget: budget ? parseFloat(budget) : undefined,
        deadline: deadline || undefined,
        round: nextRound,
      });

      const isPass = res.data.isComplete ?? res.data.pass ?? false;
      const msg = res.data.message || res.data.notes || '';

      const normalized: ValidationResponse = {
        ...res.data,
        isComplete: isPass,
        pass: isPass,
        message: msg,
        notes: msg,
        missing: res.data.missing || [],
        canSubmitAnyway: res.data.canSubmitAnyway || nextRound >= 2,
        round: nextRound,
      };

      setValidationResult(normalized);
      setRound(nextRound);
      setAuditedDescription(description.trim());
      return normalized;
    } catch (err: unknown) {
      const error = err as { message?: string };
      // Graceful local fallback if network/API fails per FR-AI-004
      const fallback: ValidationResponse = {
        isComplete: true,
        pass: true,
        missing: [],
        message: 'Intake brief recorded. Ready for provider review.',
        notes: 'Intake brief recorded. Ready for provider review.',
        skipped: true,
        canSubmitAnyway: true,
        round: nextRound,
      };
      setValidationResult(fallback);
      setRound(nextRound);
      setAuditedDescription(description.trim());
      return fallback;
    } finally {
      setIsValidating(false);
    }
  };

  const handleValidate = async () => {
    await runValidation();
  };

  // Handle final submission with automatic audit enforcement (Bug 2)
  const handleSubmit = async (override = false) => {
    if (!isAuthenticated) {
      router.push(`/login?returnTo=${encodeURIComponent(`/inquire?serviceId=${serviceId}&companySlug=${companySlug}`)}`);
      return;
    }

    if (user?.role !== 'customer') {
      setSubmitError('Only registered client accounts can submit commercial inquiries.');
      return;
    }

    if (!company || !service) return;

    if (description.trim().length < 20) {
      setSubmitError('Detailed project description must be at least 20 characters.');
      return;
    }

    let currentValidation = validationResult;
    const isDescriptionChanged = description.trim() !== auditedDescription;

    // Bug 2 Fix: If user hasn't audited yet or edited brief since audit, run audit automatically first
    if (!override && (!currentValidation || isDescriptionChanged)) {
      currentValidation = await runValidation(round === 0 ? 1 : round);
      if (!currentValidation) return;
    }

    const isComplete = currentValidation?.isComplete ?? currentValidation?.pass ?? false;

    // If requirements are missing and user is not overriding
    if (!override && !isComplete && !currentValidation?.skipped) {
      setSubmitError(
        'Missing intake specifications detected. Please review the missing requirements listed in the audit dossier before submitting.'
      );
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const payload = {
        companyId: company.id || company._id,
        serviceId: service.id || service._id,
        description: description.trim(),
        budget: budget ? parseFloat(budget) : undefined,
        deadline: deadline ? new Date(deadline).toISOString() : undefined,
        aiValidation: {
          rounds: round || 1,
          overridden: override,
          skipped: currentValidation?.skipped || false,
          lastResult: currentValidation
            ? {
                isComplete: isComplete,
                missing: currentValidation.missing || [],
                message: currentValidation.message || currentValidation.notes || '',
              }
            : undefined,
        },
        clientRequestId,
      };

      const res = await api.post<{ inquiry: { id: string; referenceNumber: string } }>('/inquiries', payload);
      router.push(`/inquiries?submitted=${res.data.inquiry.referenceNumber}`);
    } catch (err: unknown) {
      const error = err as { message?: string; code?: string; details?: Array<{ field?: string; message: string }> };
      if (error.code === 'CONFLICT') {
        router.push('/inquiries');
      } else if (error.code === 'INCOMPLETE_BRIEF' && error.details && error.details.length > 0) {
        setSubmitError(`Intake check failed: ${error.details.map((d) => d.message).join(', ')}`);
      } else {
        setSubmitError(error.message || 'Failed to submit inquiry docket. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="font-serif text-xl font-bold text-stone-900">Loading Intake Docket...</h2>
        <p className="text-xs text-stone-500 font-mono mt-1">Calibrating institutional requirements</p>
      </div>
    );
  }

  if (pageError || !company || !service) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4 text-center">
        <Card className="p-8 space-y-4">
          <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-800 flex items-center justify-center mx-auto text-xl font-mono">
            !
          </div>
          <h2 className="font-serif text-2xl font-bold text-stone-900">Unable to Open Intake Modal</h2>
          <p className="text-sm text-stone-600">{pageError || 'Required quotation information is missing.'}</p>
          <div className="pt-4">
            <Link href="/companies">
              <Button variant="secondary">← Return to Directory</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  const checklist = service.requirementsChecklist || [];
  const isPassing = validationResult?.isComplete ?? validationResult?.pass ?? false;
  const canOverride = (validationResult && (validationResult.canSubmitAnyway || round >= 2)) || false;
  const validationMessage = validationResult?.message || validationResult?.notes || '';

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 bg-paper-50 selection:bg-teal-900 selection:text-white">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between text-xs font-mono text-stone-500">
          <Link href={`/companies/${company.slug}`} className="hover:text-teal-900 transition-colors flex items-center gap-1">
            ← Back to {company.name}
          </Link>
          <span>SECP Covenants Protected • RFQ Intake Docket</span>
        </div>

        {/* Central Tactical Intake Card */}
        <div className="bg-white border border-paper-200 rounded-2xl shadow-lg overflow-hidden flex flex-col">
          {/* 1. Docket Header */}
          <header className="bg-white border-b border-paper-200 px-6 sm:px-8 py-5">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="space-y-1.5 flex-1">
                {/* Trust bar */}
                <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                  <span className="font-bold text-teal-900 flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-teal-800" />
                    <span>{company.name}</span>
                  </span>
                  <span className="text-stone-300">•</span>
                  <Badge variant="approved">SECP Verified Studio</Badge>
                  <span className="text-stone-300">•</span>
                  <span className="text-[11px] text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-100">
                    Meezan Escrow Protected
                  </span>
                </div>

                {/* Service Title */}
                <h1 className="text-xl sm:text-2xl font-serif font-bold text-stone-900 tracking-tight">
                  Request a Formal Quotation: {service.title}
                </h1>

                {/* Service Meta Floor & SLA */}
                <div className="flex flex-wrap items-center gap-4 text-xs text-stone-600 font-mono pt-1">
                  {service.startingPrice !== undefined && (
                    <span>
                      Baseline starting floor:{' '}
                      <strong className="text-stone-900 font-bold">
                        PKR {service.startingPrice.toLocaleString()}
                      </strong>
                    </span>
                  )}
                  {service.deliveryTimeEstimate && (
                    <>
                      <span className="text-stone-300">•</span>
                      <span>
                        SLA Turnaround:{' '}
                        <strong className="text-stone-900 font-bold">
                          {service.deliveryTimeEstimate}
                        </strong>
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Service Category Tag */}
              <div className="shrink-0">
                <Badge variant="neutral">{service.category}</Badge>
              </div>
            </div>
          </header>

          {/* 2. Autonomous Scope Guard Bar */}
          <section className="bg-paper-100/70 border-b border-paper-200 px-6 sm:px-8 py-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-teal-900 text-white shadow-xs">
                  <Sparkles className="w-3.5 h-3.5 text-teal-200" />
                </span>
                <span className="font-serif font-bold text-sm text-stone-900">
                  Autonomous Intake Gatekeeper
                </span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-teal-900/10 text-teal-900 font-semibold flex items-center gap-1">
                  {isPassing && <CheckCircle2 className="w-3 h-3 text-teal-900" />}
                  <span>{isPassing ? '100% Gates Satisfied' : validationResult ? 'Scope Review Active' : 'Pre-flight Ready'}</span>
                </span>
              </div>

              <div className="text-xs text-stone-500 font-mono">
                QuotePilot AI audits customer briefs against company requirements to prevent scope creep.
              </div>
            </div>

            {/* Checklist items tracker preview */}
            {checklist.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3">
                {checklist.map((item, idx) => {
                  const isItemMissing =
                    validationResult &&
                    validationResult.missing &&
                    validationResult.missing.some(
                      (m) =>
                        m.toLowerCase().includes(item.item.toLowerCase()) ||
                        item.item.toLowerCase().includes(m.toLowerCase())
                    );
                  const isSatisfied = validationResult && !isItemMissing;

                  return (
                    <div
                      key={idx}
                      className={`p-2 rounded-lg border text-xs font-mono flex items-center gap-1.5 ${
                        isSatisfied
                          ? 'bg-teal-50 border-teal-200 text-teal-900'
                          : 'bg-white border-paper-200 text-stone-600'
                      }`}
                    >
                      {isSatisfied ? (
                        <Check className="w-3.5 h-3.5 text-teal-800 shrink-0" />
                      ) : (
                        <span className="w-3.5 h-3.5 rounded-full border border-stone-300 inline-block shrink-0" />
                      )}
                      <span className="truncate" title={item.item}>
                        {item.item}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* 3. Main Split View: Brief Form (Left) & AI Audit Dossier (Right) */}
          <div className="p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left 7 Columns: Form Input */}
            <div className="lg:col-span-7 space-y-6">
              {/* Studio Directive / Requirements Box */}
              {checklist.length > 0 && (
                <div className="bg-paper-100 rounded-xl p-4 border border-paper-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono uppercase tracking-wider font-bold text-teal-900">
                      Studio Requirements Checklist
                    </span>
                    <span className="text-[11px] font-mono text-stone-500">
                      {checklist.filter((c) => c.required).length} Mandatory Requirements
                    </span>
                  </div>
                  <ul className="space-y-1.5 text-xs text-stone-700">
                    {checklist.map((c, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-teal-800 font-bold">•</span>
                        <div>
                          <span className="font-semibold">{c.item}</span>
                          {c.required && <span className="text-rose-700 font-mono text-[10px] ml-1">(Required)</span>}
                          {c.helpText && <p className="text-[11px] text-stone-500 font-mono mt-0.5">{c.helpText}</p>}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Brief Description */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-mono uppercase tracking-wider font-bold text-stone-700">
                    Project Brief &amp; Commercial Scope Specification *
                  </label>
                  <span className="text-xs font-mono text-stone-400">
                    {description.length} / 2000 chars (min 20)
                  </span>
                </div>
                <textarea
                  rows={6}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detail your requirements, brand guidelines, SKU counts, dimensions, required deliverables, and any technical constraints..."
                  className="w-full p-4 rounded-xl border border-paper-300 font-sans text-sm text-stone-900 bg-paper-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-800 focus:border-transparent transition-all"
                />
              </div>

              {/* Budget and Deadline Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-mono uppercase tracking-wider font-bold text-stone-700">
                    Target Budget (PKR) (Optional)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    placeholder={service.startingPrice ? `e.g. ${service.startingPrice}` : 'e.g. 50000'}
                    className="w-full h-11 px-3.5 rounded-lg border border-paper-300 font-mono text-sm text-stone-900 bg-paper-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-800"
                  />
                  <p className="text-[11px] text-stone-400 font-mono">Company provides binding final price in quotation.</p>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-mono uppercase tracking-wider font-bold text-stone-700">
                    Required Delivery Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={deadline}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-lg border border-paper-300 font-mono text-sm text-stone-900 bg-paper-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-800"
                  />
                  <p className="text-[11px] text-stone-400 font-mono">Subject to provider availability &amp; mutual covenant.</p>
                </div>
              </div>

              {/* Error prompt */}
              {submitError && (
                <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-mono">
                  {submitError}
                </div>
              )}
            </div>

            {/* Right 5 Columns: AI Scope Readiness Audit Dossier */}
            <div className="lg:col-span-5 space-y-5">
              {/* AI Audit Box */}
              <div className="bg-paper-100 rounded-xl border border-paper-200 p-5 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-paper-200">
                  <div className="flex items-center gap-2">
                    <span className="text-teal-900 font-bold text-sm">QuotePilot AI Gatekeeper</span>
                  </div>
                  <span className="text-[11px] font-mono text-stone-500">
                    Round {round} / 2
                  </span>
                </div>

                {!validationResult ? (
                  <div className="space-y-3 py-2">
                    <p className="text-xs text-stone-600 leading-relaxed">
                      Write your project specifications and click <strong>&quot;Audit Brief with AI&quot;</strong> to check if your brief satisfies the studio&apos;s checklist.
                    </p>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="w-full border-teal-800 text-teal-900 font-mono text-xs flex items-center justify-center gap-1.5"
                      onClick={handleValidate}
                      isLoading={isValidating}
                      disabled={description.trim().length < 20}
                    >
                      <Sparkles className="w-3.5 h-3.5 text-teal-800" />
                      <span>Audit Brief with AI Gatekeeper</span>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {isPassing ? (
                      <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-mono space-y-1">
                        <div className="font-bold flex items-center gap-1.5 text-emerald-950">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>All Checklist Requirements Addressed</span>
                        </div>
                        <p className="text-[11px] text-emerald-800 font-sans pl-5.5">{validationMessage}</p>
                      </div>
                    ) : (
                      <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-2">
                        <div className="font-bold font-mono flex items-center gap-1.5 text-amber-950">
                          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                          <span>Missing Specifications Detected</span>
                        </div>
                        <p className="text-[11px] leading-relaxed font-sans pl-5.5">{validationMessage}</p>
                        {validationResult.missing && validationResult.missing.length > 0 && (
                          <div className="space-y-1.5 pt-2 border-t border-amber-200/60 pl-5.5">
                            <span className="font-mono text-[10px] font-bold uppercase text-amber-800">
                              Please clarify in your brief:
                            </span>
                            <ul className="list-disc list-inside text-[11px] space-y-1">
                              {validationResult.missing.map((m, idx) => (
                                <li key={idx} className="font-semibold text-amber-950">
                                  {m}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex items-center gap-2 pt-1">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="flex-1 text-xs font-mono"
                        onClick={handleValidate}
                        isLoading={isValidating}
                      >
                        Re-evaluate Brief ↻
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Escrow & Buyer Protection Card */}
              <div className="bg-white rounded-xl border border-paper-200 p-5 space-y-3 shadow-xs">
                <div className="text-xs uppercase tracking-wider text-stone-500 font-mono font-bold">
                  Buyer Protection &amp; Escrow Guarantee
                </div>

                <div className="space-y-2 text-xs text-stone-600">
                  <div className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-teal-800 shrink-0 mt-0.5" />
                    <span><strong>No Upfront Direct Transfer:</strong> Payments are deposited into Meezan Bank Escrow only upon accepting a quotation.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-teal-800 shrink-0 mt-0.5" />
                    <span><strong>Binding SLA:</strong> Provider receives formal notification to respond with an itemized milestone quotation slip.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-teal-800 shrink-0 mt-0.5" />
                    <span><strong>0% Buyer Fee:</strong> Standard commercial inquiry with zero commission markup.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 4. Sticky Action Footer */}
          <footer className="bg-paper-100 border-t border-paper-200 px-6 sm:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-stone-500 font-mono">
              {!isAuthenticated ? (
                <span>You will be prompted to log in before submitting this inquiry docket.</span>
              ) : (
                <span>Submitting as: <strong className="text-stone-800">{user?.name}</strong> ({user?.email})</span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-end">
              {canOverride && !isPassing && (
                <Button
                  variant="secondary"
                  size="md"
                  className="text-stone-700 border-paper-300 font-mono text-xs hover:bg-white"
                  onClick={() => handleSubmit(true)}
                  isLoading={isSubmitting}
                >
                  Submit Anyway (Override Scope Check)
                </Button>
              )}

              <Button
                variant="primary"
                size="md"
                className="w-full sm:w-auto px-6 font-mono text-xs"
                onClick={() => handleSubmit(false)}
                isLoading={isSubmitting || isValidating}
                disabled={description.trim().length < 20}
              >
                Submit Intake &amp; Request Quotation →
              </Button>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}

export default function InquirePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center p-6 text-stone-500 font-mono text-xs">
          Loading inquiry docket...
        </div>
      }
    >
      <InquireContent />
    </Suspense>
  );
}
