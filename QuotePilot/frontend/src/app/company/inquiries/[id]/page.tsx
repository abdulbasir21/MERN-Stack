'use client';

import React, { useEffect, useState, useRef, use } from 'react';
import Link from 'next/link';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useAuth } from '@/context/AuthContext';
import { QuotationSlipModal, QuotationData } from '@/components/quotation/QuotationSlipModal';
import { Sparkles, ArrowLeft, Send, FileText, CheckCircle2 } from 'lucide-react';

interface InquiryDetail {
  id: string;
  referenceNumber: string;
  status: 'submitted' | 'in_discussion' | 'quoted' | 'accepted' | 'rejected' | 'expired' | 'cancelled';
  serviceTitle: string;
  description: string;
  budget?: number;
  deadline?: string;
  customer?: {
    name: string;
    email?: string;
    phone?: string;
  };
  quotationId?: string;
  createdAt: string;
  lastMessageAt: string;
  aiSummary?: {
    status: string;
    summary?: string;
    requirements?: string[];
    suggestedNextSteps?: string[];
    model?: string;
    generatedAt?: string;
  };
}

interface ThreadMessage {
  id: string;
  inquiryId: string;
  sender: {
    id: string;
    name: string;
    role: 'customer' | 'company_admin';
  };
  senderRole: 'customer' | 'company_admin';
  type: 'initial_request' | 'text';
  text: string;
  createdAt: string;
}

