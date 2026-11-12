import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../../lib/api';
import {
  Sparkles,
  Building2,
  Home,
  Briefcase,
  Play,
  RotateCw,
  FileText,
  CheckCircle2,
  Info,
  ShieldCheck,
  ShieldAlert,
  ArrowUpRight
} from 'lucide-react';

const PROJECT_TYPE_ICONS = {
  commercial_building: Building2,
  residential_development: Home,
  office_renovation: Briefcase
};

export default function DemoPage() {
  const [demoProjects, setDemoProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [documents, setDocuments] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState(null);
  const [findings, setFindings] = useState([]);
  const [hasRun, setHasRun] = useState(false);

  // Load demo projects
  useEffect(() => {
    const fetchProjects = async () => {
      setLoadingProjects(true);
      try {
        const res = await apiClient('/demo/projects');
        const list = res?.data?.projects || [];
        setDemoProjects(list);
        if (list.length > 0) {
          setSelectedProjectId(list[0].id || list[0]._id);
        }
      } catch (err) {
        setError(err.message || 'Failed to load demo projects');
      } finally {
        setLoadingProjects(false);
      }
    };
    fetchProjects();
  }, []);

  // Load documents for selected project
  const loadDocuments = useCallback(async (projId) => {
    if (!projId) return;
    setLoadingDocs(true);
    setFindings([]);
    setHasRun(false);
    try {
      const res = await apiClient(`/demo/projects/${projId}/documents`);
      setDocuments(res?.data?.documents || []);
    } catch {
      setDocuments([]);
    } finally {
      setLoadingDocs(false);
    }
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      loadDocuments(selectedProjectId);
    }
  }, [selectedProjectId, loadDocuments]);

  const selectedProject = demoProjects.find((p) => (p.id || p._id) === selectedProjectId);

  // Identify original and revised docs automatically for the demo scenario
  const originalDoc = documents.find((d) =>
    ['original_specification', 'original_contract'].includes(d.category)
  );
  const revisedDoc = documents.find((d) =>
    ['revised_specification', 'change_request'].includes(d.category)
  );

  const handleRunDemo = async () => {
    if (!selectedProjectId || !originalDoc || !revisedDoc) return;

    setRunning(true);
    setError(null);
    try {
      const res = await apiClient('/demo/investigations', {
        method: 'POST',
        body: JSON.stringify({
          projectId: selectedProjectId,
          originalDocumentId: originalDoc.id || originalDoc._id,
          revisedDocumentId: revisedDoc.id || revisedDoc._id
        })
      });

      const investigation = res?.data?.investigation;
      if (investigation?.id || investigation?._id) {
        const findingsRes = await apiClient(
          `/demo/investigations/${investigation.id || investigation._id}/findings`
        );
        setFindings(findingsRes?.data?.findings || []);
        setHasRun(true);
      }
    } catch (err) {
      setError(err.message || 'Demo investigation failed');
    } finally {
      setRunning(false);
    }
  };

  const IconComponent = selectedProject
    ? PROJECT_TYPE_ICONS[selectedProject.projectType] || Building2
    : Building2;

  return (
    <div className="py-10 px-4 md:px-8 max-w-6xl mx-auto space-y-8">
      {/* Demo Header */}
      <div className="space-y-3 text-center max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-primary-container/10 text-primary-container border border-primary-container/20">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Interactive Sandbox Demo</span>
        </div>
        <h1 className="text-2xl md:text-4xl font-headline font-bold text-primary">
          Explore ScopeSentry In Action
        </h1>
        <p className="text-sm text-secondary">
          Experience our deterministic change detection and AI-assisted impact analysis on real fictional construction contracts. No signup required.
        </p>
      </div>

      {/* Mandatory Limitations Banner */}
      <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 flex items-start gap-3 max-w-4xl mx-auto">
        <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong>Demo Notice:</strong> You are exploring fictional sample data with pre-seeded documents. All findings are labeled as &quot;Demo Data&quot;. No visitor actions mutate production datasets.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs max-w-4xl mx-auto">
          {error}
        </div>
      )}

      {/* Project Scenario Switcher */}
      {loadingProjects ? (
        <div className="h-16 bg-surface rounded-xl border border-border animate-pulse" />
      ) : demoProjects.length === 0 ? (
        <div className="bg-surface rounded-xl border border-dashed border-border p-8 text-center max-w-xl mx-auto space-y-3">
          <p className="text-sm font-semibold text-secondary-navy">No demo scenarios currently loaded.</p>
          <p className="text-xs text-secondary">Click below to refresh the pre-seeded construction scenarios.</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary-container text-white text-xs font-semibold rounded-lg shadow-sm"
          >
            Reload Scenarios
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {demoProjects.map((p) => {
            const isSelected = (p.id || p._id) === selectedProjectId;
            const CardIcon = PROJECT_TYPE_ICONS[p.projectType] || Building2;
            return (
              <button
                key={p.id || p._id}
                onClick={() => setSelectedProjectId(p.id || p._id)}
                className={`p-4 rounded-xl border text-left transition-all flex items-start gap-3.5 ${
                  isSelected
                    ? 'bg-surface border-primary-container shadow-md ring-1 ring-primary-container'
                    : 'bg-surface/60 border-border hover:bg-surface hover:border-border/80'
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                    isSelected ? 'bg-primary-container text-white' : 'bg-muted text-secondary'
                  }`}
                >
                  <CardIcon className="w-5 h-5" />
                </div>
                <div className="space-y-0.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-secondary">
                      Scenario
                    </span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-muted text-secondary font-mono">
                      Demo Data
                    </span>
                  </div>
                  <h3 className="font-headline font-bold text-xs text-primary truncate">
                    {p.name.replace(' (Demo)', '')}
                  </h3>
                  <p className="text-[11px] text-secondary line-clamp-1">
                    {p.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Scenario Documents & Action Box */}
      {selectedProject && (
        <div className="bg-surface rounded-2xl border border-border p-6 md:p-8 space-y-6 shadow-card">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary-container/10 text-primary-container flex items-center justify-center shrink-0">
                <IconComponent className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-headline font-bold text-lg text-primary">
                    {selectedProject.name}
                  </h2>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary-container/10 text-primary-container border border-primary-container/20">
                    Demo Project
                  </span>
                </div>
                <p className="text-xs text-secondary mt-0.5">
                  Budget: ${selectedProject.budget?.toLocaleString()} {selectedProject.currency} • Location: {selectedProject.location}
                </p>
              </div>
            </div>

            <button
              onClick={handleRunDemo}
              disabled={running || loadingDocs || !originalDoc || !revisedDoc}
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary-container text-white text-xs font-semibold rounded-xl shadow-md hover:opacity-95 disabled:opacity-50 transition-all shrink-0"
            >
              {running ? (
                <>
                  <RotateCw className="w-4 h-4 animate-spin" />
                  <span>Running AI Detective...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  <span>Run Live Investigation</span>
                </>
              )}
            </button>
          </div>

          {/* Compared Documents Preview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-muted/30 border border-border space-y-2">
              <span className="text-[10px] uppercase font-bold text-secondary tracking-wider block">
                Original Baseline Specification
              </span>
              <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                <FileText className="w-4 h-4 text-primary-container shrink-0" />
                <span className="truncate">{originalDoc?.originalFilename || 'Loading...'}</span>
              </div>
              <p className="text-[11px] text-secondary">
                Category: <span className="font-mono text-primary">{originalDoc?.category}</span>
              </p>
            </div>

            <div className="p-4 rounded-xl bg-muted/30 border border-border space-y-2">
              <span className="text-[10px] uppercase font-bold text-secondary tracking-wider block">
                Revised Comparison Document
              </span>
              <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                <FileText className="w-4 h-4 text-primary-container shrink-0" />
                <span className="truncate">{revisedDoc?.originalFilename || 'Loading...'}</span>
              </div>
              <p className="text-[11px] text-secondary">
                Category: <span className="font-mono text-primary">{revisedDoc?.category}</span>
              </p>
            </div>
          </div>

          {/* Findings Display */}
          {running && (
            <div className="py-12 text-center space-y-3">
              <RotateCw className="w-8 h-8 text-primary-container animate-spin mx-auto" />
              <h4 className="font-headline font-bold text-sm text-primary">
                Executing 4-Stage Investigation Engine...
              </h4>
              <p className="text-xs text-secondary max-w-sm mx-auto">
                Parsing specifications, comparing exact values deterministically, calculating decimal cost differences, and verifying citations.
              </p>
            </div>
          )}

          {hasRun && !running && (
            <div className="space-y-4 pt-4 border-t border-border">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-headline font-bold text-base text-primary">
                    Investigation Findings ({findings.length})
                  </h3>
                  <p className="text-xs text-secondary">
                    Grounded scope changes discovered across compared documents.
                  </p>
                </div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">
                  <CheckCircle2 className="w-4 h-4" /> Completed
                </span>
              </div>

              {findings.length === 0 ? (
                <div className="py-8 text-center text-xs text-secondary">
                  No changes detected for this scenario.
                </div>
              ) : (
                <div className="space-y-3">
                  {findings.map((f, idx) => (
                    <div
                      key={idx}
                      className="p-5 rounded-xl border border-border bg-surface space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-primary-container/10 text-primary-container">
                            {f.category?.replace('_', ' ')}
                          </span>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">
                            Confirmed from document
                          </span>
                          {f.approvalEvidence?.status === 'approved_in_writing' ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-700">
                              <ShieldCheck className="w-3 h-3" /> Approved
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded bg-muted text-secondary">
                              <ShieldAlert className="w-3 h-3" /> Approval not found
                            </span>
                          )}
                        </div>

                        {f.impact?.estimatedCostDifference !== null && (
                          <div className="text-right">
                            <span className="text-[10px] text-secondary uppercase font-semibold block">
                              Cost Impact
                            </span>
                            <span className="text-xs font-bold text-emerald-600">
                              ${Number(f.impact.estimatedCostDifference).toLocaleString()}{' '}
                              <span className="text-[10px] font-normal text-secondary">(Estimate)</span>
                            </span>
                          </div>
                        )}
                      </div>

                      <h4 className="font-headline font-bold text-sm text-primary">{f.title}</h4>
                      <p className="text-xs text-secondary leading-relaxed">{f.description}</p>

                      {/* Evidence Citations */}
                      {f.evidence?.length > 0 && (
                        <div className="p-3 rounded-lg bg-muted/20 border border-border font-mono text-[11px] space-y-1">
                          <span className="text-[10px] font-bold text-secondary uppercase block">
                            Grounding Citation Excerpt:
                          </span>
                          <blockquote className="italic text-primary border-l-2 border-primary-container pl-2">
                            &quot;{f.evidence[0].snippet}&quot;
                          </blockquote>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* CTA Box */}
      <div className="p-8 rounded-2xl bg-secondary-navy text-white flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl">
        <div className="space-y-1 max-w-lg">
          <h3 className="font-headline font-bold text-xl text-white">
            Ready to investigate your real project contracts?
          </h3>
          <p className="text-xs text-slate-300">
            Sign up for ScopeSentry to upload private PDFs and DOCX files, manage multiple construction projects, and generate full 12-section PDF audit reports.
          </p>
        </div>
        <Link
          to="/register"
          className="inline-flex items-center gap-2 px-6 py-3 bg-primary-container text-white text-xs font-semibold rounded-xl hover:opacity-95 shadow-md shrink-0"
        >
          <span>Create Free Account</span>
          <ArrowUpRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
