'use client';

import React, { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { QuotationSlipModal, QuotationData } from '@/components/quotation/QuotationSlipModal';
import { X, Plus, Trash2, ArrowLeft, Eye } from 'lucide-react';

interface MilestoneRow {
  title: string;
  amount: number | '';
  deliverablesText: string;
  estimatedDeliveryDays: number | '';
}

export default function CompanyQuoteBuilderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const inquiryId = resolvedParams.id;
  const router = useRouter();

  const [inquiry, setInquiry] = useState<any>(null);
  const [existingQuote, setExistingQuote] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [milestones, setMilestones] = useState<MilestoneRow[]>([
    {
      title: 'Phase 1: Discovery & Creative Direction',
      amount: 40000,
      deliverablesText: 'Moodboards, Typography palette, Initial vector drafts',
      estimatedDeliveryDays: 5,
    },
    {
      title: 'Phase 2: Master Deliverables & Production Assets',
      amount: 60000,
      deliverablesText: 'Final production-ready source files, Commercial release license',
      estimatedDeliveryDays: 7,
    },
  ]);

  const [validUntil, setValidUntil] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().split('T')[0];
  });

  const [termsAndConditions, setTermsAndConditions] = useState(
    '1. All project milestones are funded into Meezan Bank corporate escrow prior to tranche commencement.\n2. 48-hour inspection and feedback window per milestone.\n3. 100% intellectual property assignment upon final escrow tranche release.'
  );

  const [changeReason, setChangeReason] = useState('');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Load Inquiry and any existing quotation
  useEffect(() => {
    async function loadData() {
      try {
        const inqRes = await api.get<any>(`/inquiries/${inquiryId}`);
        setInquiry(inqRes.data.inquiry || inqRes.data);

        // Check if quotation already exists
        try {
          const quoteRes = await api.get<any>(`/inquiries/${inquiryId}/quote`);
          if (quoteRes.data?.quotation) {
            const q = quoteRes.data.quotation;
            setExistingQuote(q);
            setValidUntil(new Date(q.validUntil).toISOString().split('T')[0]);
            if (q.termsAndConditions) setTermsAndConditions(q.termsAndConditions);
            if (q.milestones && q.milestones.length > 0) {
              setMilestones(
                q.milestones.map((m: any) => ({
                  title: m.title,
                  amount: m.amount,
                  deliverablesText: (m.deliverables || []).join(', '),
                  estimatedDeliveryDays: m.estimatedDeliveryDays,
                }))
              );
            }
          }
        } catch {
          // No quotation exists yet - fresh build
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load inquiry details');
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [inquiryId]);

  // Compute Total Sum
  const totalAmount = milestones.reduce((sum, m) => sum + (Number(m.amount) || 0), 0);

  const handleAddMilestone = () => {
    setMilestones([
      ...milestones,
      {
        title: `Phase ${milestones.length + 1}: Final Polish & Asset Handover`,
        amount: 25000,
        deliverablesText: 'Source files, Documentation, Inspection sign-off',
        estimatedDeliveryDays: 4,
      },
    ]);
  };

  const handleRemoveMilestone = (index: number) => {
    if (milestones.length <= 1) return;
    setMilestones(milestones.filter((_, i) => i !== index));
  };

  const handleUpdateMilestone = (index: number, field: keyof MilestoneRow, value: any) => {
    const updated = [...milestones];
    updated[index] = { ...updated[index], [field]: value };
    setMilestones(updated);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);

    // Validation
    if (milestones.length === 0) {
      setError('At least one milestone deliverable is required.');
      return;
    }

    for (let i = 0; i < milestones.length; i++) {
      const m = milestones[i];
      if (!m.title.trim()) {
        setError(`Milestone ${i + 1} title is required.`);
        return;
      }
      if (!m.amount || Number(m.amount) <= 0) {
        setError(`Milestone ${i + 1} amount must be greater than zero.`);
        return;
      }
      if (!m.estimatedDeliveryDays || Number(m.estimatedDeliveryDays) <= 0) {
        setError(`Milestone ${i + 1} turnaround days must be at least 1 day.`);
        return;
      }
    }

    if (!validUntil || new Date(validUntil) <= new Date()) {
      setError('Quotation validity must be a future date.');
      return;
    }

    const payload = {
      totalAmount,
      validUntil: new Date(validUntil).toISOString(),
      termsAndConditions,
      changeReason: existingQuote ? changeReason || 'Revised scope per client discussion' : undefined,
      milestones: milestones.map((m) => ({
        title: m.title.trim(),
        amount: Number(m.amount),
        deliverables: m.deliverablesText
          .split(',')
          .map((d) => d.trim())
          .filter(Boolean),
        estimatedDeliveryDays: Number(m.estimatedDeliveryDays),
      })),
    };

    setIsSubmitting(true);
    try {
      if (existingQuote) {
        // Edit / revise quote
        await api.put(`/inquiries/${inquiryId}/quote`, payload);
      } else {
        // Create initial quote
        await api.post(`/inquiries/${inquiryId}/quote`, payload);
      }
      router.push(`/company/inquiries/${inquiryId}`);
    } catch (err: any) {
      setError(err.message || 'Failed to dispatch quotation slip.');
      setIsSubmitting(false);
    }
  };

  // Construct mock preview quotation object for the modal
  const previewQuotation: QuotationData = {
    _id: existingQuote?._id || 'draft-preview',
    inquiryId,
    referenceNumber: existingQuote?.referenceNumber || `${inquiry?.referenceNumber || 'QP-2026'}-Q1`,
    version: existingQuote ? existingQuote.version + 1 : 1,
    totalAmount,
    currency: 'PKR',
    milestones: milestones.map((m, idx) => ({
      order: idx + 1,
      title: m.title || `Tranche 0${idx + 1}`,
      amount: Number(m.amount) || 0,
      deliverables: m.deliverablesText.split(',').map((d) => d.trim()).filter(Boolean),
      estimatedDeliveryDays: Number(m.estimatedDeliveryDays) || 1,
      status: 'pending',
    })),
    termsAndConditions,
    validUntil: new Date(validUntil).toISOString(),
    status: 'draft',
    companyId: {
      name: inquiry?.company?.name || 'Your Registered Studio',
      city: inquiry?.company?.city || 'Lahore',
    },
    customerId: {
      name: inquiry?.customer?.name || 'Prospective Client',
      email: inquiry?.customer?.email || 'client@example.com',
    },
    createdAt: new Date().toISOString(),
  };

  return (
    <RoleGuard allowedRoles={['company_admin']}>
      <div className="min-h-screen bg-paper-50/40 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header Breadcrumb */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono text-stone-500 mb-1">
                <Link href="/company/inquiries" className="hover:text-stone-900">
                  Provider Desk
                </Link>
                <span>/</span>
                <Link href={`/company/inquiries/${inquiryId}`} className="hover:text-stone-900">
                  Docket #{inquiry?.referenceNumber || inquiryId.slice(-6)}
                </Link>
                <span>/</span>
                <span className="text-teal-900 font-bold">
                  {existingQuote ? `Revise Quotation (v${existingQuote.version + 1})` : 'New Quotation Slip'}
                </span>
              </div>
              <h1 className="font-serif text-2xl font-bold text-stone-900 tracking-tight">
                {existingQuote ? 'Revise Formal Milestone Quotation' : 'Prepare Formal Quotation Slip'}
              </h1>
              <p className="text-xs text-stone-600 mt-0.5">
                BR-09 &amp; BR-11: Institutional milestone slip with SECP compliant Meezan Escrow settlement
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsPreviewOpen(true)}
                className="font-mono text-xs"
              >
                Preview Official Slip
              </Button>
              <Link href={`/company/inquiries/${inquiryId}`}>
                <Button variant="ghost" size="sm" className="font-mono text-xs text-stone-600">
                  Cancel
                </Button>
              </Link>
            </div>
          </div>

          {error && (
            <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs flex items-center justify-between">
              <span>{error}</span>
              <button
                onClick={() => setError(null)}
                className="text-red-500 hover:text-red-800 p-1"
                title="Dismiss error"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Intake Brief Snapshot Card */}
          {inquiry && (
            <Card className="p-4 bg-paper-100/60 border-paper-200">
              <div className="flex flex-col sm:flex-row justify-between gap-3 text-xs">
                <div>
                  <span className="font-mono text-[10px] uppercase font-bold text-teal-900">
                    Client Intake Reference
                  </span>
                  <div className="font-semibold text-stone-900 mt-0.5">
                    {inquiry.serviceTitle} — {inquiry.customer?.name}
                  </div>
                  <p className="text-stone-600 line-clamp-2 mt-1">{inquiry.description}</p>
                </div>
                <div className="text-left sm:text-right shrink-0">
                  <div className="font-mono text-[10px] text-stone-500">CLIENT BUDGET</div>
                  <div className="font-mono font-bold text-stone-900 text-sm">
                    {inquiry.budget ? `PKR ${inquiry.budget.toLocaleString()}` : 'Not Specified'}
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Quotation Builder Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* If Revision: Change Reason */}
            {existingQuote && (
              <Card className="p-5 border-amber-200 bg-amber-50/40">
                <div className="space-y-2">
                  <label className="block font-serif font-bold text-xs text-stone-900">
                    Reason for Revision (Recorded in Version History)
                  </label>
                  <input
                    type="text"
                    value={changeReason}
                    onChange={(e) => setChangeReason(e.target.value)}
                    placeholder="e.g. Adjusted milestone 2 scope to exclude physical printing per client request in chat"
                    className="w-full text-xs font-mono p-2.5 rounded-lg border border-paper-300 bg-white focus:outline-none focus:ring-1 focus:ring-teal-800"
                  />
                  <p className="text-[10px] font-mono text-stone-500">
                    Previous version #{existingQuote.referenceNumber} (v{existingQuote.version}) for PKR{' '}
                    {existingQuote.totalAmount.toLocaleString()} will be archived in the audit docket.
                  </p>
                </div>
              </Card>
            )}

            {/* Milestones Card */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-paper-200">
                <div>
                  <h2 className="font-serif font-bold text-sm text-stone-900">
                    Itemized Milestone Tranches
                  </h2>
                  <p className="text-[11px] font-mono text-stone-500">
                    Each tranche is sequentially locked in Meezan Escrow and signed off by the client
                  </p>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleAddMilestone}
                  className="font-mono text-xs"
                >
                  + Add Tranche
                </Button>
              </div>

              <div className="space-y-4">
                {milestones.map((m, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-lg border border-paper-300 bg-paper-50/50 space-y-3 relative group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-teal-900 bg-teal-100/80 px-2 py-0.5 rounded">
                        Tranche 0{idx + 1}
                      </span>
                      {milestones.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveMilestone(idx)}
                          className="text-stone-400 hover:text-red-700 text-xs font-mono transition-colors"
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                      <div className="sm:col-span-6 space-y-1">
                        <label className="block text-[11px] font-semibold text-stone-700">
                          Milestone Title
                        </label>
                        <input
                          type="text"
                          value={m.title}
                          onChange={(e) => handleUpdateMilestone(idx, 'title', e.target.value)}
                          placeholder="e.g. Packaging Dielines & Structural Prototyping"
                          className="w-full text-xs font-sans p-2 rounded border border-paper-300 bg-white focus:outline-none focus:ring-1 focus:ring-teal-800"
                        />
                      </div>

                      <div className="sm:col-span-3 space-y-1">
                        <label className="block text-[11px] font-semibold text-stone-700">
                          Amount (PKR)
                        </label>
                        <input
                          type="number"
                          value={m.amount}
                          onChange={(e) =>
                            handleUpdateMilestone(idx, 'amount', e.target.value === '' ? '' : Number(e.target.value))
                          }
                          placeholder="40000"
                          min="1"
                          className="w-full text-xs font-mono p-2 rounded border border-paper-300 bg-white focus:outline-none focus:ring-1 focus:ring-teal-800"
                        />
                      </div>

                      <div className="sm:col-span-3 space-y-1">
                        <label className="block text-[11px] font-semibold text-stone-700">
                          Turnaround (Days)
                        </label>
                        <input
                          type="number"
                          value={m.estimatedDeliveryDays}
                          onChange={(e) =>
                            handleUpdateMilestone(
                              idx,
                              'estimatedDeliveryDays',
                              e.target.value === '' ? '' : Number(e.target.value)
                            )
                          }
                          placeholder="5"
                          min="1"
                          className="w-full text-xs font-mono p-2 rounded border border-paper-300 bg-white focus:outline-none focus:ring-1 focus:ring-teal-800"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[11px] font-semibold text-stone-700">
                        Deliverables (comma-separated checklist items)
                      </label>
                      <input
                        type="text"
                        value={m.deliverablesText}
                        onChange={(e) => handleUpdateMilestone(idx, 'deliverablesText', e.target.value)}
                        placeholder="e.g. Vector CAD die-lines, Packages Ltd cutter alignment, 3D unboxing renders"
                        className="w-full text-xs font-sans p-2 rounded border border-paper-300 bg-white focus:outline-none focus:ring-1 focus:ring-teal-800"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Live Summation Bar */}
              <div className="mt-6 pt-4 border-t border-paper-200 flex flex-col sm:flex-row justify-between items-center gap-3 bg-paper-100/50 p-4 rounded-lg">
                <div className="text-xs text-stone-600">
                  <span className="font-bold text-stone-800">{milestones.length} Tranches</span> configured
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="font-serif font-bold text-sm text-stone-700">Total Quotation Value:</span>
                  <span className="font-serif text-xl font-bold text-teal-900">
                    PKR {totalAmount.toLocaleString()}
                  </span>
                </div>
              </div>
            </Card>

            {/* Terms and Validity */}
            <Card className="p-6 space-y-4">
              <h2 className="font-serif font-bold text-sm text-stone-900">
                Institutional Terms &amp; Validity Window
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-stone-700">
                    Quotation Expiry Date (Firm Offer Window)
                  </label>
                  <input
                    type="date"
                    value={validUntil}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setValidUntil(e.target.value)}
                    className="w-full text-xs font-mono p-2.5 rounded-lg border border-paper-300 bg-white focus:outline-none focus:ring-1 focus:ring-teal-800"
                  />
                  <p className="text-[10px] font-mono text-stone-500">
                    Defaults to 14 days. After this date, the customer must request a refreshed quote.
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-stone-700">
                    Escrow Settlement Account
                  </label>
                  <div className="p-2.5 bg-paper-100 rounded-lg border border-paper-200 text-xs text-stone-600 font-mono">
                    Meezan Bank Ltd. Corporate Segregated Escrow
                  </div>
                  <p className="text-[10px] font-mono text-stone-500">
                    SECP Digital Custody Directive 2023 certified.
                  </p>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-stone-700">
                  Commercial Terms &amp; Scope Covenants
                </label>
                <textarea
                  rows={4}
                  value={termsAndConditions}
                  onChange={(e) => setTermsAndConditions(e.target.value)}
                  className="w-full text-xs font-sans p-3 rounded-lg border border-paper-300 bg-white focus:outline-none focus:ring-1 focus:ring-teal-800 leading-relaxed"
                />
              </div>
            </Card>

            {/* Submit Action Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-white rounded-lg border border-paper-200 shadow-xs">
              <div className="text-xs text-stone-600">
                Total binding commitment:{' '}
                <span className="font-serif font-bold text-stone-900 text-sm">
                  PKR {totalAmount.toLocaleString()}
                </span>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  onClick={() => setIsPreviewOpen(true)}
                  className="font-mono text-xs"
                >
                  Inspect Full Slip
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  disabled={isSubmitting || totalAmount <= 0}
                  isLoading={isSubmitting}
                  className="bg-teal-900 hover:bg-teal-950 font-bold text-xs"
                >
                  {existingQuote ? 'Sign & Dispatch Revised Slip' : 'Sign & Dispatch Binding Slip'}
                </Button>
              </div>
            </div>
          </form>

          {/* Quotation Slip Preview Modal */}
          <QuotationSlipModal
            isOpen={isPreviewOpen}
            onClose={() => setIsPreviewOpen(false)}
            quotation={previewQuotation}
            userRole="company_admin"
          />
        </div>
      </div>
    </RoleGuard>
  );
}