export default function CompanyInquiryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const inquiryId = resolvedParams.id;
  const { user } = useAuth();

  const [inquiry, setInquiry] = useState<InquiryDetail | null>(null);
  const [quotation, setQuotation] = useState<QuotationData | null>(null);
  const [isQuotationModalOpen, setIsQuotationModalOpen] = useState(false);
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Message composing
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isRegeneratingAi, setIsRegeneratingAi] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [inqRes, msgRes] = await Promise.all([
        api.get<{ inquiry: InquiryDetail }>(`/inquiries/${inquiryId}`),
        api.get<{ messages: ThreadMessage[] }>(`/inquiries/${inquiryId}/messages`),
      ]);

      setInquiry(inqRes.data.inquiry);
      setMessages(msgRes.data.messages || []);

      // If inquiry is quoted or has quotationId, load the quotation slip
      try {
        const quoteRes = await api.get<{ quotation: QuotationData }>(`/inquiries/${inquiryId}/quote`);
        if (quoteRes.data?.quotation) {
          setQuotation(quoteRes.data.quotation);
        }
      } catch {
        // No quotation issued yet
      }
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || 'Failed to load inquiry thread.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [inquiryId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle sending a message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || isSending) return;

    setIsSending(true);
    try {
      const res = await api.post<{ message: ThreadMessage }>(`/inquiries/${inquiryId}/messages`, {
        text: newMessage.trim(),
      });

      setMessages((prev) => [...prev, res.data.message]);
      setNewMessage('');

      // If inquiry was 'submitted', locally update status to 'in_discussion'
      if (inquiry && inquiry.status === 'submitted') {
        setInquiry({ ...inquiry, status: 'in_discussion' });
      }
    } catch (err: unknown) {
      const e = err as { message?: string };
      alert(e.message || 'Failed to send message.');
    } finally {
      setIsSending(false);
    }
  };

  // Handle regenerating AI Brief Summary (Step 2)
  const handleRegenerateSummary = async () => {
    setIsRegeneratingAi(true);
    try {
      const res = await api.post<{ aiSummary: InquiryDetail['aiSummary'] }>(
        `/inquiries/${inquiryId}/summary/regenerate`
      );
      if (inquiry) {
        setInquiry({ ...inquiry, aiSummary: res.data.aiSummary });
      }
    } catch (err: unknown) {
      const e = err as { message?: string };
      alert(e.message || 'Failed to regenerate AI brief summary.');
    } finally {
      setIsRegeneratingAi(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs font-mono text-stone-500">Loading inquiry docket and thread...</p>
      </div>
    );
  }

  if (error || !inquiry) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4 text-center">
        <Card className="p-8 space-y-4">
          <p className="text-rose-700 text-xs font-mono">{error || 'Inquiry not found.'}</p>
          <Link href="/company/inquiries">
            <Button variant="secondary" size="sm">
              ← Return to Inquiries Desk
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <RoleGuard allowedRoles={['company_admin']}>
      <div className="min-h-screen bg-paper-50 font-sans pb-16 selection:bg-teal-900 selection:text-white">
        {/* Navigation Breadcrumb & Docket Header */}
        <header className="bg-white border-b border-paper-200 py-4 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-mono text-stone-500">
                <Link href="/company/inquiries" className="hover:text-teal-900 transition-colors">
                  ← Inquiries Desk
                </Link>
                <span>›</span>
                <span className="text-stone-900 font-semibold">{inquiry.referenceNumber}</span>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-xl sm:text-2xl font-serif font-bold text-stone-900 tracking-tight">
                  {inquiry.serviceTitle}
                </h1>
                <Badge variant={inquiry.status === 'submitted' ? 'warning' : 'neutral'}>
                  {inquiry.status.toUpperCase()}
                </Badge>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              {quotation ? (
                <>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setIsQuotationModalOpen(true)}
                    className="font-mono text-xs"
                  >
                    Inspect Official Slip
                  </Button>
                  <Link href={`/company/inquiries/${inquiryId}/quote`}>
                    <Button variant="primary" size="sm" className="font-mono text-xs bg-teal-900 hover:bg-teal-950 font-bold">
                      Revise Slip (v{quotation.version + 1}) →
                    </Button>
                  </Link>
                </>
              ) : (
                <Link href={`/company/inquiries/${inquiryId}/quote`}>
                  <Button variant="primary" size="md" className="font-mono text-xs px-5 bg-teal-900 hover:bg-teal-950 font-bold">
                    Draft Milestone Quotation Slip →
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </header>

        {/* Main Split Grid: Scope & AI Dossier (Left) + Bilateral Discussion Thread (Right) */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
          {quotation && (
            <Card className="p-4 bg-teal-50/70 border border-teal-200 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-teal-900 text-white flex items-center justify-center font-mono font-bold text-xs shrink-0">
                  SLIP
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-serif font-bold text-sm text-stone-900">
                      Dispatched Quotation Slip #{quotation.referenceNumber} (v{quotation.version})
                    </h3>
                    <Badge
                      variant={
                        quotation.status === 'accepted'
                          ? 'success'
                          : quotation.status === 'rejected'
                          ? 'destructive'
                          : 'warning'
                      }
                      className="text-[10px] uppercase font-mono"
                    >
                      {quotation.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-stone-600 mt-0.5">
                    Total Value:{' '}
                    <span className="font-bold text-teal-900 font-serif">
                      PKR {quotation.totalAmount.toLocaleString()}
                    </span>{' '}
                    across {quotation.milestones.length} milestone deliverable(s). Valid until{' '}
                    {new Date(quotation.validUntil).toLocaleDateString()}.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsQuotationModalOpen(true)}
                  className="font-mono text-xs"
                >
                  Inspect Slip
                </Button>
                <Link href={`/company/inquiries/${inquiryId}/quote`}>
                  <Button
                    variant="primary"
                    size="sm"
                    className="font-mono text-xs bg-teal-900 hover:bg-teal-950 font-bold"
                  >
                    Revise Terms
                  </Button>
                </Link>
              </div>
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left 6 Columns: Client Brief & AI Brief Summary */}
            <div className="lg:col-span-6 space-y-6">
              {/* Client Profile Card */}
              <Card className="p-5 space-y-3">
                <div className="flex items-center justify-between pb-3 border-b border-paper-200">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-paper-200 text-stone-800 font-bold text-xs flex items-center justify-center font-mono">
                      {inquiry.customer?.name ? inquiry.customer.name.slice(0, 2).toUpperCase() : 'CL'}
                    </div>
                    <div>
                      <h3 className="font-serif font-bold text-sm text-stone-900">
                        {inquiry.customer?.name || 'Verified Client'}
                      </h3>
                      <p className="text-[11px] font-mono text-stone-500">
                        {inquiry.customer?.email} {inquiry.customer?.phone && `• ${inquiry.customer.phone}`}
                      </p>
                    </div>
                  </div>
                  <Badge variant="approved">SECP Verified Filer</Badge>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs font-mono pt-1">
                  <div>
                    <span className="text-stone-400 block text-[10px] uppercase">Client Target Budget</span>
                    <span className="font-bold text-stone-900 text-sm">
                      {inquiry.budget ? `PKR ${inquiry.budget.toLocaleString()}` : 'Not Specified'}
                    </span>
                  </div>
                  <div>
                    <span className="text-stone-400 block text-[10px] uppercase">Required Delivery</span>
                    <span className="font-bold text-stone-900 text-sm">
                      {inquiry.deadline ? new Date(inquiry.deadline).toLocaleDateString() : 'Flexible SLA'}
                    </span>
                  </div>
                </div>
              </Card>

              {/* Original Client Scope Specification */}
              <Card className="p-5 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-paper-200">
                  <h3 className="font-serif font-bold text-sm text-stone-900">
                    Original Client Brief &amp; Scope Specification
                  </h3>
                  <span className="text-[10px] font-mono text-stone-400">Untrusted Input</span>
                </div>
                <div className="p-4 rounded-xl bg-paper-50 border border-paper-200 text-xs text-stone-800 whitespace-pre-line leading-relaxed font-sans">
                  {inquiry.description}
                </div>
              </Card>

              {/* AI Step 2: Brief Summary Dossier */}
              <Card className="p-5 space-y-4 border-2 border-teal-800/30 bg-white">
                <div className="flex items-center justify-between pb-3 border-b border-paper-200">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-teal-900 text-white text-[10px] font-mono font-bold">
                      AI
                    </span>
                    <div>
                      <h3 className="font-serif font-bold text-sm text-stone-900">
                        QuotePilot AI Brief Summary
                      </h3>
                      <p className="text-[10px] font-mono text-stone-400">
                        Provider Desk Only • Hidden from customer (BR-09)
                      </p>
                    </div>
                  </div>

                  <Button
                    variant="secondary"
                    size="sm"
                    className="text-xs font-mono"
                    onClick={handleRegenerateSummary}
                    isLoading={isRegeneratingAi}
                  >
                    Regenerate ↻
                  </Button>
                </div>

                {inquiry.aiSummary?.summary ? (
                  <div className="space-y-4 text-xs">
                    {/* Executive Summary */}
                    <div>
                      <span className="text-[10px] font-mono uppercase font-bold text-stone-500 tracking-wider block mb-1">
                        Executive Scope Digest
                      </span>
                      <p className="text-stone-800 leading-relaxed bg-paper-50 p-3 rounded-lg border border-paper-200">
                        {inquiry.aiSummary.summary}
                      </p>
                    </div>

                    {/* Key Deliverables */}
                    {inquiry.aiSummary.requirements && inquiry.aiSummary.requirements.length > 0 && (
                      <div>
                        <span className="text-[10px] font-mono uppercase font-bold text-teal-900 tracking-wider block mb-1">
                          Key Mandated Deliverables
                        </span>
                        <ul className="space-y-1 list-disc list-inside text-stone-700">
                          {inquiry.aiSummary.requirements.map((req, idx) => (
                            <li key={idx} className="font-medium">
                              {req}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Suggested Next Steps */}
                    {inquiry.aiSummary.suggestedNextSteps && inquiry.aiSummary.suggestedNextSteps.length > 0 && (
                      <div className="pt-2 border-t border-paper-100">
                        <span className="text-[10px] font-mono uppercase font-bold text-amber-900 tracking-wider block mb-1">
                          Recommended Desk Actions
                        </span>
                        <ul className="space-y-1 text-stone-600">
                          {inquiry.aiSummary.suggestedNextSteps.map((step, idx) => (
                            <li key={idx} className="flex items-start gap-1.5">
                              <span className="text-amber-700 font-bold">→</span>
                              <span>{step}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-6 space-y-3">
                    <p className="text-xs text-stone-500 font-mono">
                      AI Executive Summary is not yet generated for this docket.
                    </p>
                    <Button
                      variant="primary"
                      size="sm"
                      className="font-mono text-xs flex items-center gap-1.5 mx-auto"
                      onClick={handleRegenerateSummary}
                      isLoading={isRegeneratingAi}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Generate AI Summary Now</span>
                    </Button>
                  </div>
                )}
              </Card>
            </div>

            {/* Right 6 Columns: Bilateral Discussion Thread */}
            <div className="lg:col-span-6">
              <Card className="flex flex-col h-[650px] overflow-hidden">
                {/* Thread Header */}
                <div className="p-4 border-b border-paper-200 bg-paper-100/60 flex items-center justify-between">
                  <div>
                    <h3 className="font-serif font-bold text-sm text-stone-900">
                      Bilateral Inquiry Thread &amp; Clarifications
                    </h3>
                    <p className="text-[10px] font-mono text-stone-500">
                      Direct messaging inside this inquiry docket (BR-12)
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-emerald-800">
                    <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                    Audit Log Active
                  </span>
                </div>

                {/* Messages Scroll Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-paper-50/30">
                  {messages.map((msg) => {
                    const isCompany = msg.senderRole === 'company_admin';
                    return (
                      <div
                        key={msg.id}
                        className={`flex gap-3 max-w-[88%] ${isCompany ? 'ml-auto flex-row-reverse text-right' : ''}`}
                      >
                        <div
                          className={`w-7 h-7 rounded-full text-xs font-mono font-bold flex items-center justify-center shrink-0 border ${
                            isCompany
                              ? 'bg-teal-900 text-white border-teal-950'
                              : 'bg-paper-200 text-stone-800 border-paper-300'
                          }`}
                        >
                          {isCompany ? 'PD' : 'CL'}
                        </div>

                        <div className="space-y-1">
                          <div className={`flex items-center gap-2 text-[10px] font-mono text-stone-400 ${isCompany ? 'justify-end' : ''}`}>
                            <span className="font-semibold text-stone-700">
                              {msg.sender?.name || (isCompany ? 'Provider Desk' : 'Client')}
                            </span>
                            <span>•</span>
                            <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>

                          <div
                            className={`p-3.5 rounded-2xl text-xs leading-relaxed ${
                              isCompany
                                ? 'bg-teal-900 text-white rounded-tr-none'
                                : 'bg-white border border-paper-200 text-stone-800 rounded-tl-none shadow-xs'
                            }`}
                          >
                            {msg.type === 'initial_request' && (
                              <div className="text-[10px] font-mono text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-100 mb-1.5 inline-block">
                                Initial Intake Brief
                              </div>
                            )}
                            <p className="whitespace-pre-line text-left">{msg.text}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Compose Form */}
                <form onSubmit={handleSendMessage} className="p-3 border-t border-paper-200 bg-white flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type clarification or scope question to customer..."
                    className="flex-1 px-3.5 py-2 text-xs font-mono rounded-lg border border-paper-300 bg-paper-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-800"
                  />
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    className="font-mono text-xs px-4"
                    disabled={!newMessage.trim() || isSending}
                    isLoading={isSending}
                  >
                    Send
                  </Button>
                </form>
              </Card>
            </div>
          </div>
        </main>

        {/* Official Quotation Slip Preview Modal */}
        {quotation && (
          <QuotationSlipModal
            isOpen={isQuotationModalOpen}
            onClose={() => setIsQuotationModalOpen(false)}
            quotation={quotation}
            userRole="company_admin"
          />
        )}
      </div>
    </RoleGuard>
  );
}
