import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../lib/api';
import {
  SearchCode,
  Plus,
  Play,
  RotateCw,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  ArrowRight,
  ExternalLink
} from 'lucide-react';

export default function InvestigationsManager({ projectId, isArchived }) {
  const navigate = useNavigate();
  const [investigations, setInvestigations] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState(null);
  const [selectedOriginal, setSelectedOriginal] = useState('');
  const [selectedRevised, setSelectedRevised] = useState('');
  const [selectedSupporting, setSelectedSupporting] = useState([]);

  // Fetch investigations
  const fetchInvestigations = useCallback(async () => {
    try {
      const res = await apiClient(`/projects/${projectId}/investigations`);
      setInvestigations(res?.data?.items || []);
    } catch (err) {
      setError(err.message || 'Failed to load investigations');
    }
  }, [projectId]);

  // Fetch ready documents for selection
  const fetchDocuments = useCallback(async () => {
    try {
      const res = await apiClient(`/projects/${projectId}/documents`);
      const docs = res?.data?.items || [];
      setDocuments(docs.filter((d) => d.processingStatus === 'ready'));
    } catch {
      // Ignored
    }
  }, [projectId]);

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      await Promise.all([fetchInvestigations(), fetchDocuments()]);
      setLoading(false);
    };
    loadAll();
  }, [fetchInvestigations, fetchDocuments]);

  // Document categorization for selection
  const originalOptions = documents.filter((d) =>
    ['original_specification', 'original_contract'].includes(d.category)
  );
  const revisedOptions = documents.filter((d) =>
    ['revised_specification', 'change_request'].includes(d.category)
  );
  const supportingOptions = documents.filter(
    (d) => d.id !== selectedOriginal && d.id !== selectedRevised
  );

  const handleStartInvestigation = async (e) => {
    e.preventDefault();
    setModalError(null);

    if (!selectedOriginal || !selectedRevised) {
      setModalError('Please select both an original and a revised document.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiClient(`/projects/${projectId}/investigations`, {
        method: 'POST',
        body: JSON.stringify({
          originalDocumentId: selectedOriginal,
          revisedDocumentId: selectedRevised,
          supportingDocumentIds: selectedSupporting
        })
      });

      const investigation = res?.data?.investigation;
      setIsModalOpen(false);
      setSelectedOriginal('');
      setSelectedRevised('');
      setSelectedSupporting([]);

      // Navigate to investigation details view
      if (investigation?.id) {
        navigate(`/app/investigations/${investigation.id}`);
      } else {
        await fetchInvestigations();
      }
    } catch (err) {
      setModalError(err.message || 'Failed to start investigation');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleSupportingDoc = (docId) => {
    setSelectedSupporting((prev) =>
      prev.includes(docId) ? prev.filter((id) => id !== docId) : [...prev, docId]
    );
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" /> Completed
          </span>
        );
      case 'running':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-500/10 text-sky-600 border border-sky-500/20">
            <RotateCw className="w-3.5 h-3.5 animate-spin" /> Running
          </span>
        );
      case 'queued':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 border border-amber-500/20">
            <Clock className="w-3.5 h-3.5" /> Queued
          </span>
        );
      case 'failed':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-600 border border-rose-500/20">
            <AlertTriangle className="w-3.5 h-3.5" /> Failed
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
        <div>
          <h2 className="text-lg font-headline font-bold text-primary">Investigations</h2>
          <p className="text-xs text-secondary mt-0.5">
            Deterministic change detection, cost & schedule impact modeling, and approval grounding.
          </p>
        </div>
        {!isArchived && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-container text-white text-xs font-semibold rounded-lg shadow-sm hover:opacity-95 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            <span>New Investigation</span>
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
          {error}
        </div>
      )}

      {/* Loading Skeleton */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-20 bg-surface rounded-xl border border-border animate-pulse" />
          ))}
        </div>
      ) : investigations.length === 0 ? (
        <div className="bg-surface rounded-xl border border-dashed border-border p-12 text-center max-w-md mx-auto space-y-4">
          <div className="w-12 h-12 rounded-full bg-primary-container/10 text-primary-container mx-auto flex items-center justify-center">
            <SearchCode className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-headline font-bold text-base text-primary">No investigations yet</h3>
            <p className="text-xs text-secondary mt-1">
              Upload original and revised contract or specification documents, then launch an AI investigation to discover scope differences.
            </p>
          </div>
          {!isArchived && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-container text-white text-xs font-semibold rounded-lg shadow-sm hover:opacity-95"
            >
              <Play className="w-4 h-4" />
              <span>Launch First Investigation</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {investigations.map((inv) => (
            <div
              key={inv.id}
              onClick={() => navigate(`/app/investigations/${inv.id}`)}
              className="group bg-surface rounded-xl border border-border p-5 hover:border-primary-container/40 hover:shadow-sm transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  {getStatusBadge(inv.status)}
                  <span className="text-xs text-secondary font-mono">
                    {new Date(inv.createdAt).toLocaleDateString()} at{' '}
                    {new Date(inv.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-primary font-medium">
                  <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-muted">
                    <FileText className="w-3.5 h-3.5 text-secondary" />
                    <span>Original: {inv.originalDocumentId?.originalFilename || 'Document'}</span>
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-secondary" />
                  <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-muted">
                    <FileText className="w-3.5 h-3.5 text-secondary" />
                    <span>Revised: {inv.revisedDocumentId?.originalFilename || 'Document'}</span>
                  </span>
                  {inv.supportingDocumentIds?.length > 0 && (
                    <span className="text-xs text-secondary ml-1">
                      (+{inv.supportingDocumentIds.length} supporting)
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 text-xs font-semibold text-primary-container group-hover:translate-x-1 transition-transform">
                <span>View Findings</span>
                <ExternalLink className="w-4 h-4" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Start Investigation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface rounded-2xl border border-border w-full max-w-lg shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-5 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="font-headline font-bold text-base text-primary">Start New Investigation</h3>
                <p className="text-xs text-secondary mt-0.5">
                  Select ready documents to perform 4-stage change detection and impact analysis.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-secondary hover:text-primary text-sm p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleStartInvestigation} className="p-6 space-y-4">
              {modalError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                  {modalError}
                </div>
              )}

              {/* Original Document Selector */}
              <div>
                <label className="block text-xs font-semibold text-primary mb-1.5">
                  Original Document (Contract or Specification) *
                </label>
                <select
                  value={selectedOriginal}
                  onChange={(e) => setSelectedOriginal(e.target.value)}
                  className="w-full text-xs rounded-lg border border-border bg-surface px-3 py-2 text-primary focus:outline-none focus:border-primary-container"
                  required
                >
                  <option value="">Select original baseline document...</option>
                  {originalOptions.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      {doc.originalFilename} ({doc.category.replace('_', ' ')})
                    </option>
                  ))}
                </select>
                {originalOptions.length === 0 && (
                  <p className="text-[11px] text-amber-600 mt-1">
                    No ready documents with category &quot;original_specification&quot; or &quot;original_contract&quot;.
                  </p>
                )}
              </div>

              {/* Revised Document Selector */}
              <div>
                <label className="block text-xs font-semibold text-primary mb-1.5">
                  Revised Document (Specification or Change Request) *
                </label>
                <select
                  value={selectedRevised}
                  onChange={(e) => setSelectedRevised(e.target.value)}
                  className="w-full text-xs rounded-lg border border-border bg-surface px-3 py-2 text-primary focus:outline-none focus:border-primary-container"
                  required
                >
                  <option value="">Select revised comparison document...</option>
                  {revisedOptions.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      {doc.originalFilename} ({doc.category.replace('_', ' ')})
                    </option>
                  ))}
                </select>
                {revisedOptions.length === 0 && (
                  <p className="text-[11px] text-amber-600 mt-1">
                    No ready documents with category &quot;revised_specification&quot; or &quot;change_request&quot;.
                  </p>
                )}
              </div>

              {/* Supporting Documents Checkboxes */}
              {supportingOptions.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-primary mb-1.5">
                    Supporting Documents (Optional)
                  </label>
                  <div className="max-h-36 overflow-y-auto space-y-1.5 p-2 rounded-lg border border-border bg-muted/30">
                    {supportingOptions.map((doc) => (
                      <label
                        key={doc.id}
                        className="flex items-center gap-2 text-xs text-primary cursor-pointer hover:bg-muted p-1 rounded"
                      >
                        <input
                          type="checkbox"
                          checked={selectedSupporting.includes(doc.id)}
                          onChange={() => toggleSupportingDoc(doc.id)}
                          className="rounded border-border text-primary-container focus:ring-0"
                        />
                        <span className="truncate">{doc.originalFilename}</span>
                        <span className="text-[10px] text-secondary">
                          ({doc.category.replace('_', ' ')})
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-border flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-border text-primary text-xs font-semibold rounded-lg hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || originalOptions.length === 0 || revisedOptions.length === 0}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary-container text-white text-xs font-semibold rounded-lg hover:opacity-95 disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <RotateCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Starting...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5" />
                      <span>Launch Investigation</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
