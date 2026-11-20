import { useState, useEffect, useCallback, useMemo } from 'react';
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
  ArrowUpRight,
  Clock,
  DollarSign,
  AlertTriangle,
  ArrowRight,
  ArrowDown,
  Eye,
  EyeOff,
  Scale,
  MapPin,
  FlaskConical,
  FileSearch,
  GitCompare,
  Calculator,
  ChevronRight
} from 'lucide-react';

const PROJECT_TYPE_ICONS = {
  commercial_building: Building2,
  residential_development: Home,
  office_renovation: Briefcase
};

const SCENARIO_BRIEFS = {
  commercial_building: {
    badge: 'Spec Revision Audit',
    auditGoal:
      'Compare the original curtainwall/window specification against Rev 1 Issued-For-Change and OAC Week 12 meeting minutes.',
    lookFor:
      'Subcontractor quantity inflation (+12 units), glazing upgrade, a 14-day envelope schedule shift, and an unsigned Change Order #3.'
  },
  residential_development: {
    badge: 'Material Substitution Audit',
    auditGoal:
      'Audit a contractor change request substituting engineered Douglas Fir timber framing for cold-formed steel across 48 townhomes.',
    lookFor:
      '+$2,500/package unit rate surge (+$120,000 total project exposure) and a 24-day delivery milestone slip without signed owner approval.'
  },
  office_renovation: {
    badge: 'Scope Addition & Removal Audit',
    auditGoal:
      'Compare the corporate HQ tenant fitout baseline specification against Addendum 1 electrical and finish revisions.',
    lookFor:
      'Removal of 16 acoustic conference room wall panel packages (-$35,200) paired with an unpriced/added $85,000 rooftop Emergency Generator (+$49,800 net exposure).'
  }
};

const PIPELINE_STAGES = [
  {
    id: 1,
    title: '1. Document Understanding',
    desc: 'Extracts clauses, quantities, unit rates, and dates.',
    Icon: FileSearch
  },
  {
    id: 2,
    title: '2. Deterministic Clause Diff',
    desc: 'Matches section IDs and compares exact numbers.',
    Icon: GitCompare
  },
  {
    id: 3,
    title: '3. Decimal.js Impact Math',
    desc: 'Computes cost & schedule deltas without LLM guessing.',
    Icon: Calculator
  },
  {
    id: 4,
    title: '4. Citation & Approval Check',
    desc: 'Verifies verbatim snippets and change-order signatures.',
    Icon: ShieldCheck
  }
];

function getFileTypeBadge(filename) {
  const lower = String(filename || '').toLowerCase();
  if (lower.endsWith('.docx') || lower.endsWith('.doc')) {
    return {
      label: 'DOCX',
      className: 'bg-blue-100 text-blue-700 border-blue-200'
    };
  }
  return {
    label: 'PDF',
    className: 'bg-rose-100 text-rose-700 border-rose-200'
  };
}

