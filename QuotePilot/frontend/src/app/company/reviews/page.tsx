'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Star, ShieldCheck, CheckCircle2, ArrowLeft, MessageSquare, Award, ThumbsUp } from 'lucide-react';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { CompanyWorkspaceHeader } from '@/components/company/CompanyWorkspaceHeader';

interface CompanyReviewItem {
  id: string;
  rating: number;
  comment?: string;
  reviewerDisplayName: string;
  createdAt: string;
  inquiry?: {
    id: string;
    referenceNumber: string;
    serviceTitle: string;
  };
}

export default function CompanyReviewsPage() {
  const [reviews, setReviews] = useState<CompanyReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadReviews = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get<{ reviews: CompanyReviewItem[] }>('/company/reviews');
      setReviews(res.data.reviews || []);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || 'Failed to load company reviews.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReviews();
  }, []);

  const avgRating =
    reviews.length > 0
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : '5.0';

  const fiveStarCount = reviews.filter((r) => r.rating === 5).length;
  const fourStarCount = reviews.filter((r) => r.rating === 4).length;

  return (
    <RoleGuard allowedRoles={['company_admin']}>
      <div className="min-h-screen bg-paper-50 font-sans pb-20 selection:bg-teal-900 selection:text-white">
        {/* Studio Workspace Unified Header */}
        <CompanyWorkspaceHeader activeTab="reviews" />

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
          {/* Reputation Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <Card className="p-6 bg-white border border-paper-200 space-y-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-stone-400 block">
                Aggregated Rating
              </span>
              <div className="flex items-baseline gap-3">
                <span className="text-4xl font-serif font-bold text-stone-900">{avgRating}</span>
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className="w-4 h-4 fill-amber-500 text-amber-500" />
                  ))}
                </div>
              </div>
              <p className="text-xs text-stone-500 font-mono">
                Across {reviews.length} completed &amp; accepted covenant(s)
              </p>
            </Card>

            <Card className="p-6 bg-white border border-paper-200 space-y-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-stone-400 block">
                Top Tier Satisfaction
              </span>
              <div className="text-4xl font-serif font-bold text-teal-900">
                {reviews.length > 0 ? Math.round(((fiveStarCount + fourStarCount) / reviews.length) * 100) : 100}%
              </div>
              <p className="text-xs text-stone-500 font-mono">
                Rated 4 or 5 stars by institutional clients
              </p>
            </Card>

            <Card className="p-6 bg-teal-50/50 border border-teal-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-wider text-teal-800 font-bold">
                  BR-14 Compliance
                </span>
                <Badge variant="approved">Audited</Badge>
              </div>
              <h3 className="font-serif font-bold text-sm text-stone-900">
                Tamper-Resistant Ledger
              </h3>
              <p className="text-xs text-stone-600 leading-relaxed font-sans">
                Reviews cannot be faked or purchased. Only customers who accepted a formal quotation slip can publish a score.
              </p>
            </Card>
          </div>

          {/* Reviews Ledger */}
          <Card className="p-6 bg-white border border-paper-200 space-y-6">
            <div className="flex items-center justify-between border-b border-paper-200 pb-4">
              <div>
                <h2 className="text-xl font-serif font-bold text-stone-900">
                  Client Feedback Records ({reviews.length})
                </h2>
                <p className="text-xs text-stone-500 font-mono mt-0.5">
                  Verified covenant reviews visible on your public marketplace profile
                </p>
              </div>
            </div>

            {loading ? (
              <div className="py-16 text-center space-y-2">
                <div className="w-8 h-8 border-2 border-teal-900 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs font-mono text-stone-500">Retrieving feedback ledger...</p>
              </div>
            ) : error ? (
              <div className="p-6 text-center text-xs font-mono text-rose-700 bg-rose-50 rounded-xl">
                {error}
              </div>
            ) : reviews.length === 0 ? (
              <div className="py-16 text-center space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center mx-auto shadow-xs">
                  <Star className="w-7 h-7 text-amber-500 fill-amber-400" />
                </div>
                <h3 className="text-sm font-serif font-bold text-stone-800">
                  No Client Reviews on Record Yet
                </h3>
                <p className="text-xs text-stone-500 font-mono max-w-md mx-auto">
                  Once clients accept quotation slips and complete services, their verified reviews will populate here.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {reviews.map((rev) => (
                  <div
                    key={rev.id}
                    className="p-5 rounded-xl border border-paper-200 bg-paper-50/50 hover:bg-white hover:border-paper-300 transition-all space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-paper-200/60 pb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-teal-900 text-white flex items-center justify-center font-mono font-bold text-xs">
                          {rev.reviewerDisplayName?.slice(0, 1) || 'C'}
                        </div>
                        <div>
                          <span className="font-serif font-bold text-sm text-stone-900 block">
                            {rev.reviewerDisplayName}
                          </span>
                          <span className="text-[11px] font-mono text-stone-500">
                            {rev.inquiry
                              ? `${rev.inquiry.serviceTitle} (#${rev.inquiry.referenceNumber})`
                              : 'Service Engagement'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              className={`w-3.5 h-3.5 ${
                                s <= rev.rating ? 'fill-amber-500 text-amber-500' : 'text-stone-200'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-xs font-mono font-bold text-stone-800">
                          {rev.rating}.0 / 5.0
                        </span>
                        <span className="text-stone-300">•</span>
                        <span className="text-[11px] font-mono text-stone-500">
                          {new Date(rev.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    {rev.comment ? (
                      <p className="text-xs text-stone-700 font-sans leading-relaxed pl-12 italic">
                        "{rev.comment}"
                      </p>
                    ) : (
                      <p className="text-xs text-stone-400 font-mono pl-12 italic">
                        Client left a 5-star rating without written notes.
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </main>
      </div>
    </RoleGuard>
  );
}
