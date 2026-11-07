'use client';

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { CompanyWorkspaceHeader } from '@/components/company/CompanyWorkspaceHeader';
import {
  Inbox,
  AlertCircle,
  MessageSquare,
  CheckCircle2,
  Star,
  Search,
  Clock,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  Building2,
  Home,
  X,
} from 'lucide-react';

interface DeskStats {
  total: number;
  actionRequired: number;
  inDiscussion: number;
  quoted: number;
  accepted: number;
  rejected: number;
}

interface InquiryDeskItem {
  id: string;
  referenceNumber: string;
  serviceTitle: string;
  status: 'submitted' | 'in_discussion' | 'quoted' | 'accepted' | 'rejected' | 'expired' | 'cancelled';
  lastMessagePreview?: string;
  lastMessageAt: string;
  unreadCount: number;
  hasQuotation: boolean;
  createdAt: string;
  customer?: {
    id: string;
    name: string;
    email: string;
  };
  aiSummary?: {
    status: string;
    summary?: string;
  };
}

function CompanyInquiriesDeskContent() {
  const [stats, setStats] = useState<DeskStats | null>(null);
  const [inquiries, setInquiries] = useState<InquiryDeskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'actionRequired' | 'inDiscussion' | 'quoted' | 'accepted' | 'archived'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [statsRes, inqRes] = await Promise.all([
        api.get<{ stats: DeskStats }>('/inquiries/desk/stats'),
        api.get<{ items: InquiryDeskItem[] }>('/inquiries'),
      ]);

      setStats(statsRes.data.stats);
      // Backend returns either items array directly or inside data
      const items = Array.isArray(inqRes.data)
        ? inqRes.data
        : (inqRes.data as any).items || (inqRes.data as any).inquiries || [];
      setInquiries(items);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || 'Failed to load provider inquiries desk.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredInquiries = inquiries.filter((inq) => {
    if (activeTab === 'actionRequired' && inq.status !== 'submitted') return false;
    if (activeTab === 'inDiscussion' && inq.status !== 'in_discussion') return false;
    if (activeTab === 'quoted' && inq.status !== 'quoted') return false;
    if (activeTab === 'accepted' && inq.status !== 'accepted') return false;
    if (activeTab === 'archived' && !['rejected', 'expired', 'cancelled'].includes(inq.status)) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const refMatch = inq.referenceNumber?.toLowerCase().includes(q);
      const titleMatch = inq.serviceTitle?.toLowerCase().includes(q);
      const clientMatch = inq.customer?.name?.toLowerCase().includes(q) || inq.customer?.email?.toLowerCase().includes(q);
      if (!refMatch && !titleMatch && !clientMatch) return false;
    }

    return true;
  });

  const getStatusBadge = (status: InquiryDeskItem['status']) => {
    switch (status) {
      case 'submitted':
        return <Badge variant="warning">Action Required (New RFQ)</Badge>;
      case 'in_discussion':
        return <Badge variant="neutral">In Discussion</Badge>;
      case 'quoted':
        return <Badge variant="neutral">Quotation Dispatched</Badge>;
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
      {/* Studio Workspace Unified Header & Onboarding Guide */}
      <CompanyWorkspaceHeader activeTab="inquiries" inquiryCount={inquiries.length} />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        {/* 1. Operational KPI Metric Cards */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Inbound Leads */}
          <Card className="p-5 flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <span className="text-xs font-mono text-stone-500 uppercase tracking-wider">
                Total Inbound Inquiries
              </span>
              <span className="p-1.5 rounded-lg bg-teal-50 text-teal-900 font-mono text-xs font-bold flex items-center gap-1 border border-teal-100">
                <Inbox className="w-3.5 h-3.5 text-teal-800" />
                <span>INBOX</span>
              </span>
            </div>
            <div className="mt-4">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-serif font-bold text-stone-900">
                  {stats?.total ?? inquiries.length}
                </span>
                <span className="text-xs font-mono text-stone-400">total received</span>
              </div>
              <p className="text-xs font-mono text-teal-900 mt-1 flex items-center gap-1">
                <span>{stats?.actionRequired ?? 0}</span> require quotation response
              </p>
            </div>
          </Card>

          {/* Card 2: Action Required */}
          <Card
            className={`p-5 flex flex-col justify-between ${
              (stats?.actionRequired ?? 0) > 0 ? 'border-2 border-amber-600 bg-amber-50/20' : ''
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-mono font-bold text-amber-900 uppercase tracking-wider">
                  Action Required
                </span>
                {(stats?.actionRequired ?? 0) > 0 && (
                  <span className="w-2 h-2 rounded-full bg-amber-600 animate-ping" />
                )}
              </div>
              <span className="p-1.5 rounded-lg bg-amber-100 text-amber-900 font-mono text-xs font-bold flex items-center gap-1 border border-amber-200">
                <Clock className="w-3.5 h-3.5" />
                <span>SLA</span>
              </span>
            </div>
            <div className="mt-4">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-serif font-bold text-amber-900">
                  {stats?.actionRequired ?? 0}
                </span>
                <span className="text-xs font-mono text-amber-700 font-semibold">
                  Awaiting Quote
                </span>
              </div>
              <p className="text-xs font-mono text-stone-500 mt-1">24-hour response target</p>
            </div>
          </Card>

          {/* Card 3: In Discussion */}
          <Card className="p-5 flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <span className="text-xs font-mono text-stone-500 uppercase tracking-wider">
                Active Discussions
              </span>
              <span className="p-1.5 rounded-lg bg-paper-100 text-stone-700 font-mono text-xs font-bold flex items-center gap-1 border border-paper-200">
                <MessageSquare className="w-3.5 h-3.5" />
                <span>THREAD</span>
              </span>
            </div>
            <div className="mt-4">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-serif font-bold text-stone-900">
                  {stats?.inDiscussion ?? 0}
                </span>
                <span className="text-xs font-mono text-stone-400">clarifying scope</span>
              </div>
              <p className="text-xs font-mono text-stone-500 mt-1">Bilateral message threads</p>
            </div>
          </Card>

          {/* Card 4: Accepted Covenants */}
          <Card className="p-5 flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <span className="text-xs font-mono text-stone-500 uppercase tracking-wider">
                Accepted Contracts
              </span>
              <span className="p-1.5 rounded-lg bg-teal-50 text-teal-900 font-mono text-xs font-bold flex items-center gap-1 border border-teal-100">
                <ShieldCheck className="w-3.5 h-3.5 text-teal-800" />
                <span>VAULT</span>
              </span>
            </div>
            <div className="mt-4">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-serif font-bold text-teal-900">
                  {stats?.accepted ?? 0}
                </span>
                <span className="text-xs font-mono text-stone-400">escrow funded</span>
              </div>
              <p className="text-xs font-mono text-teal-900 mt-1">Meezan Escrow Protected</p>
            </div>
          </Card>
        </section>

        {/* 2. Filter Bar & Search */}
        <div className="bg-white border border-paper-200 rounded-xl p-3 shadow-xs space-y-3">
          <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-paper-100 text-xs font-mono">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                activeTab === 'all'
                  ? 'bg-teal-900 text-white font-bold'
                  : 'text-stone-600 hover:bg-paper-100'
              }`}
            >
              <span>All Inquiries</span>
              <span className="px-1.5 py-0.2 bg-black/10 rounded-full text-[10px]">{inquiries.length}</span>
            </button>

            <button
              onClick={() => setActiveTab('actionRequired')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                activeTab === 'actionRequired'
                  ? 'bg-amber-800 text-white font-bold'
                  : 'text-stone-600 hover:bg-paper-100'
              }`}
            >
              <span>Action Required</span>
              <span className="px-1.5 py-0.2 bg-amber-100 text-amber-900 font-bold rounded-full text-[10px]">
                {stats?.actionRequired ?? 0}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('inDiscussion')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                activeTab === 'inDiscussion'
                  ? 'bg-teal-900 text-white font-bold'
                  : 'text-stone-600 hover:bg-paper-100'
              }`}
            >
              <span>In Discussion</span>
              <span className="px-1.5 py-0.2 bg-paper-200 rounded-full text-[10px]">
                {stats?.inDiscussion ?? 0}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('quoted')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                activeTab === 'quoted'
                  ? 'bg-teal-900 text-white font-bold'
                  : 'text-stone-600 hover:bg-paper-100'
              }`}
            >
              <span>Quoted</span>
              <span className="px-1.5 py-0.2 bg-paper-200 rounded-full text-[10px]">
                {stats?.quoted ?? 0}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('accepted')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                activeTab === 'accepted'
                  ? 'bg-teal-900 text-white font-bold'
                  : 'text-stone-600 hover:bg-paper-100'
              }`}
            >
              <span>Accepted</span>
              <span className="px-1.5 py-0.2 bg-paper-200 rounded-full text-[10px]">
                {stats?.accepted ?? 0}
              </span>
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between pt-1">
            <div className="relative w-full sm:w-80">
              <input
                type="text"
                placeholder="Search by client, RFQ #, service..."
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

        {/* 3. Inquiries List */}
        {loading ? (
          <div className="py-16 text-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs font-mono text-stone-500">Loading incoming inquiries...</p>
          </div>
        ) : error ? (
          <Card className="p-8 text-center space-y-3">
            <p className="text-rose-700 text-xs font-mono">{error}</p>
            <Button variant="secondary" size="sm" onClick={loadData}>
              Try Again
            </Button>
          </Card>
        ) : filteredInquiries.length === 0 ? (
          <Card className="p-12 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-teal-50 border border-teal-100 text-teal-800 flex items-center justify-center mx-auto shadow-xs">
              <Inbox className="w-7 h-7 text-teal-800" />
            </div>
            <div className="space-y-1">
              <h3 className="font-serif font-bold text-lg text-stone-900">No Inbound Inquiries</h3>
              <p className="text-xs text-stone-500 max-w-sm mx-auto">
                {searchQuery || activeTab !== 'all'
                  ? 'No inquiry dockets match your search criteria.'
                  : 'No client has requested a quotation yet. Your services are published and visible on the marketplace.'}
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Link href="/companies">
                <Button variant="primary" size="sm" className="font-mono text-xs flex items-center gap-1.5 bg-teal-900 hover:bg-teal-950 font-bold">
                  <Building2 className="w-3.5 h-3.5" />
                  <span>View Public Marketplace</span>
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
              const inqId = inq.id;
              return (
                <article
                  key={inqId}
                  className={`bg-white rounded-xl overflow-hidden border transition-all ${
                    inq.status === 'submitted'
                      ? 'border-2 border-amber-600 shadow-sm'
                      : 'border-paper-200 hover:border-paper-300'
                  }`}
                >
                  <div className="bg-paper-100/70 px-6 py-3 border-b border-paper-200 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-teal-950 px-2 py-0.5 rounded bg-white border border-paper-300">
                        {inq.referenceNumber}
                      </span>
                      <span className="text-stone-300">•</span>
                      <span className="text-stone-500">
                        Received {new Date(inq.createdAt).toLocaleDateString()}
                      </span>
                      {inq.unreadCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-600 text-white text-[10px] font-bold">
                          {inq.unreadCount} new {inq.unreadCount === 1 ? 'message' : 'messages'}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {getStatusBadge(inq.status)}
                    </div>
                  </div>

                  <div className="p-6 space-y-4">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      <div className="space-y-1.5 flex-1">
                        <h2 className="text-lg font-serif font-bold text-stone-900 hover:text-teal-900 transition-colors">
                          {inq.serviceTitle}
                        </h2>

                        <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-stone-600">
                          <span className="font-semibold text-stone-900">
                            Client: {inq.customer?.name || 'Verified Client'}
                          </span>
                          {inq.customer?.email && <span>• {inq.customer.email}</span>}
                          <Badge variant="approved">SECP Filer Verified</Badge>
                        </div>
                      </div>

                      <div className="text-right">
                        <Link href={`/company/inquiries/${inqId}`}>
                          <Button variant="primary" size="sm" className="font-mono text-xs px-5">
                            Open Docket &amp; Quote →
                          </Button>
                        </Link>
                      </div>
                    </div>

                    {inq.lastMessagePreview && (
                      <div className="p-3 rounded-lg bg-paper-50 border border-paper-200 text-xs text-stone-700 line-clamp-2 leading-relaxed">
                        <strong className="text-stone-900 font-mono text-[11px] mr-2">Latest Message:</strong>
                        {inq.lastMessagePreview}
                      </div>
                    )}
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

export default function CompanyInquiriesPage() {
  return (
    <RoleGuard allowedRoles={['company_admin']}>
      <Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center p-6 text-stone-500 font-mono text-xs">
            Loading provider desk...
          </div>
        }
      >
        <CompanyInquiriesDeskContent />
      </Suspense>
    </RoleGuard>
  );
}
