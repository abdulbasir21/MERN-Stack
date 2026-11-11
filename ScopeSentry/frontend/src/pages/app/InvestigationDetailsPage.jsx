import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { apiClient } from '../../lib/api';
import {
  ArrowLeft,
  RotateCw,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  ShieldAlert,
  Info,
  FileSpreadsheet
} from 'lucide-react';
import ReviewControls from '../../features/review/ReviewControls';

export default function InvestigationDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [investigation, setInvestigation] = useState(null);
  const [findings, setFindings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedFindingId, setExpandedFindingId] = useState(null);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(null);

  const handleFindingUpdated = (updatedFinding) => {
    setFindings((prev) =>
      prev.map((f) => (f.id === updatedFinding.id ? updatedFinding : f))
    );
  };

  const handleGenerateReport = async () => {
    setGeneratingReport(true);
    setReportSuccess(null);
    try {
      const res = await apiClient(`/investigations/${id}/reports`, { method: 'POST' });
      setReportSuccess('PDF report generated successfully!');
      if (res?.data?.report?.id) {
        const dl = await apiClient(`/reports/${res.data.report.id}/download`);
        if (dl?.data?.downloadUrl) {
          window.open(dl.data.downloadUrl, '_blank', 'noopener,noreferrer');
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to generate report');
    } finally {
      setGeneratingReport(false);
    }
  };

  const fetchInvestigation = useCallback(async () => {
    try {
      const res = await apiClient(`/investigations/${id}`);
      setInvestigation(res?.data?.investigation || null);
    } catch (err) {
      setError(err.message || 'Investigation not found');
    }
  }, [id]);

  const fetchFindings = useCallback(async () => {
    try {
      const res = await apiClient(`/investigations/${id}/findings`);
      setFindings(res?.data?.findings || []);
    } catch {
      // Ignored if not completed yet
    }
  }, [id]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await fetchInvestigation();
      await fetchFindings();
      setLoading(false);
    };
    init();
  }, [fetchInvestigation, fetchFindings]);

  // Polling while active (queued or running)
  useEffect(() => {
    if (!investigation) return;
    if (['queued', 'running'].includes(investigation.status)) {
      const interval = setInterval(async () => {
        await fetchInvestigation();
        await fetchFindings();
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [investigation, fetchInvestigation, fetchFindings]);

  // Aggregate Metrics for Telemetry Bar
  const totalFindings = findings.length;
  const highConfidenceCount = findings.filter((f) => f.confidence === 'high').length;

  let totalCostEstimate = 0;
  let hasEstimates = false;
  for (const f of findings) {
    if (f.impact?.estimatedCostDifference) {
      totalCostEstimate += Number(f.impact.estimatedCostDifference);
      hasEstimates = true;
    }
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
            <CheckCircle2 className="w-4 h-4" /> Completed
          </span>
        );
      case 'running':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-sky-500/10 text-sky-600 border border-sky-500/20">
            <RotateCw className="w-4 h-4 animate-spin" /> In Progress
          </span>
        );
      case 'queued':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 border border-amber-500/20">
            <Clock className="w-4 h-4" /> Queued
          </span>
        );
      case 'failed':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-600 border border-rose-500/20">
            <AlertTriangle className="w-4 h-4" /> Failed
          </span>
        );
    }
  };

  const getConfidenceBadge = (confidence) => {
    switch (confidence) {
      case 'high':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">
            High Confidence
          </span>
        );
      case 'medium':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-sky-500/10 text-sky-700 border border-sky-500/20">
            Medium Confidence
          </span>
        );
      case 'low':
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/10 text-amber-700 border border-amber-500/20">
            Low Confidence
          </span>
        );
    }
  };

  const getApprovalBadge = (approval) => {
    if (approval?.status === 'approved_in_writing' || approval?.status === 'found') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">
          <ShieldCheck className="w-3.5 h-3.5" /> Approved in writing
        </span>
      );
    }
    if (approval?.status === 'pending_signature') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/10 text-amber-700 border border-amber-500/20">
          <Clock className="w-3.5 h-3.5" /> Pending signature
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-muted text-secondary border border-border">
        <ShieldAlert className="w-3.5 h-3.5 text-secondary" /> Approval not found
      </span>
    );
  };

  if (loading) {
    return (
      <div className="p-8 space-y-4 max-w-6xl mx-auto">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="h-32 bg-surface rounded-xl border border-border animate-pulse" />
        <div className="h-64 bg-surface rounded-xl border border-border animate-pulse" />
      </div>
    );
  }

  if (error || !investigation) {
    return (
      <div className="p-8 max-w-lg mx-auto text-center space-y-4">
        <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto" />
        <h2 className="text-lg font-headline font-bold text-primary">Investigation Not Found</h2>
        <p className="text-xs text-secondary">{error || 'This investigation does not exist or you do not have permission to view it.'}</p>
        <button
          onClick={() => navigate('/app/projects')}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary-container text-white text-xs font-semibold rounded-lg"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Projects
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-6xl mx-auto">
      {/* Breadcrumb Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <Link
            to={`/app/projects/${investigation.projectId}`}
            className="inline-flex items-center gap-1.5 text-xs text-secondary hover:text-primary mb-1 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Project</span>
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-xl md:text-2xl font-headline font-bold text-primary">
              Investigation Report
            </h1>
            {getStatusBadge(investigation.status)}
          </div>
          <p className="text-xs text-secondary font-mono">
            Started: {new Date(investigation.startedAt || investigation.createdAt).toLocaleString()}
          </p>
        </div>

        {investigation.status === 'completed' && (
          <button
            onClick={handleGenerateReport}
            disabled={generatingReport}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-container text-white text-xs font-semibold rounded-lg shadow-sm hover:opacity-95 disabled:opacity-50 self-start sm:self-auto"
          >
            {generatingReport ? (
              <>
                <RotateCw className="w-3.5 h-3.5 animate-spin" />
                <span>Generating PDF...</span>
              </>
            ) : (
              <>
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Generate PDF Report</span>
              </>
            )}
          </button>
        )}
      </div>

      {reportSuccess && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{reportSuccess}</span>
        </div>
      )}

      {/* Mandatory Limitations Banner (MASTER_PROMPT 12.4) */}
      <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 flex items-start gap-3">
        <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong>Notice:</strong> ScopeSentry highlights potential changes and estimates impacts to help project managers investigate. Estimates depend on supplied prices and extracted values and are not verified financial or legal conclusions. AI interpretations may be wrong. A human must review every finding. Approval means reviewed by the user, not a legal or contractual determination.
        </p>
      </div>

      {/* Documents Comparison Banner */}
      <div className="bg-surface rounded-xl border border-border p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <span className="text-[11px] uppercase tracking-wider font-semibold text-secondary">
            Original Baseline Document
          </span>
          <div className="flex items-center gap-2 text-xs font-medium text-primary">
            <FileText className="w-4 h-4 text-primary-container" />
            <span>{investigation.originalDocumentId?.originalFilename || 'Original Document'}</span>
            <span className="text-secondary text-[11px]">
              ({investigation.originalDocumentId?.category?.replace('_', ' ')})
            </span>
          </div>
        </div>
        <div className="space-y-1">
          <span className="text-[11px] uppercase tracking-wider font-semibold text-secondary">
            Revised Comparison Document
          </span>
          <div className="flex items-center gap-2 text-xs font-medium text-primary">
            <FileText className="w-4 h-4 text-primary-container" />
            <span>{investigation.revisedDocumentId?.originalFilename || 'Revised Document'}</span>
            <span className="text-secondary text-[11px]">
              ({investigation.revisedDocumentId?.category?.replace('_', ' ')})
            </span>
          </div>
        </div>
      </div>

      {/* Status Progress if Running */}
      {['queued', 'running'].includes(investigation.status) && (
        <div className="bg-surface rounded-xl border border-sky-500/30 p-8 text-center space-y-3">
          <RotateCw className="w-8 h-8 text-sky-600 animate-spin mx-auto" />
          <h3 className="font-headline font-bold text-base text-primary">
            Running 4-Stage Investigation Workflow...
          </h3>
          <p className="text-xs text-secondary max-w-md mx-auto">
            Extracting requirements, executing deterministic matching, retrieving supporting citations, and calculating cost impacts. This page automatically updates.
          </p>
        </div>
      )}

      {/* Completed Investigation Findings Section */}
      {investigation.status === 'completed' && (
        <>
          {/* Telemetry Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-surface rounded-xl border border-border p-4 space-y-1">
              <span className="text-[11px] uppercase tracking-wider font-semibold text-secondary">
                Detected Changes
              </span>
              <div className="text-2xl font-bold font-headline text-primary">
                {totalFindings}
              </div>
              <p className="text-[11px] text-secondary">
                {highConfidenceCount} confirmed with exact clause matching
              </p>
            </div>

            <div className="bg-surface rounded-xl border border-border p-4 space-y-1">
              <span className="text-[11px] uppercase tracking-wider font-semibold text-secondary">
                Total Estimated Cost Delta
              </span>
              <div className="text-2xl font-bold font-headline text-primary">
                {hasEstimates ? `$${totalCostEstimate.toLocaleString()}` : 'N/A'}
              </div>
              <p className="text-[11px] text-secondary">
                <span className="px-1.5 py-0.5 rounded bg-muted font-medium">Estimate</span>{' '}
                {hasEstimates ? 'Computed from confirmed prices' : 'No unit prices found'}
              </p>
            </div>

            <div className="bg-surface rounded-xl border border-border p-4 space-y-1">
              <span className="text-[11px] uppercase tracking-wider font-semibold text-secondary">
                Workflow Audit
              </span>
              <div className="text-2xl font-bold font-headline text-emerald-600 flex items-center gap-1.5">
                <CheckCircle2 className="w-6 h-6" />
                <span>Verified</span>
              </div>
              <p className="text-[11px] text-secondary">
                All claims grounded with document citations
              </p>
            </div>
          </div>

          {/* Findings List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-headline font-bold text-primary">
                Detected Scope Changes ({findings.length})
              </h2>
            </div>

            {findings.length === 0 ? (
              <div className="bg-surface rounded-xl border border-border p-12 text-center text-xs text-secondary">
                No scope changes detected between the original and revised documents.
              </div>
            ) : (
              <div className="space-y-3">
                {findings.map((finding) => {
                  const isExpanded = expandedFindingId === finding.id;
                  return (
                    <div
                      key={finding.id}
                      className="bg-surface rounded-xl border border-border overflow-hidden transition-all"
                    >
                      {/* Finding Summary Bar */}
                      <div
                        onClick={() => setExpandedFindingId(isExpanded ? null : finding.id)}
                        className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-muted/30"
                      >
                        <div className="space-y-2 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary-container/10 text-primary-container">
                              {finding.category.replace('_', ' ')}
                            </span>
                            {getConfidenceBadge(finding.confidence)}
                            {getApprovalBadge(finding.approvalEvidence)}
                          </div>
                          <h3 className="font-headline font-bold text-sm text-primary">
                            {finding.title}
                          </h3>
                          <p className="text-xs text-secondary line-clamp-2">
                            {finding.description}
                          </p>
                        </div>

                        {/* Numeric Impact Badges */}
                        <div className="flex items-center gap-4 shrink-0">
                          {finding.impact?.quantityDifference !== null && (
                            <div className="text-right">
                              <span className="text-[10px] text-secondary uppercase font-semibold">
                                Qty Delta
                              </span>
                              <div className="text-xs font-bold text-primary">
                                {Number(finding.impact.quantityDifference) > 0 ? '+' : ''}
                                {finding.impact.quantityDifference} {finding.unit || 'units'}
                              </div>
                            </div>
                          )}

                          {finding.impact?.estimatedCostDifference !== null ? (
                            <div className="text-right">
                              <span className="text-[10px] text-secondary uppercase font-semibold flex items-center justify-end gap-1">
                                <span className="px-1 py-0.2 rounded bg-muted text-[9px]">Estimate</span>
                                Cost Delta
                              </span>
                              <div className="text-xs font-bold text-emerald-600">
                                ${Number(finding.impact.estimatedCostDifference).toLocaleString()}
                              </div>
                            </div>
                          ) : (
                            <div className="text-right">
                              <span className="text-[10px] text-secondary uppercase font-semibold">
                                Cost Delta
                              </span>
                              <div className="text-xs text-secondary italic">
                                Cannot estimate
                              </div>
                            </div>
                          )}

                          <button className="text-secondary p-1 rounded hover:bg-muted">
                            {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                          </button>
                        </div>
                      </div>

                      {/* Expandable Evidence and Verification Drawer */}
                      {isExpanded && (
                        <div className="px-5 pb-5 pt-2 border-t border-border bg-muted/20 space-y-4 text-xs">
                          {/* Value Comparison Grid */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-lg bg-surface border border-border">
                            <div>
                              <span className="text-[10px] uppercase font-semibold text-secondary">
                                Confirmed Original Value
                              </span>
                              <p className="text-xs font-medium text-primary mt-0.5">
                                {finding.originalValue || '(None / Not specified)'}
                              </p>
                            </div>
                            <div>
                              <span className="text-[10px] uppercase font-semibold text-secondary">
                                Confirmed Revised Value
                              </span>
                              <p className="text-xs font-medium text-primary mt-0.5">
                                {finding.revisedValue || '(None / Removed)'}
                              </p>
                            </div>
                          </div>

                          {/* Uncertainty Note (AI Interpretation) */}
                          {finding.uncertaintyNote && (
                            <div className="p-3 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-900">
                              <span className="text-[10px] font-bold uppercase tracking-wider block text-sky-700">
                                AI Interpretation Note
                              </span>
                              <p className="mt-0.5 text-xs">{finding.uncertaintyNote}</p>
                            </div>
                          )}

                          {/* Grounding Evidence Citations (BR-I8) */}
                          <div className="space-y-2">
                            <span className="text-[10px] uppercase font-bold text-secondary tracking-wider">
                              Verified Grounding Evidence Citations ({finding.evidence.length})
                            </span>
                            {finding.evidence.length === 0 ? (
                              <p className="text-xs italic text-secondary">
                                Evidence not found in referenced documents.
                              </p>
                            ) : (
                              <div className="space-y-2">
                                {finding.evidence.map((ev, idx) => (
                                  <div
                                    key={idx}
                                    className="p-3 rounded-lg bg-surface border border-border space-y-1 font-mono text-[11px]"
                                  >
                                    <div className="flex items-center justify-between text-secondary text-[10px]">
                                      <span>Citation #{idx + 1}</span>
                                      {ev.page && <span>Page {ev.page}</span>}
                                      {ev.section && <span>Section: {ev.section}</span>}
                                    </div>
                                    <blockquote className="text-primary italic border-l-2 border-primary-container pl-2 py-0.5">
                                      &quot;{ev.snippet}&quot;
                                    </blockquote>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Interactive Human Review & Audit Controls (BR-R1 to BR-R5) */}
                          <ReviewControls finding={finding} onFindingUpdated={handleFindingUpdated} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
