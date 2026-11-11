import { useState, useCallback } from 'react';
import { apiClient } from '../../lib/api';
import {
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock,
  MessageSquare,
  History,
  DollarSign,
  RotateCw,
  Info
} from 'lucide-react';

export default function ReviewControls({ finding, onFindingUpdated }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Status Change State
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [statusComment, setStatusComment] = useState('');
  const [targetStatus, setTargetStatus] = useState('');

  // Comment State
  const [isCommentOpen, setIsCommentOpen] = useState(false);
  const [commentText, setCommentText] = useState('');

  // Price Override State
  const [isPriceOpen, setIsPriceOpen] = useState(false);
  const [priceInput, setPriceInput] = useState(
    finding.unitPriceOverride !== null && finding.unitPriceOverride !== undefined
      ? String(finding.unitPriceOverride)
      : finding.extractedUnitPrice
      ? String(finding.extractedUnitPrice)
      : ''
  );
  const [priceComment, setPriceComment] = useState('');

  // History State
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const handleStatusSubmit = async (e) => {
    e.preventDefault();
    if (!targetStatus) return;

    setLoading(true);
    setError(null);
    try {
      const res = await apiClient(`/findings/${finding.id}/review`, {
        method: 'PATCH',
        body: JSON.stringify({
          reviewStatus: targetStatus,
          comment: statusComment || null
        })
      });

      if (onFindingUpdated && res?.data?.finding) {
        onFindingUpdated(res.data.finding);
      }
      setIsStatusOpen(false);
      setStatusComment('');
    } catch (err) {
      setError(err.message || 'Failed to update review status');
    } finally {
      setLoading(false);
    }
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    setLoading(true);
    setError(null);
    try {
      await apiClient(`/findings/${finding.id}/comments`, {
        method: 'POST',
        body: JSON.stringify({ comment: commentText.trim() })
      });

      setIsCommentOpen(false);
      setCommentText('');
      await loadHistory();
    } catch (err) {
      setError(err.message || 'Failed to add comment');
    } finally {
      setLoading(false);
    }
  };

  const handlePriceOverrideSubmit = async (e) => {
    e.preventDefault();
    const numPrice = Number(priceInput);
    if (isNaN(numPrice) || numPrice < 0) {
      setError('Price must be a valid non-negative number');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await apiClient(`/findings/${finding.id}/price-override`, {
        method: 'PATCH',
        body: JSON.stringify({
          unitPriceOverride: numPrice,
          comment: priceComment || null
        })
      });

      if (onFindingUpdated && res?.data?.finding) {
        onFindingUpdated(res.data.finding);
      }
      setIsPriceOpen(false);
      setPriceComment('');
    } catch (err) {
      setError(err.message || 'Failed to override unit price');
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await apiClient(`/findings/${finding.id}/history`);
      setHistory(res?.data?.history || []);
    } catch {
      // Ignored
    } finally {
      setHistoryLoading(false);
    }
  }, [finding.id]);

  const openHistory = async () => {
    setIsHistoryOpen(true);
    await loadHistory();
  };

  const currentStatus = finding.reviewStatus || 'pending';

  return (
    <div className="space-y-3 pt-3 border-t border-border">
      {/* BR-R4 Mandatory Limitation Notice */}
      <div className="flex items-center gap-1.5 text-[11px] text-secondary">
        <Info className="w-3.5 h-3.5 text-primary-container shrink-0" />
        <span>Approved = reviewed by you; not a legal determination.</span>
      </div>

      {error && (
        <div className="p-2 rounded bg-rose-50 border border-rose-200 text-rose-700 text-xs">
          {error}
        </div>
      )}

      {/* Action Buttons Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {/* Status Buttons */}
          <button
            onClick={() => {
              setTargetStatus('approved');
              setIsStatusOpen(true);
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              currentStatus === 'approved'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 border border-emerald-500/20'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Approve</span>
          </button>

          <button
            onClick={() => {
              setTargetStatus('rejected');
              setIsStatusOpen(true);
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              currentStatus === 'rejected'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-rose-500/10 text-rose-700 hover:bg-rose-500/20 border border-rose-500/20'
            }`}
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>Reject</span>
          </button>

          <button
            onClick={() => {
              setTargetStatus('needs_further_review');
              setIsStatusOpen(true);
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              currentStatus === 'needs_further_review'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 border border-amber-500/20'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Needs Review</span>
          </button>

          {currentStatus !== 'pending' && (
            <button
              onClick={() => {
                setTargetStatus('pending');
                setIsStatusOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-secondary hover:bg-muted"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Price Override Button */}
          <button
            onClick={() => setIsPriceOpen(true)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-border bg-surface text-primary hover:bg-muted"
            title="Override Unit Price"
          >
            <DollarSign className="w-3.5 h-3.5 text-primary-container" />
            <span>{finding.unitPriceOverride !== null ? 'Price Overridden' : 'Override Price'}</span>
          </button>

          {/* Add Comment Button */}
          <button
            onClick={() => setIsCommentOpen(true)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-border bg-surface text-primary hover:bg-muted"
          >
            <MessageSquare className="w-3.5 h-3.5 text-secondary" />
            <span>Comment</span>
          </button>

          {/* History Button */}
          <button
            onClick={openHistory}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-border bg-surface text-primary hover:bg-muted"
          >
            <History className="w-3.5 h-3.5 text-secondary" />
            <span>Audit Trail</span>
          </button>
        </div>
      </div>

      {/* Status Confirmation Modal */}
      {isStatusOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface rounded-xl border border-border w-full max-w-md p-5 space-y-4 shadow-xl">
            <h3 className="font-headline font-bold text-sm text-primary">
              Confirm Status: {targetStatus.replace('_', ' ').toUpperCase()}
            </h3>
            <p className="text-xs text-secondary">
              This transition will be recorded permanently in the append-only audit trail.
            </p>
            <form onSubmit={handleStatusSubmit} className="space-y-3">
              <textarea
                placeholder="Optional review justification or reason..."
                value={statusComment}
                onChange={(e) => setStatusComment(e.target.value)}
                maxLength={2000}
                rows={3}
                className="w-full text-xs rounded-lg border border-border bg-surface p-2.5 text-primary focus:outline-none focus:border-primary-container"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsStatusOpen(false)}
                  className="px-3 py-1.5 border border-border text-xs rounded-lg hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-3 py-1.5 bg-primary-container text-white text-xs font-semibold rounded-lg hover:opacity-95"
                >
                  {loading ? 'Saving...' : 'Confirm Status'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Comment Modal */}
      {isCommentOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface rounded-xl border border-border w-full max-w-md p-5 space-y-4 shadow-xl">
            <h3 className="font-headline font-bold text-sm text-primary">
              Add PM Audit Comment
            </h3>
            <form onSubmit={handleCommentSubmit} className="space-y-3">
              <textarea
                placeholder="Write an immutable audit observation..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                maxLength={2000}
                required
                rows={3}
                className="w-full text-xs rounded-lg border border-border bg-surface p-2.5 text-primary focus:outline-none focus:border-primary-container"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCommentOpen(false)}
                  className="px-3 py-1.5 border border-border text-xs rounded-lg hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-3 py-1.5 bg-primary-container text-white text-xs font-semibold rounded-lg hover:opacity-95"
                >
                  {loading ? 'Posting...' : 'Save Comment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Price Override Modal */}
      {isPriceOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface rounded-xl border border-border w-full max-w-md p-5 space-y-4 shadow-xl">
            <h3 className="font-headline font-bold text-sm text-primary">
              Override Unit Price (BR-R5)
            </h3>
            <p className="text-xs text-secondary">
              Recalculates the estimated cost delta on read. Never alters original extracted facts.
            </p>
            <form onSubmit={handlePriceOverrideSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-primary mb-1">
                  Unit Price ($) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={priceInput}
                  onChange={(e) => setPriceInput(e.target.value)}
                  placeholder="e.g. 500.00"
                  className="w-full text-xs rounded-lg border border-border bg-surface p-2 text-primary focus:outline-none focus:border-primary-container"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-primary mb-1">
                  Reason / Source Note
                </label>
                <textarea
                  placeholder="e.g. Revised quote received from subcontractor on May 10"
                  value={priceComment}
                  onChange={(e) => setPriceComment(e.target.value)}
                  maxLength={2000}
                  rows={2}
                  className="w-full text-xs rounded-lg border border-border bg-surface p-2 text-primary focus:outline-none focus:border-primary-container"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsPriceOpen(false)}
                  className="px-3 py-1.5 border border-border text-xs rounded-lg hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-3 py-1.5 bg-primary-container text-white text-xs font-semibold rounded-lg hover:opacity-95"
                >
                  {loading ? 'Applying...' : 'Apply Override'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Audit History Drawer */}
      {isHistoryOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-end">
          <div className="bg-surface w-full max-w-md h-full border-l border-border p-6 shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-200">
            <div className="space-y-4 overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div>
                  <h3 className="font-headline font-bold text-base text-primary">
                    Audit Trail Ledger
                  </h3>
                  <p className="text-xs text-secondary mt-0.5">
                    Append-only record of review actions and price overrides.
                  </p>
                </div>
                <button
                  onClick={() => setIsHistoryOpen(false)}
                  className="p-1 text-secondary hover:text-primary rounded"
                >
                  ✕
                </button>
              </div>

              {historyLoading ? (
                <div className="py-8 text-center text-secondary">
                  <RotateCw className="w-5 h-5 animate-spin mx-auto mb-2 text-primary-container" />
                  <span className="text-xs">Loading ledger...</span>
                </div>
              ) : history.length === 0 ? (
                <div className="py-8 text-center text-xs text-secondary">
                  No review actions recorded yet for this finding.
                </div>
              ) : (
                <div className="space-y-3">
                  {history.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-lg border border-border bg-muted/20 space-y-1 text-xs"
                    >
                      <div className="flex items-center justify-between text-[10px] text-secondary">
                        <span className="font-semibold uppercase tracking-wider text-primary-container">
                          {item.type.replace('_', ' ')}
                        </span>
                        <span>{new Date(item.createdAt).toLocaleString()}</span>
                      </div>
                      {item.fromStatus && item.toStatus && (
                        <p className="font-medium text-primary">
                          Changed status: <span className="underline">{item.fromStatus}</span> →{' '}
                          <span className="font-bold">{item.toStatus}</span>
                        </p>
                      )}
                      {item.comment && (
                        <p className="text-secondary italic">
                          &quot;{item.comment}&quot;
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-border">
              <button
                onClick={() => setIsHistoryOpen(false)}
                className="w-full py-2 bg-muted text-primary text-xs font-semibold rounded-lg hover:bg-muted/80"
              >
                Close Audit Ledger
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
