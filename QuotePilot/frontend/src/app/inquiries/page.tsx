'use client';

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
  MessageSquare,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ArrowRight,
  FileText,
  Plus,
  FolderOpen,
  Building2,
  Home,
  Check,
  X,
  Search,
} from 'lucide-react';
import { NotificationBell } from '@/components/notifications/NotificationBell';

interface InquiryItem {
  id: string;
  _id?: string;
  referenceNumber: string;
  serviceTitleSnapshot: string;
  description: string;
  budget?: number;
  deadline?: string;
  status: 'submitted' | 'in_discussion' | 'quoted' | 'accepted' | 'rejected' | 'expired' | 'cancelled';
  companyId: {
    id?: string;
    _id?: string;
    name: string;
    slug: string;
    city: string;
    mainCategory: string;
    logo?: { url: string };
  };
  lastMessageAt?: string;
  lastMessagePreview?: string;
  createdAt: string;
  quotation?: {
    totalAmount: number;
    validUntil: string;
    status: string;
  };
}

function InquiriesContent() {
  const searchParams = useSearchParams();
  const newlySubmitted = searchParams.get('submitted');

  const [inquiries, setInquiries] = useState<InquiryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterTab, setFilterTab] = useState<'all' | 'quoted' | 'in_discussion' | 'submitted' | 'accepted' | 'archived'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const loadInquiries = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get<{ inquiries: InquiryItem[] }>('/inquiries');
      setInquiries(res.data.inquiries || []);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || 'Failed to load inquiries.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInquiries();
  }, []);

  // Filter computations
  const totalOpen = inquiries.filter((i) => ['submitted', 'in_discussion', 'quoted'].includes(i.status)).length;
  const quotesReceived = inquiries.filter((i) => i.status === 'quoted').length;
  const inDiscussion = inquiries.filter((i) => i.status === 'in_discussion').length;
  const acceptedCount = inquiries.filter((i) => i.status === 'accepted').length;

  const filteredInquiries = inquiries.filter((item) => {
    // Filter tab
    if (filterTab === 'quoted' && item.status !== 'quoted') return false;
    if (filterTab === 'in_discussion' && item.status !== 'in_discussion') return false;
    if (filterTab === 'submitted' && item.status !== 'submitted') return false;
    if (filterTab === 'accepted' && item.status !== 'accepted') return false;
    if (filterTab === 'archived' && !['rejected', 'expired', 'cancelled'].includes(item.status)) return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const refMatch = item.referenceNumber.toLowerCase().includes(q);
      const srvMatch = item.serviceTitleSnapshot.toLowerCase().includes(q);
      const compMatch = item.companyId?.name?.toLowerCase().includes(q) || false;
      if (!refMatch && !srvMatch && !compMatch) return false;
    }

    return true;
  });

  const getStatusBadge = (status: InquiryItem['status']) => {
    switch (status) {
      case 'quoted':
        return <Badge variant="warning">Quotation Slip Ready</Badge>;
      case 'in_discussion':
        return <Badge variant="neutral">In Discussion</Badge>;
      case 'submitted':
        return <Badge variant="neutral">Intake Dispatched</Badge>;
      case 'accepted':
        return <Badge variant="approved">Accepted &amp; Active</Badge>;
      case 'rejected':
        return <Badge variant="rejected">Declined</Badge>;
      case 'expired':
        return <Badge variant="rejected">Expired</Badge>;
      case 'cancelled':
        return <Badge variant="neutral">Cancelled</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-paper-50 font-sans pb-16 selection:bg-teal-900 selection:text-white">
      {/* Top Banner */}
      <aside className="bg-paper-100 border-b border-paper-200 px-4 py-2 text-xs text-stone-600 font-mono">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 text-teal-900 font-bold">
              <span className="w-2 h-2 rounded-full bg-teal-800 animate-pulse" />
              Meezan Escrow Protected
            </span>
            <span className="text-stone-300">•</span>
            <span>Commercial Clearing Currency: <strong>PKR (Rs.)</strong></span>
          </div>
          <div>SECP Institutional Arbitrated Escrow Standard</div>
        </div>
      </aside>

      {/* Sub-Header / Workspace Title */}
      <section className="bg-white border-b border-paper-200 py-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-stone-500 mb-1">
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
              <span className="text-stone-900 font-semibold">Customer Inquiries Desk</span>
            </div>
            <div className="flex items-baseline gap-3">
              <h1 className="text-2xl sm:text-3xl font-serif font-bold text-stone-900 tracking-tight">
                Active Commercial Inquiries
              </h1>
              <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-paper-100 text-teal-900 font-semibold border border-paper-300">
                {inquiries.length} {inquiries.length === 1 ? 'Docket' : 'Dockets'}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
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
            <Link href="/quotations">
              <Button variant="secondary" size="md" className="font-mono text-xs flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                <span>View Quotation Slips</span>
              </Button>
            </Link>
            <Link href="/companies">
              <Button variant="primary" size="md" className="font-mono text-xs flex items-center gap-1.5 bg-teal-900 hover:bg-teal-950 font-bold">
                <Plus className="w-3.5 h-3.5" />
                <span>Request New Quotation</span>
              </Button>
            </Link>
            <NotificationBell />
          </div>
        </div>
      </section>

      {/* Submission Success Toast/Alert if newly submitted */}
      {newlySubmitted && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          <div className="p-4 rounded-xl bg-teal-50 border border-teal-200 text-teal-950 flex items-center justify-between gap-4 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-teal-900 text-white flex items-center justify-center font-bold text-sm shrink-0">
                <Check className="w-4 h-4 text-white" />
              </div>
              <div className="text-xs font-mono">
                <span className="font-bold text-sm block">Inquiry Docket #{newlySubmitted} Dispatched</span>
                The service provider has received your requirements docket under standard SLA covenants.
              </div>
            </div>
            <button
              onClick={() => {
                const url = new URL(window.location.href);
                url.searchParams.delete('submitted');
                window.history.replaceState({}, '', url.toString());
              }}
              className="text-stone-400 hover:text-stone-600 text-xs font-mono p-1 flex items-center gap-1"
            >
              <span>Dismiss</span>
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        {/* 1. Operational Metrics Cards */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Open Inquiries */}
          <Card className="p-5 flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <span className="text-xs font-mono text-stone-500 uppercase tracking-wider">Total Open Inquiries</span>
              <span className="p-1.5 rounded-md bg-paper-100 text-teal-900 font-mono text-xs font-bold">
                RFQ
              </span>
            </div>
            <div className="mt-4">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-serif font-bold text-stone-900">{totalOpen}</span>
                <span className="text-xs font-mono text-stone-400">in process</span>
              </div>
              <p className="text-xs font-mono text-teal-900 mt-1">Live customer dockets</p>
            </div>
          </Card>

          {/* Card 2: Quotation Slips Ready */}
          <Card className={`p-5 flex flex-col justify-between ${quotesReceived > 0 ? 'border-2 border-teal-900' : ''}`}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-mono font-bold text-teal-900 uppercase tracking-wider">
                  Quotes Received
                </span>
                {quotesReceived > 0 && <span className="w-2 h-2 rounded-full bg-amber-600 animate-ping" />}
              </div>
              <span className="p-1.5 rounded-md bg-teal-50 text-teal-900 font-mono text-xs font-bold">
                SLIP
              </span>
            </div>
            <div className="mt-4">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-serif font-bold text-teal-900">{quotesReceived}</span>
                <span className="text-xs font-mono font-semibold text-amber-700">
                  {quotesReceived > 0 ? 'Action Required' : 'Awaiting responses'}
                </span>
              </div>
              <p className="text-xs font-mono text-stone-500 mt-1">Binding quotation slips</p>
            </div>
          </Card>

          {/* Card 3: In Discussion */}
          <Card className="p-5 flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <span className="text-xs font-mono text-stone-500 uppercase tracking-wider">In Clarification</span>
              <span className="p-1.5 rounded-md bg-paper-100 text-stone-700 font-mono text-xs font-bold">
                MSG
              </span>
            </div>
            <div className="mt-4">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-serif font-bold text-stone-900">{inDiscussion}</span>
                <span className="text-xs font-mono text-stone-400">active threads</span>
              </div>
              <p className="text-xs font-mono text-stone-500 mt-1">Active scope discussions</p>
            </div>
          </Card>

          {/* Card 4: Accepted & In Progress */}
          <Card className="p-5 flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <span className="text-xs font-mono text-stone-500 uppercase tracking-wider">Accepted Covenants</span>
              <span className="p-1.5 rounded-md bg-paper-100 text-teal-900 font-mono text-xs font-bold">
                ESCROW
              </span>
            </div>
            <div className="mt-4">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-serif font-bold text-stone-900">{acceptedCount}</span>
                <span className="text-xs font-mono text-stone-400">contracts</span>
              </div>
              <p className="text-xs font-mono text-stone-500 mt-1">Milestone escrow protected</p>
            </div>
          </Card>
        </section>

        {/* 2. Filter Tabs & Search Controls */}
        <div className="bg-white border border-paper-200 rounded-xl p-3 shadow-xs space-y-3">
          <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-paper-100 text-xs font-mono">
            <button
              onClick={() => setFilterTab('all')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                filterTab === 'all'
                  ? 'bg-teal-900 text-white font-bold'
                  : 'text-stone-600 hover:bg-paper-100'
              }`}
            >
              <span>All Inquiries</span>
              <span className="px-1.5 py-0.2 bg-black/10 rounded-full text-[10px]">{inquiries.length}</span>
            </button>

            <button
              onClick={() => setFilterTab('quoted')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                filterTab === 'quoted'
                  ? 'bg-teal-900 text-white font-bold'
                  : 'text-stone-600 hover:bg-paper-100'
              }`}
            >
              <span>Quotes Ready</span>
              <span className="px-1.5 py-0.2 bg-paper-200 rounded-full text-[10px] font-bold text-amber-800">
                {quotesReceived}
              </span>
            </button>

            <button
              onClick={() => setFilterTab('in_discussion')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                filterTab === 'in_discussion'
                  ? 'bg-teal-900 text-white font-bold'
                  : 'text-stone-600 hover:bg-paper-100'
              }`}
            >
              <span>In Discussion</span>
              <span className="px-1.5 py-0.2 bg-paper-200 rounded-full text-[10px]">{inDiscussion}</span>
            </button>

            <button
              onClick={() => setFilterTab('submitted')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                filterTab === 'submitted'
                  ? 'bg-teal-900 text-white font-bold'
                  : 'text-stone-600 hover:bg-paper-100'
              }`}
            >
              <span>Pending Studio</span>
              <span className="px-1.5 py-0.2 bg-paper-200 rounded-full text-[10px]">
                {inquiries.filter((i) => i.status === 'submitted').length}
              </span>
            </button>

            <button
              onClick={() => setFilterTab('accepted')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                filterTab === 'accepted'
                  ? 'bg-teal-900 text-white font-bold'
                  : 'text-stone-600 hover:bg-paper-100'
              }`}
            >
              <span>Accepted</span>
              <span className="px-1.5 py-0.2 bg-paper-200 rounded-full text-[10px]">{acceptedCount}</span>
            </button>
          </div>

          {/* Search bar */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between pt-1">
            <div className="relative w-full sm:w-80">
              <input
                type="text"
                placeholder="Filter by reference #, service, studio..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-3 pr-8 py-2 text-xs font-mono bg-paper-50 rounded-lg border border-paper-300 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-teal-800"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-stone-400 hover:text-stone-600 p-0.5"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="text-xs font-mono text-stone-500">
              Showing {filteredInquiries.length} of {inquiries.length} dockets
            </div>
          </div>
        </div>

        {/* 3. Inquiries Docket List */}
        {loading ? (
          <div className="py-16 text-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs font-mono text-stone-500">Loading your commercial inquiries...</p>
          </div>
        ) : error ? (
          <Card className="p-8 text-center space-y-3">
            <p className="text-rose-700 text-xs font-mono">{error}</p>
            <Button variant="secondary" size="sm" onClick={loadInquiries}>
              Try Again
            </Button>
          </Card>
        ) : filteredInquiries.length === 0 ? (
          <Card className="p-12 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-teal-50 border border-teal-100 text-teal-800 flex items-center justify-center mx-auto shadow-xs">
              <FolderOpen className="w-7 h-7 text-teal-800" />
            </div>
            <div className="space-y-1">
              <h3 className="font-serif font-bold text-lg text-stone-900">No Inquiries Found</h3>
              <p className="text-xs text-stone-500 max-w-sm mx-auto">
                {searchQuery || filterTab !== 'all'
                  ? 'No inquiry dockets match your active filters.'
                  : 'You have not submitted any quotation requests yet. Explore vetted service providers to start.'}
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Link href="/companies">
                <Button variant="primary" size="sm" className="font-mono text-xs flex items-center gap-1.5 bg-teal-900 hover:bg-teal-950 font-bold">
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Browse Vetted Companies</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
              <Link href="/">
                <Button variant="secondary" size="sm" className="font-mono text-xs flex items-center gap-1.5">
                  <Home className="w-3.5 h-3.5" />
                  <span>Return to Home</span>
                </Button>
              </Link>
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredInquiries.map((inq) => {
              const inqId = inq.id || inq._id;
              return (
                <article
                  key={inqId}
                  className={`bg-white rounded-xl overflow-hidden border transition-all ${
                    inq.status === 'quoted'
                      ? 'border-2 border-teal-900 shadow-sm'
                      : 'border-paper-200 hover:border-paper-300'
                  }`}
                >
                  {/* Card Header Meta */}
                  <div className="bg-paper-100/70 px-6 py-3 border-b border-paper-200 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-teal-950 px-2 py-0.5 rounded bg-white border border-paper-300">
                        {inq.referenceNumber}
                      </span>
                      <span className="text-stone-300">•</span>
                      <span className="text-stone-500">
                        Opened {new Date(inq.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {getStatusBadge(inq.status)}
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-6 space-y-4">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      <div className="space-y-1.5 flex-1">
                        <h2 className="text-lg font-serif font-bold text-stone-900 hover:text-teal-900 transition-colors">
                          {inq.serviceTitleSnapshot}
                        </h2>

                        <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-stone-600">
                          <span className="font-semibold text-stone-900">
                            {inq.companyId?.name || 'Vetted Provider'}
                          </span>
                          {inq.companyId?.city && <span>• {inq.companyId.city}</span>}
                          <Badge variant="approved">Vetted Studio</Badge>
                        </div>
                      </div>

                      {/* Financial info if quoted or budget */}
                      <div className="text-left md:text-right bg-paper-50 md:bg-transparent p-3 md:p-0 rounded-lg border border-paper-200 md:border-0 font-mono">
                        {inq.quotation?.totalAmount ? (
                          <>
                            <div className="text-[10px] text-stone-500 uppercase tracking-wider">
                              Binding Quotation Slip
                            </div>
                            <div className="text-xl font-serif font-bold text-teal-900">
                              PKR {inq.quotation.totalAmount.toLocaleString()}
                            </div>
                          </>
                        ) : inq.budget ? (
                          <>
                            <div className="text-[10px] text-stone-400 uppercase tracking-wider">
                              Client Budget Floor
                            </div>
                            <div className="text-base font-bold text-stone-700">
                              PKR {inq.budget.toLocaleString()}
                            </div>
                          </>
                        ) : (
                          <div className="text-xs text-stone-400 italic">No budget target specified</div>
                        )}
                      </div>
                    </div>

                    {/* Brief snippet */}
                    <div className="p-3.5 rounded-lg bg-paper-50 border border-paper-200 text-xs text-stone-700 line-clamp-2 leading-relaxed">
                      <strong className="text-stone-900 font-mono text-[11px] mr-2">Scope Digest:</strong>
                      {inq.description}
                    </div>

                    {/* Footer Row Actions */}
                    <div className="pt-2 border-t border-dashed border-paper-200 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3 text-xs font-mono text-stone-500">
                        {inq.deadline && (
                          <span>Target Deadline: {new Date(inq.deadline).toLocaleDateString()}</span>
                        )}
                        <span>•</span>
                        <span>Meezan Escrow Protected</span>
                      </div>

                      <div className="flex items-center gap-2">
                        {inq.status === 'quoted' && (
                          <Link href={`/inquiries/${inqId}`}>
                            <Button variant="primary" size="sm" className="font-mono text-xs px-4">
                              Review &amp; Accept Slip →
                            </Button>
                          </Link>
                        )}
                        <Link href={`/inquiries/${inqId}`}>
                          <Button variant="secondary" size="sm" className="font-mono text-xs">
                            View Discussion &amp; Docket
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

export default function CustomerInquiriesPage() {
  return (
    <RoleGuard allowedRoles={['customer']}>
      <Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center p-6 text-stone-500 font-mono text-xs">
            Loading inquiries portal...
          </div>
        }
      >
        <InquiriesContent />
      </Suspense>
    </RoleGuard>
  );
}
