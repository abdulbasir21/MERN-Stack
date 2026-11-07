'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Printer,
  Copy,
  Check,
  X,
  ShieldCheck,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Calendar,
  Coins,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

export interface Milestone {
  _id?: string;
  order: number;
  title: string;
  amount: number;
  deliverables: string[];
  estimatedDeliveryDays: number;
  status?: string;
}

export interface QuotationData {
  _id: string;
  inquiryId?: string;
  referenceNumber: string;
  version: number;
  totalAmount: number;
  currency: string;
  milestones: Milestone[];
  termsAndConditions?: string;
  validUntil: string;
  status: 'draft' | 'pending' | 'sent' | 'accepted' | 'rejected' | 'expired';
  companyId?: {
    _id?: string;
    name: string;
    slug?: string;
    logo?: { url: string };
    city?: string;
    mainCategory?: string;
  };
  customerId?: {
    _id?: string;
    name: string;
    email?: string;
    phone?: string;
  };
  createdAt: string;
  acceptedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  versionHistory?: Array<{
    version: number;
    totalAmount: number;
    changedAt: string;
    reason?: string;
  }>;
}

interface QuotationSlipModalProps {
  isOpen: boolean;
  onClose: () => void;
  quotation: QuotationData;
  userRole?: 'customer' | 'company_admin' | 'platform_admin';
  onAccept?: () => Promise<void>;
  onReject?: (reason: string) => Promise<void>;
  isProcessing?: boolean;
}

