'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { FileText, CheckCircle2, Clock, ArrowRight, ShieldCheck, Layers, Coins, Building2, Home } from 'lucide-react';
import { QuotationSlipModal, QuotationData } from '@/components/quotation/QuotationSlipModal';
import { NotificationBell } from '@/components/notifications/NotificationBell';

export default function CustomerQuotationsPage() {
  const [quotations, setQuotations] = useState<QuotationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedQuotation, setSelectedQuotation] = useState<QuotationData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const loadQuotations = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get<{ quotations: QuotationData[] } | QuotationData[]>('/quotations');
      const data = Array.isArray(res.data) ? res.data : (res.data as any)?.quotations || [];
      setQuotations(data);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || 'Failed to load quotation slips.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuotations();
  }, []);

  const handleAcceptQuotation = async () => {
    if (!selectedQuotation) return;
    setIsProcessing(true);
    try {
      await api.post(`/quotations/${selectedQuotation._id}/accept`);
      setSelectedQuotation(null);
      await loadQuotations();
    } catch (err: any) {
      alert(err.message || 'Failed to accept quotation.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRejectQuotation = async (reason: string) => {
    if (!selectedQuotation) return;
    setIsProcessing(true);
    try {
      await api.post(`/quotations/${selectedQuotation._id}/reject`, { reason });
      setSelectedQuotation(null);
      await loadQuotations();
    } catch (err: any) {
      alert(err.message || 'Failed to decline quotation.');
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredQuotations = quotations.filter((q) => {
    if (statusFilter === 'all') return true;
    return q.status === statusFilter;
  });

  return (
    <RoleGuard allowedRoles={['customer']}>
      <div className="min-h-screen bg-paper-50 font-sans pb-16 selection:bg-teal-900 selection:text-white">
        {/* Header */}
        <header className="bg-white border-b border-paper-200 py-6 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-mono text-stone-500">
                <Link href="/" className="hover:text-teal-900 transition-colors flex items-center gap-1">
                  <Home className="w-3 h-3" />
                  <span>Home</span>
                </Link>
                <span>›</span>
                <Link href="/companies" className="hover:text-teal-900 transition-colors flex items-center gap-1">
                  <Building2 className="w-3 h-3" />
                  <span>Marketplace</span>
                </Link>
                <span>›</span>
                <Link href="/inquiries" className="hover:text-teal-900 transition-colors">
                  <span>Client Inquiries Desk</span>
                </Link>
                <span>›</span>
                <span className="text-stone-900 font-semibold">Quotations</span>
              </div>
              <h1 className="text-2xl font-serif font-bold text-stone-900 tracking-tight flex items-center gap-2">
                <FileText className="w-6 h-6 text-teal-900" />
                <span>Formal Quotation Slips &amp; Commercial Covenants</span>
              </h1>
              <p className="text-xs text-stone-600">
                Official milestone offers issued by verified studios with SECP compliant Meezan Escrow settlement
              </p>
            </div>

            {/* Actions & Status Filter */}
            <div className="flex flex-wrap items-center gap-3">
              <Link href="/">
                <Button variant="secondary" size="md" className="font-mono text-xs flex items-center gap-1.5 hover:bg-stone-100">
                  <Home className="w-3.5 h-3.5 text-stone-600" />
                  <span>Home</span>
                </Button>
              </Link>
              <Link href="/companies">
                <Button variant="secondary" size="md" className="font-mono text-xs flex items-center gap-1.5 border-teal-800/30 text-teal-950 hover:bg-teal-50">
                  <Building2 className="w-3.5 h-3.5 text-teal-800" />
                  <span>Browse Companies</span>
                </Button>
              </Link>
              <NotificationBell />
              <div className="flex items-center gap-2">
                {['all', 'sent', 'accepted', 'rejected'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-3 py-1 text-xs font-mono rounded-lg border transition-colors ${
                      statusFilter === st
                        ? 'bg-teal-900 text-white border-teal-900 font-bold'
                        : 'bg-white text-stone-600 border-paper-300 hover:bg-paper-100'
                    }`}
                  >
                    {st === 'all' ? 'All Slips' : st.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
          {loading ? (
            <div className="text-center py-16">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-xs font-mono text-stone-500">Loading official quotation slips...</p>
            </div>
          ) : error ? (
            <Card className="p-8 text-center text-rose-700 text-xs font-mono">{error}</Card>
          ) : filteredQuotations.length === 0 ? (
            <Card className="p-12 text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-teal-50 border border-teal-100 text-teal-800 mx-auto flex items-center justify-center shadow-xs">
                <FileText className="w-7 h-7 text-teal-800" />
              </div>
              <h3 className="font-serif font-bold text-base text-stone-900">
                No formal quotation slips found
              </h3>
              <p className="text-xs text-stone-600 max-w-md mx-auto">
                Once a studio reviews your inquiry and prepares an itemized milestone breakdown, the official slip will appear here.
              </p>
              <Link href="/inquiries">
                <Button variant="secondary" size="sm" className="mt-2 font-mono text-xs">
                  View My Active Inquiries
                </Button>
              </Link>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredQuotations.map((q) => {
                const isExpired = new Date(q.validUntil) < new Date();
                return (
                  <Card
                    key={q._id}
                    className="p-5 flex flex-col justify-between hover:border-teal-800 transition-all shadow-xs"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-paper-200">
                        <span className="font-mono text-xs font-bold text-teal-900">
                          #{q.referenceNumber}
                        </span>
                        <Badge
                          variant={
                            q.status === 'accepted'
                              ? 'success'
                              : q.status === 'rejected'
                              ? 'destructive'
                              : isExpired
                              ? 'warning'
                              : 'secondary'
                          }
                          className="text-[10px] uppercase font-mono"
                        >
                          {isExpired ? 'Expired' : q.status}
                        </Badge>
                      </div>

                      <div>
                        <span className="font-mono text-[10px] uppercase text-stone-400">
                          ISSUING STUDIO
                        </span>
                        <h3 className="font-serif font-bold text-stone-900 text-base">
                          {q.companyId?.name || 'Verified Provider'}
                        </h3>
                        <p className="text-[11px] text-stone-500 font-mono">
                          {q.companyId?.city ? `${q.companyId.city}, Pakistan` : 'Pakistan'}
                        </p>
                      </div>

                      <div className="bg-paper-100/60 p-3 rounded border border-paper-200 space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-stone-600">Milestone Tranches:</span>
                          <span className="font-mono font-bold text-stone-900">
                            {q.milestones.length}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-stone-600">Binding Value:</span>
                          <span className="font-serif font-bold text-teal-900 text-sm">
                            PKR {q.totalAmount.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between text-[11px] text-stone-500 pt-1 border-t border-paper-200">
                          <span>Valid Until:</span>
                          <span className="font-mono font-medium text-stone-700">
                            {new Date(q.validUntil).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 mt-2 border-t border-paper-200 flex items-center justify-between gap-2">
                      {q.inquiryId && (
                        <Link
                          href={`/inquiries/${q.inquiryId}`}
                          className="text-xs font-mono text-stone-600 hover:text-teal-900"
                        >
                          Open Thread →
                        </Link>
                      )}
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => setSelectedQuotation(q)}
                        className="font-mono text-xs px-3 bg-teal-900 hover:bg-teal-950 font-bold ml-auto"
                      >
                        Inspect Official Slip
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </main>

        {/* Quotation Slip Modal */}
        {selectedQuotation && (
          <QuotationSlipModal
            isOpen={!!selectedQuotation}
            onClose={() => setSelectedQuotation(null)}
            quotation={selectedQuotation}
            userRole="customer"
            onAccept={handleAcceptQuotation}
            onReject={handleRejectQuotation}
            isProcessing={isProcessing}
          />
        )}
      </div>
    </RoleGuard>
  );
}
