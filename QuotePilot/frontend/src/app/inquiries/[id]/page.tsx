'use client';

import React, { useEffect, useState, useRef, use } from 'react';
import Link from 'next/link';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
  Send,
  ShieldCheck,
  CheckCircle2,
  Star,
  Clock,
  Coins,
  User,
  ArrowLeft,
  Lock,
  Sparkles,
  FileText,
  Check,
} from 'lucide-react';
import { QuotationSlipModal, QuotationData } from '@/components/quotation/QuotationSlipModal';
import { ReviewModal } from '@/components/review/ReviewModal';

interface InquiryDetail {
  id: string;
  referenceNumber: string;
  status: 'submitted' | 'in_discussion' | 'quoted' | 'accepted' | 'rejected' | 'expired' | 'cancelled' | 'in_progress' | 'completed';
  serviceTitle: string;
  description: string;
  budget?: number;
  deadline?: string;
  company?: {
    id: string;
    name: string;
    slug: string;
    city: string;
    mainCategory: string;
    logo?: { url: string };
  };
  quotationId?: string;
  createdAt: string;
  lastMessageAt: string;
  review?: {
    id: string;
    rating: number;
    comment?: string;
    reviewerDisplayName: string;
    createdAt: string;
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

export default function CustomerInquiryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const inquiryId = resolvedParams.id;

  const [inquiry, setInquiry] = useState<InquiryDetail | null>(null);
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [quotation, setQuotation] = useState<QuotationData | null>(null);
  const [isQuotationModalOpen, setIsQuotationModalOpen] = useState(false);
  const [isProcessingQuote, setIsProcessingQuote] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  // Message composing
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
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
        // No quotation slip issued yet
      }
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || 'Failed to load inquiry thread.');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptQuotation = async () => {
    if (!quotation) return;
    setIsProcessingQuote(true);
    try {
      await api.post(`/quotations/${quotation._id}/accept`);
      setIsQuotationModalOpen(false);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to accept quotation slip.');
    } finally {
      setIsProcessingQuote(false);
    }
  };

  const handleRejectQuotation = async (reason: string) => {
    if (!quotation) return;
    setIsProcessingQuote(true);
    try {
      await api.post(`/quotations/${quotation._id}/reject`, { reason });
      setIsQuotationModalOpen(false);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to decline quotation slip.');
    } finally {
      setIsProcessingQuote(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [inquiryId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
          <Link href="/inquiries">
            <Button variant="secondary" size="sm">
              ← Return to My Inquiries
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <RoleGuard allowedRoles={['customer']}>
      <div className="min-h-screen bg-paper-50 font-sans pb-16 selection:bg-teal-900 selection:text-white">
        {/* Navigation Breadcrumb & Docket Header */}
        <header className="bg-white border-b border-paper-200 py-4 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-mono text-stone-500">
                <Link href="/inquiries" className="hover:text-teal-900 transition-colors">
                  ← My Inquiries
                </Link>
                <span>›</span>
                <span className="text-stone-900 font-semibold">{inquiry.referenceNumber}</span>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-xl sm:text-2xl font-serif font-bold text-stone-900 tracking-tight">
                  {inquiry.serviceTitle}
                </h1>
                <Badge variant={inquiry.status === 'quoted' ? 'warning' : 'neutral'}>
                  {inquiry.status.toUpperCase()}
                </Badge>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {quotation && (
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => setIsQuotationModalOpen(true)}
                  className="font-mono text-xs px-5 bg-teal-900 hover:bg-teal-950 font-bold"
                >
                  {quotation.status === 'accepted' ? 'View Accepted Slip' : 'Inspect Formal Quotation Slip →'}
                </Button>
              )}
            </div>
          </div>
        </header>

        {/* Main Split Grid */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
          {quotation && (
            <Card className="p-4 bg-teal-50/70 border border-teal-200 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-900 text-white flex items-center justify-center font-mono font-bold text-xs shrink-0 shadow-xs">
                  <FileText className="w-5 h-5 text-teal-100" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-serif font-bold text-sm text-stone-900">
                      Official Quotation Slip #{quotation.referenceNumber} (v{quotation.version})
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
                    Binding Value:{' '}
                    <span className="font-bold text-teal-900 font-serif">
                      PKR {quotation.totalAmount.toLocaleString()}
                    </span>{' '}
                    across {quotation.milestones.length} milestone deliverable(s). Meezan Bank Escrow protected.
                  </p>
                </div>
              </div>

              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsQuotationModalOpen(true)}
                className="font-mono text-xs px-4"
              >
                {quotation.status === 'accepted' ? 'View Covenant Details' : 'Review & Sign Covenant'}
              </Button>
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left 5 Columns: Provider Studio & Original Brief */}
            <div className="lg:col-span-5 space-y-6">
              {/* Studio Info Card */}
              <Card className="p-5 space-y-3">
                <div className="flex items-center justify-between pb-3 border-b border-paper-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-paper-100 border border-paper-300 flex items-center justify-center font-serif font-bold text-teal-800 text-sm overflow-hidden shrink-0">
                      {inquiry.company?.logo?.url ? (
                        <img src={inquiry.company.logo.url} alt={inquiry.company.name} className="w-full h-full object-cover" />
                      ) : (
                        inquiry.company?.name.slice(0, 2).toUpperCase()
                      )}
                    </div>
                    <div>
                      <h3 className="font-serif font-bold text-sm text-stone-900">
                        {inquiry.company?.name}
                      </h3>
                      <p className="text-[11px] font-mono text-stone-500">
                        {inquiry.company?.city} • {inquiry.company?.mainCategory}
                      </p>
                    </div>
                  </div>
                  <Badge variant="approved">Vetted Studio</Badge>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs font-mono pt-1">
                  <div>
                    <span className="text-stone-400 block text-[10px] uppercase">Stated Target Budget</span>
                    <span className="font-bold text-stone-900 text-sm">
                      {inquiry.budget ? `PKR ${inquiry.budget.toLocaleString()}` : 'Flexible'}
                    </span>
                  </div>
                  <div>
                    <span className="text-stone-400 block text-[10px] uppercase">Target Delivery</span>
                    <span className="font-bold text-stone-900 text-sm">
                      {inquiry.deadline ? new Date(inquiry.deadline).toLocaleDateString() : 'SLA Standard'}
                    </span>
                  </div>
                </div>
              </Card>

              {/* Original Brief */}
              <Card className="p-5 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-paper-200">
                  <h3 className="font-serif font-bold text-sm text-stone-900">
                    Your Submitted Brief &amp; Specifications
                  </h3>
                  <span className="text-[10px] font-mono text-teal-800 bg-teal-50 px-2 py-0.5 rounded">
                    Audit Verified
                  </span>
                </div>
                <div className="p-4 rounded-xl bg-paper-50 border border-paper-200 text-xs text-stone-800 whitespace-pre-line leading-relaxed font-sans">
                  {inquiry.description}
                </div>
              </Card>

              {/* Escrow Assurance */}
              <Card className="p-5 space-y-2 bg-paper-100/60 border border-paper-200">
                <div className="text-xs uppercase tracking-wider font-mono font-bold text-teal-900">
                  SECP Arbitrated Escrow Standard
                </div>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Your communication and project covenants in this docket are archived for institutional dispute arbitration. Funds remain in Meezan Bank Escrow until milestone delivery sign-off.
                </p>
              </Card>

              {/* Review Card or Review Prompt (BR-14) */}
              {(quotation?.status === 'accepted' || inquiry.status === 'accepted' || inquiry.status === 'completed') && (
                <>
                  {inquiry.review ? (
                    <Card className="p-5 space-y-3 bg-amber-50/40 border border-amber-200 shadow-2xs">
                      <div className="flex items-center justify-between pb-2 border-b border-amber-200/60">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-0.5">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star
                                key={s}
                                className={`w-4 h-4 ${
                                  s <= (inquiry.review?.rating || 5)
                                    ? 'fill-amber-500 text-amber-500'
                                    : 'text-stone-300'
                                }`}
                              />
                            ))}
                          </div>
                          <span className="font-mono text-xs font-bold text-stone-900">
                            {inquiry.review.rating}.0 / 5.0
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-stone-500">
                          {new Date(inquiry.review.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-xs text-stone-800 italic leading-relaxed">
                        "{inquiry.review.comment || 'Client signed off on deliverable standards.'}"
                      </p>
                      <div className="text-[11px] font-mono text-stone-600 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-teal-800" />
                        <span>Published by <strong className="text-stone-900">{inquiry.review.reviewerDisplayName}</strong></span>
                      </div>
                    </Card>
                  ) : (
                    <Card className="p-5 space-y-3 bg-teal-50/50 border border-teal-200">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono uppercase tracking-widest text-teal-800 font-bold flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5 text-teal-800" />
                          <span>BR-14 Eligible</span>
                        </span>
                        <div className="flex items-center gap-0.5 text-amber-500">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star key={s} className="w-3 h-3 fill-amber-500 text-amber-500" />
                          ))}
                        </div>
                      </div>
                      <h4 className="font-serif font-bold text-sm text-stone-900">
                        Leave a Verified Institutional Review
                      </h4>
                      <p className="text-xs text-stone-600 leading-relaxed font-sans">
                        Your quotation covenant is active. Rate {inquiry.company?.name || 'the studio'} to guide future marketplace procurement.
                      </p>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => setIsReviewModalOpen(true)}
                        className="w-full font-mono text-xs bg-teal-900 hover:bg-teal-950 font-bold flex items-center justify-center gap-1.5"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Write Client Review →</span>
                      </Button>
                    </Card>
                  )}
                </>
              )}
            </div>

            {/* Right 7 Columns: Bilateral Discussion Thread */}
            <div className="lg:col-span-7">
              <Card className="flex flex-col h-[650px] overflow-hidden">
                <div className="p-4 border-b border-paper-200 bg-paper-100/60 flex items-center justify-between">
                  <div>
                    <h3 className="font-serif font-bold text-sm text-stone-900">
                      Direct Discussion Thread
                    </h3>
                    <p className="text-[10px] font-mono text-stone-500">
                      Bilateral clarifications with {inquiry.company?.name || 'the provider desk'}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-emerald-800">
                    <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                    Encrypted
                  </span>
                </div>

                {/* Messages Scroll Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-paper-50/30">
                  {messages.map((msg) => {
                    const isClient = msg.senderRole === 'customer';
                    return (
                      <div
                        key={msg.id}
                        className={`flex gap-3 max-w-[88%] ${isClient ? 'ml-auto flex-row-reverse text-right' : ''}`}
                      >
                        <div
                          className={`w-7 h-7 rounded-full text-xs font-mono font-bold flex items-center justify-center shrink-0 border ${
                            isClient
                              ? 'bg-teal-900 text-white border-teal-950'
                              : 'bg-paper-200 text-stone-800 border-paper-300'
                          }`}
                        >
                          {isClient ? 'ME' : 'ST'}
                        </div>

                        <div className="space-y-1">
                          <div className={`flex items-center gap-2 text-[10px] font-mono text-stone-400 ${isClient ? 'justify-end' : ''}`}>
                            <span className="font-semibold text-stone-700">
                              {msg.sender?.name || (isClient ? 'You' : inquiry.company?.name || 'Studio')}
                            </span>
                            <span>•</span>
                            <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>

                          <div
                            className={`p-3.5 rounded-2xl text-xs leading-relaxed ${
                              isClient
                                ? 'bg-teal-900 text-white rounded-tr-none'
                                : 'bg-white border border-paper-200 text-stone-800 rounded-tl-none shadow-xs'
                            }`}
                          >
                            {msg.type === 'initial_request' && (
                              <div className="text-[10px] font-mono text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-100 mb-1.5 inline-block">
                                Intake Brief
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
                    placeholder="Type your clarification or reply to the studio..."
                    className="flex-1 px-3.5 py-2 text-xs font-mono rounded-lg border border-paper-300 bg-paper-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-800"
                  />
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    className="font-mono text-xs px-4 bg-teal-900 hover:bg-teal-950 flex items-center gap-1.5 font-bold"
                    disabled={!newMessage.trim() || isSending}
                    isLoading={isSending}
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send</span>
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
            userRole="customer"
            onAccept={handleAcceptQuotation}
            onReject={handleRejectQuotation}
            isProcessing={isProcessingQuote}
          />
        )}

        {/* Client Review Submission Modal (BR-14) */}
        {inquiry && (
          <ReviewModal
            isOpen={isReviewModalOpen}
            onClose={() => setIsReviewModalOpen(false)}
            inquiryId={inquiry.id}
            companyName={inquiry.company?.name || 'Studio'}
            serviceTitle={inquiry.serviceTitle}
            onSuccess={(newReview) => {
              setInquiry({
                ...inquiry,
                review: {
                  id: newReview.id,
                  rating: newReview.rating,
                  comment: newReview.comment,
                  reviewerDisplayName: newReview.reviewerDisplayName,
                  createdAt: new Date().toISOString(),
                },
              });
            }}
          />
        )}
      </div>
    </RoleGuard>
  );
}
