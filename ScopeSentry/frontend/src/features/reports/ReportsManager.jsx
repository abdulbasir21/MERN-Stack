import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../../lib/api';
import {
  FileSpreadsheet,
  Download,
  RotateCw,
  Plus,
  FileCheck,
  AlertTriangle,
  Clock
} from 'lucide-react';

export default function ReportsManager({ projectId, investigationId }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const fetchReports = useCallback(async () => {
    try {
      const res = await apiClient(`/projects/${projectId}/reports`);
      setReports(res?.data?.reports || []);
    } catch (err) {
      setError(err.message || 'Failed to load reports');
    }
  }, [projectId]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await fetchReports();
      setLoading(false);
    };
    init();
  }, [fetchReports]);

  const handleGenerateReport = async () => {
    if (!investigationId) return;

    setGenerating(true);
    setError(null);
    setSuccess(null);
    try {
      await apiClient(`/investigations/${investigationId}/reports`, {
        method: 'POST'
      });
      setSuccess('Executive 12-section PDF report generated successfully!');
      await fetchReports();
    } catch (err) {
      setError(err.message || 'Failed to generate report');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadReport = async (reportId) => {
    try {
      const res = await apiClient(`/reports/${reportId}/download`);
      if (res?.data?.downloadUrl) {
        window.open(res.data.downloadUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (err) {
      setError(err.message || 'Failed to download report');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
        <div>
          <h2 className="text-lg font-headline font-bold text-primary">
            Change Intelligence Reports
          </h2>
          <p className="text-xs text-secondary mt-0.5">
            Formal 12-section PDF reports compiling detected changes, groundings, cost deltas, and review statuses.
          </p>
        </div>

        {investigationId && (
          <button
            onClick={handleGenerateReport}
            disabled={generating}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-container text-white text-xs font-semibold rounded-lg shadow-sm hover:opacity-95 disabled:opacity-50 transition-opacity"
          >
            {generating ? (
              <>
                <RotateCw className="w-3.5 h-3.5 animate-spin" />
                <span>Generating PDF...</span>
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5" />
                <span>Generate PDF Report</span>
              </>
            )}
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
          <FileCheck className="w-4 h-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Reports List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-20 bg-surface rounded-xl border border-border animate-pulse" />
          ))}
        </div>
      ) : reports.length === 0 ? (
        <div className="bg-surface rounded-xl border border-dashed border-border p-12 text-center max-w-md mx-auto space-y-4">
          <div className="w-12 h-12 rounded-full bg-primary-container/10 text-primary-container mx-auto flex items-center justify-center">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-headline font-bold text-base text-primary">No reports generated yet</h3>
            <p className="text-xs text-secondary mt-1">
              Once an investigation completes and findings are reviewed, generate a formal 12-section PDF report for executive stakeholders.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-surface rounded-xl border border-border divide-y divide-border overflow-hidden">
          {reports.map((report) => (
            <div
              key={report.id}
              className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/30 transition-colors"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-primary-container" />
                  <span className="font-medium text-xs text-primary">{report.filename}</span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-secondary font-mono">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Generated: {new Date(report.generatedAt).toLocaleString()}</span>
                </div>
              </div>

              <button
                onClick={() => handleDownloadReport(report.id)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-surface text-xs font-semibold text-primary hover:bg-muted shrink-0"
              >
                <Download className="w-3.5 h-3.5 text-primary-container" />
                <span>Download PDF</span>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
