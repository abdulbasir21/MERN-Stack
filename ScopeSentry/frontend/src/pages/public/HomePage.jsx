import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ArrowDown,
  ShieldCheck,
  FileSearch,
  Cpu,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Home,
  Briefcase,
  Lock,
  Scale,
  Sparkles,
  TrendingUp,
  Calendar,
  GitCompare,
  Calculator
} from 'lucide-react';

const PIPELINE_STEPS = [
  {
    num: '01',
    title: 'Ingest & Clause Index',
    description:
      'PDF and DOCX submittals are parsed, verified with magic bytes, and indexed into clause-aware chunks preserving CSI division numbers.',
    tag: 'Magic-byte verified',
    Icon: FileSearch,
    tileGradient: 'from-blue-500 to-indigo-600',
    dotColor: 'bg-blue-400',
    nodeColor: 'bg-blue-400 ring-blue-400/30',
    spotlightColor: 'rgba(59, 130, 246, 0.16)',
    hoverShadow: 'hover:shadow-[0_0_40px_-10px_rgba(59,130,246,0.5)]'
  },
  {
    num: '02',
    title: 'Deterministic Matching',
    description:
      'Items, clause numbers, and dates are compared deterministically. LLMs are prohibited from performing mathematical calculations.',
    tag: 'No LLM math',
    Icon: GitCompare,
    tileGradient: 'from-amber-500 to-orange-600',
    dotColor: 'bg-amber-400',
    nodeColor: 'bg-amber-400 ring-amber-400/30',
    spotlightColor: 'rgba(245, 158, 11, 0.15)',
    hoverShadow: 'hover:shadow-[0_0_40px_-10px_rgba(245,158,11,0.45)]'
  },
  {
    num: '03',
    title: 'Pure Decimal Math',
    description:
      'Financial deltas are calculated in pure decimal code. Missing unit rates are clearly flagged as “Cannot estimate” per BR-I7.',
    tag: 'Exact decimals',
    Icon: Calculator,
    tileGradient: 'from-emerald-500 to-teal-600',
    dotColor: 'bg-emerald-400',
    nodeColor: 'bg-emerald-400 ring-emerald-400/30',
    spotlightColor: 'rgba(16, 185, 129, 0.15)',
    hoverShadow: 'hover:shadow-[0_0_40px_-10px_rgba(16,185,129,0.45)]'
  },
  {
    num: '04',
    title: '12-Section PDF Audit',
    description:
      'Generates boardroom-ready 12-section PDF reports with human review audit stamps, signed URLs, and statutory disclaimers.',
    tag: 'Audit-stamped',
    Icon: FileText,
    tileGradient: 'from-purple-500 to-indigo-600',
    dotColor: 'bg-purple-400',
    nodeColor: 'bg-purple-400 ring-purple-400/30',
    spotlightColor: 'rgba(168, 85, 247, 0.16)',
    hoverShadow: 'hover:shadow-[0_0_40px_-10px_rgba(168,85,247,0.5)]'
  }
];