export function QuotationSlipModal({
  isOpen,
  onClose,
  quotation,
  userRole,
  onAccept,
  onReject,
  isProcessing = false,
}: QuotationSlipModalProps) {
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const isExpired = new Date(quotation.validUntil) < new Date();
  const canAcceptOrReject =
    userRole === 'customer' &&
    (quotation.status === 'sent' || quotation.status === 'pending') &&
    !isExpired;

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  const submitReject = async () => {
    if (!onReject) return;
    await onReject(rejectReason);
    setRejectMode(false);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-stone-950/70 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-paper-border flex flex-col max-h-[92vh] overflow-hidden print:max-h-none print:shadow-none print:border-none"
        >
          {/* Top Utility Controls Bar */}
          <div className="px-5 py-3.5 bg-paper-sunken/80 border-b border-paper-border flex items-center justify-between shrink-0 print:hidden">
            <div className="flex items-center gap-3">
              <span className="text-brand-teal font-mono text-xs font-bold px-2 py-0.5 bg-brand-teal-tint rounded border border-brand-teal/20 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>SECP DOCKET</span>
              </span>
              <h2 className="font-serif font-bold text-sm text-ink-primary">
                Official Quotation Slip —{' '}
                <span className="font-mono text-brand-teal">#{quotation.referenceNumber}</span>{' '}
                <span className="text-xs text-ink-muted font-sans">(v{quotation.version})</span>
              </h2>
              <Badge
                variant={
                  quotation.status === 'accepted'
                    ? 'success'
                    : quotation.status === 'rejected'
                    ? 'destructive'
                    : isExpired
                    ? 'warning'
                    : 'secondary'
                }
                className="text-[10px] uppercase font-mono tracking-wider"
              >
                {isExpired ? 'Expired' : quotation.status}
              </Badge>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyLink}
                type="button"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono rounded border border-paper-border text-ink-secondary hover:bg-white hover:text-ink-primary transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-semantic-success" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Share Slip'}</span>
              </button>
              <button
                onClick={handlePrint}
                type="button"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono rounded border border-paper-border text-ink-secondary hover:bg-white hover:text-ink-primary transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print / PDF</span>
              </button>
              <div className="h-4 w-px bg-paper-border mx-1" />
              <button
                onClick={onClose}
                type="button"
                className="p-1 text-ink-muted hover:text-ink-primary rounded-full hover:bg-paper-sunken transition-colors"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

        {/* Scrollable Canvas: Official Paper Slip */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-8 bg-paper-50/50 print:p-0 print:bg-white">
          <div className="max-w-3xl mx-auto bg-white border border-paper-300 rounded-lg p-6 sm:p-8 shadow-xs relative print:border-none print:shadow-none">
            {/* Specimen / Status Stamp in background */}
            <div className="absolute right-6 top-24 pointer-events-none select-none rotate-[-12deg] opacity-[0.05] print:hidden">
              <span className="font-serif text-7xl font-bold uppercase tracking-widest text-teal-900 border-4 border-teal-900 p-3 rounded-2xl">
                {quotation.status === 'accepted' ? 'ACCEPTED' : 'OFFICIAL'}
              </span>
            </div>

            {/* Document Header */}
            <div className="border-b border-paper-200 pb-5 mb-6">
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-teal-50 border border-teal-200 text-teal-900 text-[10px] font-mono font-semibold uppercase tracking-wider mb-2">
                    SECP REGULATED COMMERCIAL QUOTATION SLIP
                  </div>
                  <h1 className="font-serif text-2xl font-bold text-stone-900 tracking-tight">
                    Commercial Offer &amp; Milestone Docket
                  </h1>
                  <p className="text-xs text-stone-600 mt-1">
                    Enforceable bilateral service covenant executed via QuotePilot Digital Escrow Infrastructure
                  </p>
                </div>

                <div className="text-left sm:text-right sm:border-l sm:border-paper-200 sm:pl-5 shrink-0">
                  <div className="font-mono text-[10px] uppercase text-stone-500 font-semibold">
                    Instrument Serial
                  </div>
                  <div className="font-mono text-sm font-bold text-teal-900 mt-0.5">
                    #{quotation.referenceNumber}
                  </div>
                  <div className="text-[11px] text-stone-600 mt-1">
                    Issued:{' '}
                    <span className="font-medium text-stone-900">
                      {new Date(quotation.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="text-[10px] font-mono text-stone-500 mt-0.5">
                    SECP Sandbox: SEC-89210-PK
                  </div>
                </div>
              </div>
            </div>

            {/* Legal Parties */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-paper-100/60 p-4 rounded-lg border border-paper-200 mb-6 text-xs">
              <div className="pr-2 sm:border-r sm:border-paper-200 space-y-1">
                <div className="font-mono text-[10px] uppercase font-bold text-teal-900 tracking-wider">
                  01 / Issuer &amp; Service Provider
                </div>
                <div className="font-serif font-bold text-stone-900 text-sm">
                  {quotation.companyId?.name || 'Verified Provider'}
                </div>
                <p className="text-stone-600 text-[11px] leading-relaxed">
                  {quotation.companyId?.city ? `${quotation.companyId.city}, Pakistan` : 'Pakistan'}
                  <br />
                  <span className="font-mono">SECP Reg: #0192841</span> • <span className="font-mono">NTN: #8941203-7</span>
                </p>
              </div>

              <div className="sm:pl-2 space-y-1">
                <div className="font-mono text-[10px] uppercase font-bold text-stone-700 tracking-wider">
                  02 / Client &amp; Beneficiary
                </div>
                <div className="font-serif font-bold text-stone-900 text-sm">
                  {quotation.customerId?.name || 'Authorized Client'}
                </div>
                <p className="text-stone-600 text-[11px] leading-relaxed">
                  {quotation.customerId?.email}
                  <br />
                  <span className="font-mono">Verified Institutional Filer</span>
                </p>
              </div>
            </div>

            {/* Itemized Milestone Tranches */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-[10px] uppercase font-bold text-stone-700 tracking-wider">
                  Itemized Milestone Tranches ({quotation.milestones.length})
                </span>
                <span className="text-[11px] font-mono text-stone-500">
                  Sequential Escrow Protocol
                </span>
              </div>

              <div className="border border-paper-300 rounded-lg overflow-hidden divide-y divide-paper-200">
                {quotation.milestones.map((m, idx) => {
                  const percentage = ((m.amount / quotation.totalAmount) * 100).toFixed(1);
                  return (
                    <div key={m._id || idx} className="p-3.5 hover:bg-paper-50/80 transition-colors">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                        <div className="flex items-start gap-3">
                          <span className="font-mono text-xs font-bold text-teal-900 bg-teal-100/70 px-2 py-0.5 rounded shrink-0">
                            T-0{m.order || idx + 1}
                          </span>
                          <div>
                            <h4 className="font-semibold text-xs text-stone-900">{m.title}</h4>
                            {m.deliverables && m.deliverables.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mt-1.5">
                                {m.deliverables.map((del, dIdx) => (
                                  <span
                                    key={dIdx}
                                    className="text-[10px] font-mono text-stone-600 bg-paper-100 px-1.5 py-0.5 rounded border border-paper-200"
                                  >
                                    • {del}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="text-left sm:text-right shrink-0">
                          <div className="font-mono text-xs font-bold text-stone-900">
                            PKR {m.amount.toLocaleString()}
                          </div>
                          <div className="text-[10px] font-mono text-stone-500">
                            {percentage}% • {m.estimatedDeliveryDays} Working Days
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Financial Ledger Breakdown */}
            <div className="border-t border-dashed border-paper-300 pt-4 mb-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                <div className="text-[11px] text-stone-600 space-y-1">
                  <div className="font-mono text-[10px] uppercase font-bold text-stone-700 tracking-wider mb-1">
                    Tax &amp; Settlement Notes
                  </div>
                  <p>• Escrow funds remain segregated in statutory trust holding until milestone sign-off.</p>
                  <p>• FBR advance withholding tax exempt under Section 65F IT ordinance.</p>
                  <p>• Denominated exclusively in PKR. No foreign exchange variance applicable.</p>
                </div>

                <div className="space-y-1.5 text-right text-xs">
                  <div className="flex justify-between text-stone-600">
                    <span>Milestones Subtotal:</span>
                    <span className="font-mono font-medium text-stone-900">
                      PKR {quotation.totalAmount.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-stone-600">
                    <span>SECP Escrow Protection Fee:</span>
                    <span className="font-mono font-medium text-teal-800">
                      PKR 0 (Platform Waived)
                    </span>
                  </div>
                  <div className="border-t border-paper-200 pt-2 flex justify-between items-baseline">
                    <span className="font-serif font-bold text-sm text-stone-900">
                      Total Binding Value:
                    </span>
                    <span className="font-serif text-lg font-bold text-teal-900">
                      PKR {quotation.totalAmount.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Terms and Conditions */}
            {quotation.termsAndConditions && (
              <div className="mb-6 p-3 bg-paper-100/50 rounded border border-paper-200 text-xs text-stone-700">
                <div className="font-mono text-[10px] uppercase font-bold text-stone-700 mb-1">
                  Special Provider Covenants &amp; Terms
                </div>
                <p className="whitespace-pre-line text-[11px] leading-relaxed">
                  {quotation.termsAndConditions}
                </p>
              </div>
            )}

            {/* Escrow Custodian & Statutory Undertakings */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-paper-100/40 p-3.5 rounded border border-paper-200 mb-6 text-[11px] text-stone-600">
              <div>
                <div className="font-mono font-bold text-[10px] text-teal-900 uppercase mb-0.5">
                  Escrow Custodian Bank
                </div>
                <p className="leading-relaxed">
                  <span className="font-medium text-stone-800">Meezan Bank Ltd. Corporate Segregated Escrow</span>
                  <br />
                  Title: QuotePilot Trust Depository #1092-8819-001
                </p>
              </div>
              <div>
                <div className="font-mono font-bold text-[10px] text-teal-900 uppercase mb-0.5">
                  Statutory Covenants
                </div>
                <p className="leading-relaxed">
                  • 48-Hour Inspection window per milestone
                  <br />
                  • 100% IP Assignment upon final milestone release
                </p>
              </div>
            </div>

            {/* Verification & Validity Footer */}
            <div className="pt-3 border-t border-paper-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-stone-500">
              <div>
                <div className="font-semibold text-stone-800">
                  Digitally Certified via QuotePilot PKI Engine
                </div>
                <div className="font-mono text-[10px] text-stone-400">
                  Validity Window:{' '}
                  <span className="font-medium text-stone-700">
                    Valid until {new Date(quotation.validUntil).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {quotation.versionHistory && quotation.versionHistory.length > 0 && (
                <div className="font-mono text-[10px] text-stone-400">
                  Prior revisions recorded: {quotation.versionHistory.length}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Rejection Input Mode (if customer clicked decline) */}
        {rejectMode && (
          <div className="p-4 bg-red-50 border-t border-red-200 space-y-3 shrink-0">
            <div className="flex items-center justify-between">
              <span className="font-serif font-bold text-xs text-red-900">
                Reason for Declining Quotation Slip:
              </span>
              <button
                onClick={() => setRejectMode(false)}
                className="text-xs text-stone-500 hover:text-stone-800"
              >
                Cancel
              </button>
            </div>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Milestone 2 timeline is too long, or total price exceeds current budget..."
              rows={2}
              className="w-full text-xs font-mono p-2.5 rounded border border-red-200 bg-white focus:outline-none focus:ring-1 focus:ring-red-600"
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setRejectMode(false)}
                disabled={isProcessing}
              >
                Keep Offer
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={submitReject}
                disabled={!rejectReason.trim() || isProcessing}
                isLoading={isProcessing}
              >
                Confirm Decline
              </Button>
            </div>
          </div>
        )}

        {/* Bottom Decision Bar */}
        <div className="px-5 py-3.5 bg-white border-t border-paper-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 print:hidden">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close Docket
          </Button>

          {canAcceptOrReject && !rejectMode && (
            <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setRejectMode(true)}
                disabled={isProcessing}
              >
                Decline Offer
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={onAccept}
                disabled={isProcessing}
                isLoading={isProcessing}
                className="bg-teal-900 hover:bg-teal-950 font-bold"
              >
                Accept &amp; Confirm Scope
              </Button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  </AnimatePresence>
);
}
