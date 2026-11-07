'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, ShieldCheck, Sparkles, X } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  inquiryId: string;
  companyName: string;
  serviceTitle: string;
  onSuccess: (review: { id: string; rating: number; comment?: string; reviewerDisplayName: string }) => void;
}

export function ReviewModal({
  isOpen,
  onClose,
  inquiryId,
  companyName,
  serviceTitle,
  onSuccess,
}: ReviewModalProps) {
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/proxy/inquiries/${inquiryId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, comment: comment.trim() || undefined }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to submit review.');
      }

      onSuccess(data.data.review);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error submitting review.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getScoreDescription = (r: number) => {
    switch (r) {
      case 5:
        return '5.0 — Exceptional Execution & SLA Standard';
      case 4:
        return '4.0 — High Quality Deliverables';
      case 3:
        return '3.0 — Satisfactory Commercial Execution';
      case 2:
        return '2.0 — Deliverable Deficiencies Observed';
      default:
        return '1.0 — Unsatisfactory Performance';
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 12 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-lg"
        >
          <Card className="p-6 md:p-8 space-y-6 bg-white border border-paper-border shadow-modal relative">
            <button
              onClick={onClose}
              className="absolute top-5 right-5 text-ink-muted hover:text-ink-primary font-mono text-sm p-1 rounded-full hover:bg-paper-sunken transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-widest text-brand-teal bg-brand-teal-tint px-2 py-0.5 rounded border border-brand-teal/20 font-bold inline-flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-brand-teal" />
                <span>BR-14 Audited Review Slip</span>
              </span>
              <h2 className="text-xl font-serif font-bold text-ink-primary pt-1">
                Rate Your Experience with {companyName}
              </h2>
              <p className="text-xs text-ink-muted font-mono">
                Inquiry: {serviceTitle}
              </p>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-semantic-error-tint border border-semantic-error/20 text-xs font-mono text-semantic-error">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Star Rating Picker */}
              <div className="space-y-2.5">
                <label className="block text-xs font-mono font-semibold text-ink-primary uppercase tracking-wider">
                  Overall Institutional Rating (1 to 5 Stars)
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const isFilled = (hoverRating !== null ? hoverRating : rating) >= star;
                    return (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(null)}
                        className="p-1 transition-transform hover:scale-120 focus:outline-none"
                      >
                        <Star
                          className={`w-7 h-7 transition-colors ${
                            isFilled
                              ? 'fill-amber-500 text-amber-500'
                              : 'text-stone-300 hover:text-stone-400'
                          }`}
                        />
                      </button>
                    );
                  })}
                  <span className="ml-2 text-xs font-mono font-bold text-ink-primary">
                    {getScoreDescription(hoverRating !== null ? hoverRating : rating)}
                  </span>
                </div>
              </div>

              {/* Comment */}
              <div className="space-y-2">
                <label className="block text-xs font-mono font-semibold text-ink-primary uppercase tracking-wider">
                  Covenant Execution &amp; Feedback (Public)
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={4}
                  placeholder="Share details on responsiveness, milestone deliverable quality, and technical specification compliance..."
                  className="w-full p-3 text-xs font-sans rounded-xl border border-paper-border bg-paper-canvas focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-teal placeholder:text-ink-muted"
                />
                <p className="text-[11px] text-ink-muted font-mono">
                  Your review will be attributed to your verified initial name (e.g. Zain M.) on the provider's marketplace docket.
                </p>
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-paper-border">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="font-mono text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={isSubmitting}
                  isLoading={isSubmitting}
                  className="font-mono text-xs bg-brand-teal hover:bg-brand-teal-hover font-bold px-5 flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Publish Review</span>
                </Button>
              </div>
            </form>
          </Card>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