export default function HomePage() {
  const pipelineRef = useRef(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() =>
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
  const [pipelineVisible, setPipelineVisible] = useState(() => prefersReducedMotion);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleMotionChange = (e) => {
      setPrefersReducedMotion(e.matches);
      if (e.matches) setPipelineVisible(true);
    };
    mediaQuery.addEventListener('change', handleMotionChange);

    if (mediaQuery.matches) {
      setPipelineVisible(true);
      return () => mediaQuery.removeEventListener('change', handleMotionChange);
    }

    const el = pipelineRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setPipelineVisible(true);
      return () => mediaQuery.removeEventListener('change', handleMotionChange);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setPipelineVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(el);

    return () => {
      observer.disconnect();
      mediaQuery.removeEventListener('change', handleMotionChange);
    };
  }, []);

  const handleCardMouseMove = (e) => {
    if (prefersReducedMotion) return;
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--mx', `${e.clientX - rect.left}px`);
    e.currentTarget.style.setProperty('--my', `${e.clientY - rect.top}px`);
  };

  return (
    <div className="flex flex-col bg-background text-on-surface">
      {/* =========================================================================
          SECTION 1: HERO WITH CINEMATIC CONSTRUCTION PHOTOGRAPHY & GLASS CARDS
      ========================================================================= */}
      <section className="relative w-full flex items-center py-6 sm:py-8 lg:py-10 overflow-hidden">
        {/* Full-width realistic construction photograph background */}
        <img
          src="/images/hero-construction.jpg"
          alt="Modern commercial high-rise skyscraper under active construction at dusk"
          className="absolute inset-0 w-full h-full object-cover object-center z-0"
        />

        {/* Uniform dark navy gradient overlay so text is readable everywhere */}
        <div
          className="absolute inset-0 bg-gradient-to-br from-[#0a1428]/[0.85] to-[#0a1428]/[0.65] pointer-events-none z-10"
        />

        {/* Soft bottom fade transitioning smoothly into the white trust bar */}
        <div className="bg-gradient-to-t from-background via-background/30 to-transparent h-12 w-full absolute bottom-0 left-0 z-20 pointer-events-none" />

        {/* Hero Grid Container */}
        <div className="relative z-30 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
            {/* Left Column: Frosted Glass Text Container */}
            <div className="lg:col-span-7 text-left">
              <div className="bg-slate-900/65 backdrop-blur-xl rounded-[28px] border border-white/20 p-6 sm:p-7 lg:px-8 lg:py-6 shadow-2xl w-full max-w-[44rem]">
                {/* Pill with amber pulse */}
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 mb-3.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                  <span className="text-xs text-white font-medium tracking-wide">
                    AI Construction Change Detective
                  </span>
                </div>

                {/* Primary High-Impact Headline */}
                <h1
                  className="font-headline text-[1.75rem] sm:text-4xl lg:text-[2.125rem] xl:text-[2.4rem] font-black text-white tracking-[-0.015em] leading-[1.1] drop-shadow-sm mb-3 text-balance"
                  style={{ textWrap: 'balance' }}
                >
                  Every project change has a&nbsp;cost.{' '}
                  <br className="hidden lg:inline" />
                  <span className="text-blue-400">Make sure you see&nbsp;it.</span>
                </h1>

                {/* Subtitle */}
                <p
                  className="text-sm sm:text-base text-slate-200 mb-5 leading-relaxed font-normal"
                  style={{ textWrap: 'pretty' }}
                >
                  Compare original contract specifications with revised submittals. ScopeSentry detects every scope variance,
                  verifies citations to the exact clause, and calculates financial impacts in exact decimal math before you sign off.
                </p>

                {/* Action CTAs */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 mb-4">
                  <Link
                    to="/demo"
                    className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-lg shadow-blue-600/30 transition-all hover:translate-y-[-1px] active:scale-[0.98] focus-ring"
                  >
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>Try Interactive Demo</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>

                  <Link
                    to="/register"
                    className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-white/30 hover:border-white hover:bg-white/10 text-white font-semibold backdrop-blur-sm transition-all active:scale-[0.98] focus-ring"
                  >
                    <span>Create Free Account</span>
                  </Link>
                </div>

                {/* Proof Checkmarks */}
                <div className="pt-3.5 border-t border-white/15 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="flex items-center gap-2 text-white text-xs sm:text-sm font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>100% Backed by Docs</span>
                  </div>
                  <div className="flex items-center gap-2 text-white text-xs sm:text-sm font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Exact Decimal Math</span>
                  </div>
                  <div className="flex items-center gap-2 text-white text-xs sm:text-sm font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Human Audit Ledger</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Solid White Telemetry Cards */}
            <div className="lg:col-span-5 relative flex flex-col items-center lg:items-end justify-center">
              <div className="w-full max-w-md space-y-3">
                {/* Card 1: Investigation Summary with Chart */}
                <div className="bg-white rounded-[28px] border border-slate-200/80 p-4 shadow-xl shadow-black/10">
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                        <FileSearch className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-headline text-sm font-bold text-secondary-navy leading-tight">
                          Investigation Summary
                        </h3>
                        <p className="text-[11px] text-secondary">AIA Addendum #04 vs Base Specification</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[11px] font-bold font-mono whitespace-nowrap">
                      12 changes found
                    </span>
                  </div>

                  <div className="grid grid-cols-12 gap-3 items-center">
                    {/* SVG Donut Chart */}
                    <div className="col-span-5 flex flex-col items-center justify-center relative">
                      <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 36 36">
                        <path
                          className="text-slate-100"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3.8"
                        />
                        {/* Quantity (42%) */}
                        <path
                          className="text-blue-600"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke="currentColor"
                          strokeDasharray="42, 100"
                          strokeLinecap="round"
                          strokeWidth="3.8"
                        />
                        {/* Material (33%) */}
                        <path
                          className="text-amber-500"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke="currentColor"
                          strokeDasharray="33, 100"
                          strokeDashoffset="-42"
                          strokeLinecap="round"
                          strokeWidth="3.8"
                        />
                        {/* Spec (25%) */}
                        <path
                          className="text-purple-600"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke="currentColor"
                          strokeDasharray="25, 100"
                          strokeDashoffset="-75"
                          strokeLinecap="round"
                          strokeWidth="3.8"
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="font-headline text-base font-black text-secondary-navy leading-none">12</span>
                        <span className="text-[9px] uppercase tracking-wider text-secondary font-semibold">Total</span>
                      </div>
                    </div>

                    {/* Breakdown legend */}
                    <div className="col-span-7 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                          <span className="text-secondary font-medium">Quantity</span>
                        </div>
                        <span className="font-bold text-secondary-navy">5 items</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                          <span className="text-secondary font-medium">Material</span>
                        </div>
                        <span className="font-bold text-secondary-navy">4 items</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-purple-600" />
                          <span className="text-secondary font-medium">Specification</span>
                        </div>
                        <span className="font-bold text-secondary-navy">3 items</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card 2: Estimated Cost Impact Badge */}
                <div className="bg-white rounded-[28px] border border-slate-200/80 p-3.5 px-4 shadow-xl shadow-black/10 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-200/60 flex items-center justify-center shrink-0">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-secondary font-semibold uppercase tracking-wider">
                          Estimated Cost Delta
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">
                          Estimate
                        </span>
                      </div>
                      <div className="font-headline text-xl font-black text-amber-600 tracking-[-0.015em] leading-[1.1]">
                        +$54,200.00
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 font-mono block">CSI Div 08</span>
                    <span className="text-xs font-semibold text-emerald-600 font-mono">+12 Units</span>
                  </div>
                </div>

                {/* Micro Cards Row */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white rounded-[28px] border border-slate-200/80 p-2.5 px-3.5 shadow-xl shadow-black/10 flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-headline text-xs font-bold text-emerald-800 leading-tight">
                        +12 Windows
                      </div>
                      <div className="text-[10px] text-secondary">CSI 08 51 13</div>
                    </div>
                  </div>

                  <div className="bg-white rounded-[28px] border border-slate-200/80 p-2.5 px-3.5 shadow-xl shadow-black/10 flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-headline text-xs font-bold text-blue-800 leading-tight">
                        14-Day Shift
                      </div>
                      <div className="text-[10px] text-secondary">Milestone 2</div>
                    </div>
                  </div>
                </div>

                {/* Human Review Reminder */}
                <div className="bg-white rounded-[28px] border border-rose-200/80 p-2.5 px-4 shadow-xl shadow-black/10 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                      <AlertTriangle className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-semibold text-rose-900">
                      3 findings pending PM signature proof
                    </span>
                  </div>
                  <Link to="/demo" className="text-xs font-semibold text-blue-600 hover:underline focus-ring rounded">
                    View
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 2: ENTERPRISE TRUST & PILLARS BAR
      ========================================================================= */}
      <section className="bg-surface border-y border-border relative z-30 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-0 lg:divide-x lg:divide-border">
            <div className="flex items-center gap-3.5 px-4">
              <div className="w-10 h-10 rounded-xl bg-blue-100/80 border border-blue-200 text-blue-700 flex items-center justify-center shrink-0">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <div className="font-headline text-sm font-bold text-secondary-navy">4-Stage Pipeline</div>
                <div className="text-xs text-secondary">LangGraph automated investigation</div>
              </div>
            </div>

            <div className="flex items-center gap-3.5 px-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-100/80 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="font-headline text-sm font-bold text-secondary-navy">100% Grounded Citations</div>
                <div className="text-xs text-secondary">Verbatim chunk snippet verification</div>
              </div>
            </div>

            <div className="flex items-center gap-3.5 px-4">
              <div className="w-10 h-10 rounded-xl bg-amber-100/80 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <div className="font-headline text-sm font-bold text-secondary-navy">PDF & DOCX Submittals</div>
                <div className="text-xs text-secondary">Magic-byte validated extraction</div>
              </div>
            </div>

            <div className="flex items-center gap-3.5 px-4">
              <div className="w-10 h-10 rounded-xl bg-purple-100/80 border border-purple-200 text-purple-700 flex items-center justify-center shrink-0">
                <Scale className="w-5 h-5" />
              </div>
              <div>
                <div className="font-headline text-sm font-bold text-secondary-navy">Human Review Ledger</div>
                <div className="text-xs text-secondary">Append-only audit trail governance</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 3: THE HIDDEN COST OF SCOPE CREEP (INTERACTIVE DIFF VISUAL)
      ========================================================================= */}
      <section className="py-12 lg:py-16 bg-slate-50/80 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-10">
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold mb-3">
              THE REALITY OF CONSTRUCTION CONTRACTS
            </div>
            <h2 className="font-headline text-3xl sm:text-4xl font-extrabold text-secondary-navy tracking-[-0.015em] leading-[1.1] mb-3.5">
              One subtle addendum clause. Millions in dispute risk.
            </h2>
            <p className="text-base text-slate-600">
              A single substituted line item in Section 08 51 13 can wipe out a general contractor&apos;s margin. ScopeSentry
              mathematically flags the variance before signing.
            </p>
          </div>

          {/* Split Layout: Blueprint Image + Interactive Document Diff Card */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            {/* Left: Real-world Blueprints & Spec Review Image (enlarged) */}
            <div className="lg:col-span-5 relative rounded-2xl overflow-hidden shadow-card border border-border group min-h-[340px] lg:min-h-[410px]">
              <img
                src="/images/blueprints-spec.jpg"
                alt="Architect and engineer blueprints workspace with redline document markups"
                className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent pointer-events-none" />
              <div className="absolute bottom-4 left-4 right-4 bg-slate-900/80 backdrop-blur-md border border-white/20 p-3 rounded-xl flex items-center justify-between text-white">
                <div>
                  <span className="text-[10px] font-mono text-blue-400 uppercase tracking-wider block">
                    Document Ground Truth
                  </span>
                  <span className="text-xs font-bold font-headline">AIA G701 Submittal Markups</span>
                </div>
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                  Verified Citation
                </span>
              </div>
            </div>

            {/* Right: Interactive Document Diff Card */}
            <div className="lg:col-span-7 bg-surface rounded-2xl border border-border p-5 sm:p-7 shadow-card flex flex-col justify-center">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-border gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold font-mono uppercase tracking-wider text-secondary">
                    Spec Diff Comparison
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-blue-50 text-primary-container text-xs font-semibold font-mono">
                    CSI 08 51 13 — Glazing
                  </span>
                </div>
                <span className="text-xs font-mono text-amber-800 font-bold bg-amber-100 px-2.5 py-1 rounded-md border border-amber-300 self-start sm:self-auto">
                  Delta: +12 units (+$5,400.00)
                </span>
              </div>

              <div className="flex flex-col md:flex-row items-stretch gap-3 mt-5">
                {/* Original Spec */}
                <div className="flex-1 p-4 rounded-xl border border-border bg-slate-50/70 space-y-2.5">
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono font-semibold uppercase text-secondary block">
                      Baseline Spec (Sheet A-402)
                    </span>
                    <div className="text-right">
                      <span className="text-xs font-mono text-slate-600 font-semibold whitespace-nowrap">
                        $450 / unit
                      </span>
                    </div>
                  </div>
                  <div className="font-headline text-secondary-navy flex items-baseline gap-1.5">
                    <span className="text-2xl font-black">20</span>
                    <span className="text-sm font-bold">Standard Windows</span>
                  </div>
                  <p className="text-[11px] text-slate-600 font-mono bg-white p-2.5 rounded border border-border leading-relaxed">
                    &ldquo;Section 08 51 13: Contractor shall supply 20 standard thermally broken aluminum window units.&rdquo;
                  </p>
                </div>

                {/* Clear Delta Indicator Between Cards */}
                <div className="flex md:flex-col items-center justify-center gap-1.5 py-1 md:py-0 shrink-0">
                  <div className="w-8 h-8 rounded-full bg-amber-100 border border-amber-300 text-amber-800 flex items-center justify-center shadow-sm">
                    <ArrowRight className="w-4 h-4 hidden md:block" />
                    <ArrowDown className="w-4 h-4 md:hidden" />
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-mono font-bold whitespace-nowrap">
                    20 → 32 units (+12)
                  </span>
                </div>

                {/* Revised Spec */}
                <div className="flex-1 p-4 rounded-xl border-2 border-amber-300 bg-amber-50/40 space-y-2.5 relative">
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono font-semibold uppercase text-amber-800 block">
                      Addendum #04 (Revised)
                    </span>
                    <div className="text-right">
                      <span className="text-xs font-mono text-amber-800 font-semibold whitespace-nowrap">
                        $450 / unit
                      </span>
                    </div>
                  </div>
                  <div className="font-headline text-secondary-navy flex items-baseline gap-1.5">
                    <span className="text-2xl font-black text-amber-700">32</span>
                    <span className="text-sm font-bold">Premium Windows</span>
                  </div>
                  <p className="text-[11px] text-slate-600 font-mono bg-white p-2.5 rounded border border-amber-200 leading-relaxed">
                    &ldquo;Section 08 51 13: Contractor shall furnish 32 premium insulated triple-glazed units. Milestone shifted.&rdquo;
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Soft Gradient Section Divider */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-border to-transparent" />

      {/* =========================================================================
          SECTION 4: 4-STAGE INVESTIGATION WORKFLOW
      ========================================================================= */}
      <section
        ref={pipelineRef}
        className="py-14 lg:py-20 bg-secondary-navy text-white relative overflow-hidden"
      >
        {/* Subtle dot pattern (~5% opacity) */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.055) 1px, transparent 1px)',
            backgroundSize: '24px 24px'
          }}
        />

        {/* Soft blue radial glow behind cards */}
        <div
          aria-hidden="true"
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[56rem] h-[24rem] rounded-full bg-blue-600/15 blur-3xl pointer-events-none"
        />

        {/* Gentle top & bottom edge gradient fades for smooth section transitions */}
        <div
          aria-hidden="true"
          className="absolute top-0 inset-x-0 h-8 bg-gradient-to-b from-slate-950/35 to-transparent pointer-events-none"
        />
        <div
          aria-hidden="true"
          className="absolute bottom-0 inset-x-0 h-8 bg-gradient-to-t from-slate-950/35 to-transparent pointer-events-none"
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <div className="inline-flex items-center px-3 py-1 rounded-full border border-white/10 bg-white/5 text-blue-300 text-xs font-semibold mb-3 font-mono">
              ENGINEERING INTEGRITY PIPELINE
            </div>
            <h2 className="font-headline text-3xl sm:text-4xl font-extrabold text-white tracking-[-0.015em] leading-[1.1] mb-3.5">
              How ScopeSentry Works
            </h2>
            <p className="text-base text-slate-300">
              A deterministic 4-stage LangGraph execution engine designed to eliminate hallucination and produce auditable reports.
            </p>
          </div>

          {/* Pipeline Container with Desktop Horizontal & Mobile/Tablet Vertical Connectors */}
          <div className="relative pl-8 lg:pl-0">
            {/* Desktop Horizontal Connector Line + Traveling Dot + 4 Nodes */}
            <div
              aria-hidden="true"
              className="hidden lg:block absolute top-1/2 -translate-y-1/2 left-[12.5%] right-[12.5%] h-[2px] bg-gradient-to-r from-blue-500/45 via-indigo-400/55 to-purple-500/45 z-0"
            >
              <span className="pipeline-dot absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-blue-400 shadow-[0_0_12px_3px_rgba(96,165,250,0.9)]" />
              <span className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-blue-400 ring-4 ring-blue-400/20" />
              <span className="absolute left-1/3 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-amber-400 ring-4 ring-amber-400/20" />
              <span className="absolute left-2/3 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-4 ring-emerald-400/20" />
              <span className="absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-purple-400 ring-4 ring-purple-400/20" />
            </div>

            {/* Mobile & Tablet Vertical Connector Line */}
            <div
              aria-hidden="true"
              className="lg:hidden absolute left-3 top-8 bottom-8 w-[2px] bg-gradient-to-b from-blue-500/50 via-emerald-400/50 to-purple-500/50"
            />

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-stretch relative z-10">
              {PIPELINE_STEPS.map((step, idx) => {
                const IconComponent = step.Icon;
                return (
                  <div key={step.num} className="relative flex">
                    {/* Mobile & Tablet Left Node */}
                    <span
                      aria-hidden="true"
                      className={`lg:hidden absolute -left-[25px] top-8 w-3 h-3 rounded-full ring-4 ${step.nodeColor}`}
                    />

                    <div
                      onMouseMove={handleCardMouseMove}
                      style={{
                        transitionDelay: prefersReducedMotion ? '0ms' : `${idx * 100}ms`
                      }}
                      className={`pipeline-card group relative flex flex-col justify-between w-full h-full p-5 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 ${step.hoverShadow} transition-all duration-300 ease-out hover:-translate-y-1 overflow-hidden ${
                        pipelineVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
                      }`}
                    >
                      {/* Cursor Spotlight Radial Highlight */}
                      <div
                        aria-hidden="true"
                        className="pipeline-spotlight pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                        style={{
                          background: `radial-gradient(280px circle at var(--mx, 50%) var(--my, 50%), ${step.spotlightColor}, transparent 70%)`
                        }}
                      />

                      <div className="relative z-10">
                        {/* Top Row: Outlined Faded Watermark Number + Gradient Icon Tile */}
                        <div className="flex items-start justify-between mb-4">
                          <span
                            aria-hidden="true"
                            className="text-5xl font-mono font-black text-transparent select-none leading-none"
                            style={{ WebkitTextStroke: '1px rgba(255, 255, 255, 0.18)' }}
                          >
                            {step.num}
                          </span>
                          <div
                            className={`w-12 h-12 rounded-xl bg-gradient-to-br ${step.tileGradient} text-white flex items-center justify-center ring-1 ring-white/20 shadow-inner shrink-0`}
                          >
                            <IconComponent className="w-5 h-5 stroke-[2]" />
                          </div>
                        </div>

                        <h3 className="font-headline text-white font-semibold text-lg tracking-tight mb-2">
                          {step.title}
                        </h3>
                        <p className="text-sm text-slate-300 leading-relaxed">
                          {step.description}
                        </p>
                      </div>

                      {/* Feature Tag */}
                      <div className="relative z-10 mt-5 pt-1">
                        <span className="inline-flex items-center gap-2 text-xs font-mono px-2.5 py-1 rounded-full border border-white/10 bg-white/5 text-slate-300">
                          <span aria-hidden="true" className={`w-1.5 h-1.5 rounded-full ${step.dotColor}`} />
                          <span>{step.tag}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <p className="text-center text-slate-400 text-sm font-mono mt-10">
            Deterministic by design. Every finding traceable to a source clause.
          </p>
        </div>
      </section>

      {/* Soft Gradient Section Divider */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-border to-transparent" />

      {/* =========================================================================
          SECTION 5: CANONICAL DEMO SCENARIOS SHOWCASE
      ========================================================================= */}
      <section className="py-12 lg:py-16 bg-slate-50/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 gap-4">
            <div>
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-50 text-primary-container text-xs font-semibold mb-2 font-mono">
                TEST SCENARIOS
              </div>
              <h2 className="font-headline text-3xl font-extrabold text-secondary-navy tracking-[-0.015em] leading-[1.1]">
                Explore Pre-Seeded Construction Projects
              </h2>
            </div>
            <Link
              to="/demo"
              className="inline-flex items-center gap-2 text-sm font-semibold text-primary-container hover:underline focus-ring rounded"
            >
              <span>Open Interactive Sandbox</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Scenario 1 */}
            <div className="bg-surface rounded-2xl border border-border p-6 shadow-card hover:shadow-lg transition-all flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                  <Building2 className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-mono font-bold uppercase text-primary-container bg-blue-50 px-2 py-0.5 rounded">
                  Commercial High-Rise
                </span>
                <h3 className="font-headline font-bold text-lg text-secondary-navy mt-2 mb-2">
                  Commercial Plaza Tower
                </h3>
                <p className="text-xs text-slate-600 mb-3 leading-relaxed">
                  32-story downtown office tower. Tests glazing specification changes (+12 window units) and unapproved OAC meeting minutes.
                </p>
                {/* Mini Result Preview Strip */}
                <div className="flex flex-wrap gap-1.5 mb-4 p-2.5 rounded-xl bg-slate-50 border border-border">
                  <span className="px-2 py-0.5 rounded-md bg-white border border-border text-[10px] font-mono font-semibold text-secondary-navy">
                    32 stories
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-blue-50 border border-blue-200 text-[10px] font-mono font-semibold text-blue-700">
                    +12 units
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-[10px] font-mono font-semibold text-amber-800">
                    Unapproved minutes
                  </span>
                </div>
              </div>
              <Link
                to="/demo"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-container hover:text-blue-700 focus-ring rounded"
              >
                <span>Run Commercial Investigation</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Scenario 2 */}
            <div className="bg-surface rounded-2xl border border-border p-6 shadow-card hover:shadow-lg transition-all flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
                  <Home className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-mono font-bold uppercase text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                  Residential Development
                </span>
                <h3 className="font-headline font-bold text-lg text-secondary-navy mt-2 mb-2">
                  Riverside Residential Estates
                </h3>
                <p className="text-xs text-slate-600 mb-3 leading-relaxed">
                  48-unit master planned townhome community. Flags framing material substitution from Douglas Fir to cold-formed steel ($120k cost delta).
                </p>
                {/* Mini Result Preview Strip */}
                <div className="flex flex-wrap gap-1.5 mb-4 p-2.5 rounded-xl bg-slate-50 border border-border">
                  <span className="px-2 py-0.5 rounded-md bg-white border border-border text-[10px] font-mono font-semibold text-secondary-navy">
                    48 units
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-[10px] font-mono font-semibold text-amber-800">
                    $120k delta
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-blue-50 border border-blue-200 text-[10px] font-mono font-semibold text-blue-700">
                    Material swap
                  </span>
                </div>
              </div>
              <Link
                to="/demo"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-container hover:text-blue-700 focus-ring rounded"
              >
                <span>Run Residential Investigation</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Scenario 3 */}
            <div className="bg-surface rounded-2xl border border-border p-6 shadow-card hover:shadow-lg transition-all flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-4">
                  <Briefcase className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-mono font-bold uppercase text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
                  Office Renovation
                </span>
                <h3 className="font-headline font-bold text-lg text-secondary-navy mt-2 mb-2">
                  Metro Tech Hub Renovation
                </h3>
                <p className="text-xs text-slate-600 mb-3 leading-relaxed">
                  Corporate headquarters tenant improvement. Detects emergency generator scope addition and acoustic wall panel removal.
                </p>
                {/* Mini Result Preview Strip */}
                <div className="flex flex-wrap gap-1.5 mb-4 p-2.5 rounded-xl bg-slate-50 border border-border">
                  <span className="px-2 py-0.5 rounded-md bg-purple-50 border border-purple-200 text-[10px] font-mono font-semibold text-purple-700">
                    Generator added
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-rose-50 border border-rose-200 text-[10px] font-mono font-semibold text-rose-700">
                    Panels removed
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-white border border-border text-[10px] font-mono font-semibold text-secondary-navy">
                    HQ fit-out
                  </span>
                </div>
              </div>
              <Link
                to="/demo"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-container hover:text-blue-700 focus-ring rounded"
              >
                <span>Run Office Renovation Diff</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 6: CLOSING HIGH-IMPACT ENTERPRISE CTA
      ========================================================================= */}
      <section className="py-14 lg:py-20 bg-secondary-navy text-white relative overflow-hidden">
        {/* Subtle dot/grid pattern + soft blue radial glow tying back to hero */}
        <div
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(rgba(148, 163, 184, 0.35) 1px, transparent 1px)',
            backgroundSize: '24px 24px'
          }}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(circle at 50% 35%, rgba(37, 99, 235, 0.28) 0%, transparent 65%)'
          }}
        />
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 mb-5">
            <Lock className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-xs text-slate-300 font-medium">
              Private Storage &bull; Scoped Multi-Tenant Isolation
            </span>
          </div>

          <h2 className="font-headline text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-[-0.015em] leading-[1.1] mb-5">
            Stop Scope Creep Before It Becomes A Dispute.
          </h2>

          <p className="text-base sm:text-lg text-slate-300 mb-8 max-w-2xl mx-auto leading-relaxed">
            Join construction project managers, estimators, and dispute resolution teams who rely on ScopeSentry for verifiable change verification.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/demo"
              className="w-full sm:w-auto h-12 px-8 rounded-xl bg-blue-600 text-white font-semibold flex items-center justify-center gap-2 hover:bg-blue-500 shadow-lg shadow-blue-600/30 transition-all active:scale-[0.98] focus-ring"
            >
              <span>Test The Interactive Demo</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/register"
              className="w-full sm:w-auto h-12 px-8 rounded-xl border border-white/30 text-white font-semibold flex items-center justify-center gap-2 hover:bg-white/10 transition-all active:scale-[0.98] focus-ring"
            >
              <span>Register Free Account</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