function formatSignedCurrency(numValue) {
  const num = Number(numValue);
  if (Number.isNaN(num)) return '$0.00';
  const sign = num > 0 ? '+' : num < 0 ? '-' : '';
  return `${sign}$${Math.abs(num).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

export default function DemoPage() {
  const [demoProjects, setDemoProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [documents, setDocuments] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [running, setRunning] = useState(false);
  const [activeStage, setActiveStage] = useState(0);
  const [error, setError] = useState(null);
  const [findings, setFindings] = useState([]);
  const [hasRun, setHasRun] = useState(false);
  const [showDocTexts, setShowDocTexts] = useState(true);

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
    setActiveStage(0);
    setError(null);
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

  const originalDoc = documents.find((d) =>
    ['original_specification', 'original_contract'].includes(d.category)
  );
  const revisedDoc = documents.find((d) =>
    ['revised_specification', 'change_request'].includes(d.category)
  );
  const supportingDocs = documents.filter(
    (d) =>
      (d.id || d._id) !== (originalDoc?.id || originalDoc?._id) &&
      (d.id || d._id) !== (revisedDoc?.id || revisedDoc?._id)
  );

  // Animate stages softly while request is running
  useEffect(() => {
    if (!running) return undefined;
    setActiveStage(1);
    const t2 = setTimeout(() => setActiveStage(2), 350);
    const t3 = setTimeout(() => setActiveStage(3), 700);
    const t4 = setTimeout(() => setActiveStage(4), 1050);
    return () => {
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [running]);

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
          revisedDocumentId: revisedDoc.id || revisedDoc._id,
          supportingDocumentIds: supportingDocs.map((d) => d.id || d._id)
        })
      });

      const investigation = res?.data?.investigation;
      if (investigation?.id || investigation?._id) {
        const findingsRes = await apiClient(
          `/demo/investigations/${investigation.id || investigation._id}/findings`
        );
        setFindings(findingsRes?.data?.findings || []);
        setHasRun(true);
        setActiveStage(4);
      }
    } catch (err) {
      setError(err.message || 'Demo investigation failed');
      setActiveStage(0);
    } finally {
      setRunning(false);
    }
  };

  // Compute executive impact summary metrics on the fly
  const summaryStats = useMemo(() => {
    let netCostImpact = 0;
    let hasCostEstimate = false;
    let maxScheduleDays = 0;
    let hasScheduleImpact = false;
    let unapprovedCount = 0;

    for (const f of findings) {
      if (f.impact?.estimatedCostDifference !== null && f.impact?.estimatedCostDifference !== undefined) {
        const val = Number(f.impact.estimatedCostDifference);
        if (!Number.isNaN(val)) {
          netCostImpact += val;
          hasCostEstimate = true;
        }
      }
      if (
        f.impact?.scheduleDifferenceDays !== null &&
        f.impact?.scheduleDifferenceDays !== undefined
      ) {
        const days = Number(f.impact.scheduleDifferenceDays);
        if (!Number.isNaN(days) && Math.abs(days) > Math.abs(maxScheduleDays)) {
          maxScheduleDays = days;
          hasScheduleImpact = true;
        }
      }
      if (f.approvalEvidence?.status !== 'approved_in_writing') {
        unapprovedCount += 1;
      }
    }

    return {
      totalFindings: findings.length,
      netCostImpact,
      hasCostEstimate,
      maxScheduleDays,
      hasScheduleImpact,
      unapprovedCount
    };
  }, [findings]);

  const IconComponent = selectedProject
    ? PROJECT_TYPE_ICONS[selectedProject.projectType] || Building2
    : Building2;

  const scenarioBrief = selectedProject
    ? SCENARIO_BRIEFS[selectedProject.projectType] || SCENARIO_BRIEFS.commercial_building
    : SCENARIO_BRIEFS.commercial_building;

  return (
    <div className="py-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Demo Hero Header with subtle dot-grid + faint radial blue glow */}
      <div className="relative rounded-2xl py-6 px-4 overflow-hidden">
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-40 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(rgba(37, 99, 235, 0.14) 1px, transparent 1px)',
            backgroundSize: '20px 20px'
          }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(circle at 50% 40%, rgba(37, 99, 235, 0.10) 0%, transparent 65%)'
          }}
        />
        <div className="relative z-10 space-y-3 text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-primary-container/10 text-primary-container border border-primary-container/20">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Interactive Sandbox Demo</span>
          </div>
          <h1 className="text-2xl md:text-4xl font-headline font-bold text-secondary-navy tracking-tight leading-[1.15]">
            See Hidden Change Orders Before You Sign
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed">
            Construction addenda and submittals often bury scope increases, material substitutions, and schedule slips inside dozens of spec pages. Pick a scenario below, inspect the actual contract text, and run ScopeSentry&apos;s 4-stage engine to see the exact dollar and schedule exposure caught automatically.
          </p>
        </div>
      </div>

      {/* 3-Step Visual Guide */}
      <div className="flex flex-col md:flex-row items-stretch gap-3">
        <div className="flex-1 min-h-[112px] p-4 rounded-2xl bg-surface border border-border shadow-card flex flex-col justify-center">
          <div className="flex items-center gap-2.5 mb-1.5">
            <span className="w-7 h-7 rounded-lg bg-primary-container text-white text-xs font-bold flex items-center justify-center shrink-0">
              1
            </span>
            <p className="text-sm font-headline font-bold text-secondary-navy">Select &amp; Read Contracts</p>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Pick one of 3 real-world scenarios and preview the Baseline Spec vs. Revised Document text side-by-side.
          </p>
        </div>

        <div className="hidden md:flex items-center justify-center shrink-0 text-slate-300" aria-hidden="true">
          <span className="w-2 border-t border-dashed border-slate-300" />
          <ChevronRight className="w-4 h-4 text-primary-container" />
          <span className="w-2 border-t border-dashed border-slate-300" />
        </div>

        <div className="flex-1 min-h-[112px] p-4 rounded-2xl bg-surface border border-border shadow-card flex flex-col justify-center">
          <div className="flex items-center gap-2.5 mb-1.5">
            <span className="w-7 h-7 rounded-lg bg-primary-container text-white text-xs font-bold flex items-center justify-center shrink-0">
              2
            </span>
            <p className="text-sm font-headline font-bold text-secondary-navy">Run 4-Stage Detective</p>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Our engine pairs AI extraction with deterministic Decimal math — AI never invents costs or quotes.
          </p>
        </div>

        <div className="hidden md:flex items-center justify-center shrink-0 text-slate-300" aria-hidden="true">
          <span className="w-2 border-t border-dashed border-slate-300" />
          <ChevronRight className="w-4 h-4 text-primary-container" />
          <span className="w-2 border-t border-dashed border-slate-300" />
        </div>

        <div className="flex-1 min-h-[112px] p-4 rounded-2xl bg-surface border border-border shadow-card flex flex-col justify-center">
          <div className="flex items-center gap-2.5 mb-1.5">
            <span className="w-7 h-7 rounded-lg bg-primary-container text-white text-xs font-bold flex items-center justify-center shrink-0">
              3
            </span>
            <p className="text-sm font-headline font-bold text-secondary-navy">Review Proven Exposure</p>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Get net cost impact, milestone delays, approval gaps, and verbatim contract citations in seconds.
          </p>
        </div>
      </div>

      {/* Compact Single-Line Limitations Banner */}
      <div className="py-2.5 px-4 rounded-xl bg-amber-50/70 border border-amber-200/80 border-l-4 border-l-amber-500 text-sm text-amber-950 flex items-center gap-3">
        <Info className="w-4 h-4 text-amber-600 shrink-0" />
        <p className="leading-snug">
          <strong>Demo Notice:</strong> You are exploring fictional sample data with pre-seeded documents. All findings are labeled as &quot;Demo Data&quot;. No visitor actions mutate production datasets.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
          {error}
        </div>
      )}

      {/* Project Scenario Switcher */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600">
            Select Construction Scenario
          </h2>
          <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-slate-100 border border-border text-slate-600 font-mono font-semibold">
            Demo Data
          </span>
        </div>

        {loadingProjects ? (
          <div className="h-24 bg-surface rounded-2xl border border-border animate-pulse" />
        ) : demoProjects.length === 0 ? (
          <div className="bg-surface rounded-2xl border border-dashed border-border p-8 text-center max-w-xl mx-auto space-y-3">
            <p className="text-sm font-semibold text-secondary-navy">No demo scenarios currently loaded.</p>
            <p className="text-xs text-slate-600">Click below to refresh the pre-seeded construction scenarios.</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary-container text-white text-xs font-semibold rounded-lg shadow-sm focus-ring"
            >
              Reload Scenarios
            </button>
          </div>
        ) : (
          <div
            role="radiogroup"
            aria-label="Demo construction scenarios"
            className="grid grid-cols-1 md:grid-cols-3 gap-4"
          >
            {demoProjects.map((p) => {
              const isSelected = (p.id || p._id) === selectedProjectId;
              const CardIcon = PROJECT_TYPE_ICONS[p.projectType] || Building2;
              const brief = SCENARIO_BRIEFS[p.projectType];
              return (
                <button
                  key={p.id || p._id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => setSelectedProjectId(p.id || p._id)}
                  className={`relative p-4 rounded-2xl border text-left transition-all duration-200 flex items-start gap-3.5 focus-ring hover:-translate-y-0.5 cursor-pointer ${
                    isSelected
                      ? 'bg-blue-50/40 border-transparent ring-2 ring-primary-container shadow-[0_8px_24px_-6px_rgba(37,99,235,0.28)]'
                      : 'bg-surface border-border hover:border-primary-container/50 shadow-card'
                  }`}
                >
                  {isSelected && (
                    <CheckCircle2
                      aria-hidden="true"
                      className="w-4 h-4 text-primary-container absolute top-3.5 right-3.5 shrink-0"
                    />
                  )}
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                      isSelected
                        ? 'bg-primary-container text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    <CardIcon className="w-5 h-5" />
                  </div>
                  <div className="space-y-1 flex-1 min-w-0 pr-5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-primary-container block">
                      {brief?.badge || 'Scenario'}
                    </span>
                    <h3 className="font-headline font-bold text-sm text-secondary-navy truncate">
                      {p.name.replace(' (Demo)', '')}
                    </h3>
                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {p.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Main Scenario Panel (Single Outer Card) */}
      {selectedProject && (
        <div className="bg-surface rounded-2xl border border-border p-6 md:p-8 space-y-6 shadow-card">
          {/* Header Row */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-border">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-primary-container/10 text-primary-container flex items-center justify-center shrink-0">
                <IconComponent className="w-6 h-6" />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-headline font-bold text-lg md:text-xl text-secondary-navy tracking-tight">
                    {selectedProject.name.replace(' (Demo)', '')}
                  </h2>
                  <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-primary-container/10 text-primary-container border border-primary-container/20">
                    Demo Project
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-medium">
                    <DollarSign className="w-3.5 h-3.5 text-slate-500" />
                    <span>
                      Budget: ${selectedProject.budget?.toLocaleString()} {selectedProject.currency}
                    </span>
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-medium">
                    <MapPin className="w-3.5 h-3.5 text-slate-500" />
                    <span>Location: {selectedProject.location}</span>
                  </span>
                </div>
              </div>
            </div>

            <div className="relative inline-flex shrink-0 self-start md:self-auto">
              {!running && !loadingDocs && originalDoc && revisedDoc && (
                <span
                  aria-hidden="true"
                  className="demo-cta-pulse absolute inset-0 rounded-xl bg-blue-500/35 pointer-events-none"
                />
              )}
              <button
                onClick={handleRunDemo}
                disabled={running || loadingDocs || !originalDoc || !revisedDoc}
                className="relative inline-flex items-center justify-center gap-2.5 px-7 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-blue-600/30 disabled:opacity-50 transition-all cursor-pointer focus-ring"
              >
                {running ? (
                  <>
                    <RotateCw className="w-4 h-4 animate-spin" />
                    <span>Running 4-Stage Audit...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    <span>{hasRun ? 'Re-Run Investigation' : 'Run Live Investigation'}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Scenario Audit Brief (Subtle Background + Vertical Divider on Desktop) */}
          <div className="rounded-xl bg-slate-50/90 grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border text-xs">
            <div className="p-4 space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary-container inline-flex items-center gap-1.5">
                <FlaskConical className="w-3.5 h-3.5" aria-hidden="true" />
                <span>What This Scenario Tests</span>
              </span>
              <p className="text-slate-700 leading-relaxed">{scenarioBrief.auditGoal}</p>
            </div>
            <div className="p-4 space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary-container inline-flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" aria-hidden="true" />
                <span>Hidden Risks Buried in These Files</span>
              </span>
              <p className="text-slate-700 leading-relaxed">{scenarioBrief.lookFor}</p>
            </div>
          </div>

          {/* Documents Section with Code-Viewer Contract Text Preview */}
          <div className="space-y-3 pt-2 border-t border-border">
            <div className="flex items-center justify-between pt-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Contract Documents Being Compared ({documents.length})
              </h3>
              <button
                type="button"
                onClick={() => setShowDocTexts((prev) => !prev)}
                aria-expanded={showDocTexts}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-container hover:underline cursor-pointer focus-ring rounded"
              >
                {showDocTexts ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{showDocTexts ? 'Hide Contract Text' : 'Show Contract Text'}</span>
              </button>
            </div>

            <div className={`grid grid-cols-1 ${supportingDocs.length > 0 ? 'lg:grid-cols-3' : 'md:grid-cols-2'} gap-4`}>
              {/* Original Document */}
              {(() => {
                const badge = getFileTypeBadge(originalDoc?.originalFilename);
                return (
                  <div className="p-4 rounded-xl bg-slate-50/80 border border-border/80 flex flex-col">
                    <div className="min-h-[4.75rem] space-y-1.5">
                      <span className="text-[10px] uppercase font-bold text-slate-600 tracking-wider block">
                        Original Baseline
                      </span>
                      <div className="flex items-center gap-2 text-xs font-semibold text-secondary-navy">
                        <FileText className="w-4 h-4 text-primary-container shrink-0" />
                        <span className="truncate flex-1">{originalDoc?.originalFilename || 'Loading...'}</span>
                        <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border shrink-0 ${badge.className}`}>
                          {badge.label}
                        </span>
                      </div>
                      <div>
                        <span className="inline-block text-[10px] font-mono px-2 py-0.5 rounded bg-white border border-border text-slate-600">
                          {originalDoc?.category}
                        </span>
                      </div>
                    </div>

                    <div
                      className={`transition-all duration-300 overflow-hidden ${
                        showDocTexts && originalDoc?.extractedText
                          ? 'max-h-60 opacity-100 mt-3'
                          : 'max-h-0 opacity-0 mt-0'
                      }`}
                    >
                      <div className="relative rounded-lg bg-slate-100/90 border border-border/80">
                        <pre className="p-3 pb-6 font-mono text-xs text-slate-800 whitespace-pre-wrap leading-[1.7] overflow-y-auto max-h-52 demo-scrollbar">
                          {originalDoc?.extractedText}
                        </pre>
                        <div
                          aria-hidden="true"
                          className="pointer-events-none absolute inset-x-0 bottom-0 h-6 rounded-b-lg bg-gradient-to-t from-slate-100 to-transparent"
                        />
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Revised Document */}
              {(() => {
                const badge = getFileTypeBadge(revisedDoc?.originalFilename);
                return (
                  <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200 flex flex-col">
                    <div className="min-h-[4.75rem] space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] uppercase font-bold text-amber-900 tracking-wider">
                          Revised / Change Document
                        </span>
                        <span className="text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 shrink-0">
                          Revised
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs font-semibold text-secondary-navy">
                        <FileText className="w-4 h-4 text-amber-600 shrink-0" />
                        <span className="truncate flex-1">{revisedDoc?.originalFilename || 'Loading...'}</span>
                        <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border shrink-0 ${badge.className}`}>
                          {badge.label}
                        </span>
                      </div>
                      <div>
                        <span className="inline-block text-[10px] font-mono px-2 py-0.5 rounded bg-white border border-amber-200 text-amber-900">
                          {revisedDoc?.category}
                        </span>
                      </div>
                    </div>

                    <div
                      className={`transition-all duration-300 overflow-hidden ${
                        showDocTexts && revisedDoc?.extractedText
                          ? 'max-h-60 opacity-100 mt-3'
                          : 'max-h-0 opacity-0 mt-0'
                      }`}
                    >
                      <div className="relative rounded-lg bg-slate-100/90 border border-amber-200">
                        <pre className="p-3 pb-6 font-mono text-xs text-slate-900 whitespace-pre-wrap leading-[1.7] overflow-y-auto max-h-52 demo-scrollbar">
                          {revisedDoc?.extractedText}
                        </pre>
                        <div
                          aria-hidden="true"
                          className="pointer-events-none absolute inset-x-0 bottom-0 h-6 rounded-b-lg bg-gradient-to-t from-slate-100 to-transparent"
                        />
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Supporting Docs (e.g. Meeting Minutes) */}
              {supportingDocs.map((sup) => {
                const badge = getFileTypeBadge(sup.originalFilename);
                return (
                  <div
                    key={sup.id || sup._id}
                    className="p-4 rounded-xl bg-slate-50/80 border border-border/80 flex flex-col"
                  >
                    <div className="min-h-[4.75rem] space-y-1.5">
                      <span className="text-[10px] uppercase font-bold text-slate-600 tracking-wider block">
                        Supporting Record
                      </span>
                      <div className="flex items-center gap-2 text-xs font-semibold text-secondary-navy">
                        <FileText className="w-4 h-4 text-secondary-navy shrink-0" />
                        <span className="truncate flex-1">{sup.originalFilename}</span>
                        <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border shrink-0 ${badge.className}`}>
                          {badge.label}
                        </span>
                      </div>
                      <div>
                        <span className="inline-block text-[10px] font-mono px-2 py-0.5 rounded bg-white border border-border text-slate-600">
                          {sup.category}
                        </span>
                      </div>
                    </div>

                    <div
                      className={`transition-all duration-300 overflow-hidden ${
                        showDocTexts && sup.extractedText
                          ? 'max-h-60 opacity-100 mt-3'
                          : 'max-h-0 opacity-0 mt-0'
                      }`}
                    >
                      <div className="relative rounded-lg bg-slate-100/90 border border-border/80">
                        <pre className="p-3 pb-6 font-mono text-xs text-slate-800 whitespace-pre-wrap leading-[1.7] overflow-y-auto max-h-52 demo-scrollbar">
                          {sup.extractedText}
                        </pre>
                        <div
                          aria-hidden="true"
                          className="pointer-events-none absolute inset-x-0 bottom-0 h-6 rounded-b-lg bg-gradient-to-t from-slate-100 to-transparent"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 4-Stage Connected Pipeline Mini-Cards */}
          <div className="pt-4 border-t border-border">
            <div className="flex flex-col lg:flex-row items-stretch">
              {PIPELINE_STAGES.map((stage, idx) => {
                const isDone = hasRun && !running;
                const isActive = running && activeStage >= stage.id;
                const StepIcon = stage.Icon;
                return (
                  <div key={stage.id} className="contents">
                    <div
                      className={`flex-1 p-3.5 rounded-xl border transition-all duration-200 hover:-translate-y-0.5 flex flex-col justify-between ${
                        isDone
                          ? 'bg-emerald-500/5 border-emerald-500/30'
                          : isActive
                            ? 'bg-primary-container/10 border-primary-container/40'
                            : 'bg-slate-50/70 border-border/80'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-headline font-bold text-secondary-navy">
                          {stage.title}
                        </span>
                        {isDone ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : isActive ? (
                          <RotateCw className="w-4 h-4 text-primary-container animate-spin shrink-0" />
                        ) : (
                          <StepIcon className="w-4 h-4 text-primary-container shrink-0" aria-hidden="true" />
                        )}
                      </div>
                      <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">{stage.desc}</p>
                    </div>

                    {idx < PIPELINE_STAGES.length - 1 && (
                      <div className="flex items-center justify-center py-1.5 lg:py-0 lg:px-1 shrink-0" aria-hidden="true">
                        <ChevronRight className="w-4 h-4 text-slate-400 hidden lg:block" />
                        <ArrowDown className="w-4 h-4 text-slate-400 lg:hidden" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Running Spinner */}
          {running && (
            <div className="py-10 text-center space-y-3 border-t border-border">
              <RotateCw className="w-8 h-8 text-primary-container animate-spin mx-auto" />
              <h4 className="font-headline font-bold text-sm text-primary">
                Executing 4-Stage Investigation Engine...
              </h4>
              <p className="text-xs text-slate-600 max-w-md mx-auto">
                Comparing clauses deterministically, running Decimal.js cost &amp; schedule math, and verifying verbatim citations against indexed contract chunks.
              </p>
            </div>
          )}

          {/* Prompt before running */}
          {!hasRun && !running && (
            <div className="p-5 rounded-xl bg-gradient-to-r from-blue-50/90 to-indigo-50/70 border border-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <p className="text-sm font-headline font-bold text-secondary-navy">
                  Ready to inspect {selectedProject.name.replace(' (Demo)', '')}
                </p>
                <p className="text-xs text-slate-700">
                  Click <strong>&quot;Run Live Investigation&quot;</strong> above to see every hidden cost delta, schedule shift, and missing signature caught from these documents.
                </p>
              </div>
              <button
                onClick={handleRunDemo}
                disabled={loadingDocs || !originalDoc || !revisedDoc}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-secondary-navy text-white text-xs font-semibold rounded-xl hover:opacity-95 disabled:opacity-50 shrink-0 cursor-pointer shadow-sm focus-ring"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Run Audit Now</span>
              </button>
            </div>
          )}

          {/* Results & Benefit Summary */}
          {hasRun && !running && (
            <div className="space-y-6 pt-6 border-t border-border">
              {/* Executive Impact Summary */}
              {findings.length > 0 && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-primary-container block">
                        Investigation Audit Summary • Demo Data
                      </span>
                      <h3 className="font-headline font-bold text-base md:text-lg text-primary">
                        What ScopeSentry Just Caught For You
                      </h3>
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 self-start sm:self-auto">
                      <CheckCircle2 className="w-4 h-4" /> 4-Stage Audit Completed
                    </span>
                  </div>

                  {/* 4 KPI Benefit Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="p-4 rounded-xl bg-muted/30 border border-border space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-secondary block">
                        Changes Detected
                      </span>
                      <div className="text-xl font-headline font-bold text-primary">
                        {summaryStats.totalFindings} Scope Deltas
                      </div>
                      <p className="text-[11px] text-secondary">
                        Verified against contract chunks
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/25 space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1">
                        <DollarSign className="w-3 h-3" /> Net Cost Exposure
                      </span>
                      <div className="text-xl font-headline font-bold text-amber-950">
                        {summaryStats.hasCostEstimate
                          ? formatSignedCurrency(summaryStats.netCostImpact)
                          : 'Unit Price Needed'}
                      </div>
                      <p className="text-[11px] text-amber-800">
                        Estimated via Decimal.js backend math
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-primary-container/10 border border-primary-container/20 space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-primary-container flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Schedule Shift
                      </span>
                      <div className="text-xl font-headline font-bold text-primary">
                        {summaryStats.hasScheduleImpact
                          ? `${summaryStats.maxScheduleDays > 0 ? '+' : ''}${summaryStats.maxScheduleDays} Days`
                          : 'No Date Shift'}
                      </div>
                      <p className="text-[11px] text-secondary">
                        Calendar milestone delta tracked
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-rose-800 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Unapproved Risks
                      </span>
                      <div className="text-xl font-headline font-bold text-rose-900">
                        {summaryStats.unapprovedCount} Flagged
                      </div>
                      <p className="text-[11px] text-rose-700">
                        Missing signed change-order proof
                      </p>
                    </div>
                  </div>

                  {/* Plain-language Why This Matters */}
                  <div className="p-4 rounded-xl bg-secondary-navy text-white flex items-start gap-3">
                    <Scale className="w-5 h-5 text-primary-container shrink-0 mt-0.5" />
                    <div className="text-xs leading-relaxed text-slate-200">
                      <strong className="text-white">Why this matters on a real project:</strong>{' '}
                      Without automated cross-document auditing, silent spec revisions turn into unbilled subcontractor rework or surprise change-order claims months later. ScopeSentry separates{' '}
                      <span className="underline">confirmed contract facts</span> from{' '}
                      <span className="underline">estimated cost exposure</span> and refuses to treat unverified text as approved — giving project owners full audit proof before signing.
                    </div>
                  </div>
                </div>
              )}

              {/* Findings Header */}
              <div className="flex items-center justify-between pt-2">
                <div>
                  <h3 className="font-headline font-bold text-base text-primary">
                    Detailed Findings ({findings.length})
                  </h3>
                  <p className="text-xs text-secondary">
                    Every number below comes from deterministic comparison; every quote is verified verbatim against document chunks.
                  </p>
                </div>
              </div>

              {findings.length === 0 ? (
                <div className="py-8 text-center text-xs text-secondary bg-muted/20 rounded-xl border border-border">
                  No changes detected for this scenario. Try selecting another scenario above.
                </div>
              ) : (
                <div className="space-y-4">
                  {findings.map((f, idx) => {
                    const hasCost =
                      f.impact?.estimatedCostDifference !== null &&
                      f.impact?.estimatedCostDifference !== undefined;
                    const hasSchedule =
                      f.impact?.scheduleDifferenceDays !== null &&
                      f.impact?.scheduleDifferenceDays !== undefined;
                    const isPendingSig = f.approvalEvidence?.status === 'pending_signature';
                    const isApproved = f.approvalEvidence?.status === 'approved_in_writing';

                    return (
                      <div
                        key={f.id || idx}
                        className="p-5 rounded-xl border border-border bg-surface space-y-4 shadow-sm"
                      >
                        {/* Badges & Impact Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-primary-container/10 text-primary-container capitalize">
                              {f.category?.replace(/_/g, ' ')}
                            </span>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">
                              Confirmed from document
                            </span>
                            {isApproved ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">
                                <ShieldCheck className="w-3 h-3" /> Approved in Writing
                              </span>
                            ) : isPendingSig ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-500/10 text-amber-800 border border-amber-500/25">
                                <ShieldAlert className="w-3 h-3" /> Pending Signature (Not Signed)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded bg-rose-500/10 text-rose-700 border border-rose-500/20">
                                <ShieldAlert className="w-3 h-3" /> Approval Not Found
                              </span>
                            )}
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-muted text-secondary">
                              Demo Data
                            </span>
                          </div>

                          <div className="flex items-center gap-4 shrink-0">
                            {hasCost && (
                              <div className="sm:text-right">
                                <span className="text-[10px] text-secondary uppercase font-semibold block">
                                  Cost Impact (Estimate)
                                </span>
                                <span
                                  className={`text-sm font-headline font-bold ${
                                    Number(f.impact.estimatedCostDifference) >= 0
                                      ? 'text-amber-700'
                                      : 'text-emerald-700'
                                  }`}
                                >
                                  {formatSignedCurrency(f.impact.estimatedCostDifference)}
                                </span>
                              </div>
                            )}
                            {hasSchedule && (
                              <div className="sm:text-right">
                                <span className="text-[10px] text-secondary uppercase font-semibold block">
                                  Schedule Delta
                                </span>
                                <span className="text-sm font-headline font-bold text-primary-container">
                                  {f.impact.scheduleDifferenceDays > 0 ? '+' : ''}
                                  {f.impact.scheduleDifferenceDays} Days
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div>
                          <h4 className="font-headline font-bold text-sm text-primary">{f.title}</h4>
                          <p className="text-xs text-secondary leading-relaxed mt-1">{f.description}</p>
                        </div>

                        {/* Side-by-side Original vs Revised Comparison */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3.5 rounded-lg bg-muted/30 border border-border text-xs">
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-secondary block">
                              Original Baseline
                            </span>
                            <p className="font-mono font-semibold text-primary mt-0.5">
                              {f.scheduleInfo?.originalDate
                                ? f.scheduleInfo.originalDate
                                : f.originalValue
                                  ? `${f.originalValue}${f.unit ? ` ${f.unit}` : ''}`
                                  : 'Not in baseline'}
                            </p>
                          </div>

                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-secondary block">
                              Revised Submittal
                            </span>
                            <p className="font-mono font-semibold text-amber-800 mt-0.5 flex items-center gap-1.5">
                              <ArrowRight className="w-3 h-3 text-amber-600 shrink-0" />
                              <span>
                                {f.scheduleInfo?.revisedDate
                                  ? f.scheduleInfo.revisedDate
                                  : f.revisedValue
                                    ? `${f.revisedValue}${f.unit ? ` ${f.unit}` : ''}`
                                    : 'Removed'}
                              </span>
                            </p>
                          </div>

                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-secondary block">
                              Backend Formula (Decimal.js)
                            </span>
                            <p className="font-mono text-[11px] text-primary mt-0.5">
                              {hasCost && f.impact?.quantityDifference !== null
                                ? `${Number(f.impact.quantityDifference) >= 0 ? '+' : ''}${f.impact.quantityDifference} × $${Number(f.impact.activeUnitPrice).toLocaleString()} = ${formatSignedCurrency(f.impact.estimatedCostDifference)}`
                                : hasSchedule
                                  ? `${f.scheduleInfo?.originalDate} -> ${f.scheduleInfo?.revisedDate} (${f.impact.scheduleDifferenceDays}d)`
                                  : f.impact?.costEstimateNote || 'Deterministic comparison'}
                            </p>
                          </div>
                        </div>

                        {/* Evidence Citations */}
                        {f.evidence?.length > 0 && (
                          <div className="p-3.5 rounded-lg bg-muted/20 border border-border font-mono text-[11px] space-y-2">
                            <span className="text-[10px] font-bold text-secondary uppercase block">
                              Verified Grounding Citations ({f.evidence.length}):
                            </span>
                            <div className="space-y-1.5">
                              {f.evidence.slice(0, 3).map((ev, evIdx) => (
                                <blockquote
                                  key={evIdx}
                                  className="italic text-primary border-l-2 border-primary-container pl-2.5 leading-relaxed"
                                >
                                  {ev.section ? (
                                    <span className="not-italic text-[10px] font-bold text-primary-container mr-1.5">
                                      [{ev.section}]
                                    </span>
                                  ) : null}
                                  &quot;{ev.snippet}&quot;
                                </blockquote>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* CTA Box */}
      <div className="relative overflow-hidden p-8 rounded-2xl bg-secondary-navy text-white flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl">
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(rgba(148, 163, 184, 0.35) 1px, transparent 1px)',
            backgroundSize: '24px 24px'
          }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(circle at 25% 40%, rgba(37, 99, 235, 0.28) 0%, transparent 65%)'
          }}
        />
        <div className="relative z-10 space-y-1 max-w-lg">
          <h3 className="font-headline font-bold text-xl text-white tracking-tight">
            Ready to investigate your real project contracts?
          </h3>
          <p className="text-xs text-slate-300">
            Sign up for ScopeSentry to upload private PDFs and DOCX files, manage multiple construction projects, and generate full 12-section PDF audit reports.
          </p>
        </div>
        <Link
          to="/register"
          className="relative z-10 inline-flex items-center gap-2 px-6 py-3 bg-primary-container text-white text-xs font-semibold rounded-xl hover:opacity-95 shadow-md shrink-0 focus-ring"
        >
          <span>Create Free Account</span>
          <ArrowUpRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
