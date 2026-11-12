import { Link } from 'react-router-dom';
import {
  ArrowRight,
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
  Calendar
} from 'lucide-react';

export default function HomePage() {
  return (
    <div className="flex flex-col bg-background text-on-surface">
      {/* =========================================================================
          SECTION 1: HERO WITH CINEMATIC CONSTRUCTION PHOTOGRAPHY & GLASS CARDS
      ========================================================================= */}
      <section className="relative min-h-[820px] lg:min-h-[880px] w-full flex items-center pt-24 pb-20 overflow-hidden">
        {/* Full-width realistic construction photograph background */}
        <img
          src="/images/hero-construction.jpg"
          alt="Modern commercial high-rise skyscraper under active construction at dusk"
          className="absolute inset-0 w-full h-full object-cover object-center z-0"
        />

        {/* Cinematic dark overlay to make text and glass cards pop */}
        <div className="absolute inset-0 bg-slate-950/45 backdrop-brightness-95 pointer-events-none z-10" />

        {/* Soft bottom fade transitioning smoothly into the white trust bar */}
        <div className="bg-gradient-to-t from-background via-background/40 to-transparent h-24 w-full absolute bottom-0 left-0 z-20 pointer-events-none" />

        {/* Hero Grid Container */}
        <div className="relative z-30 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* Left Column: Frosted Glass Text Container */}
            <div className="lg:col-span-6 xl:col-span-7 text-left">
              <div className="bg-slate-900/65 backdrop-blur-xl rounded-[28px] border border-white/20 p-8 sm:p-10 shadow-2xl max-w-2xl">
                {/* Pill with amber pulse */}
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 mb-6">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                  <span className="text-xs text-white font-medium tracking-wide">
                    AI Construction Change Detective
                  </span>
                </div>

                {/* Primary High-Impact Headline */}
                <h1 className="font-headline text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-[1.12] drop-shadow-sm mb-5">
                  Every project change has a cost.{' '}
                  <span className="text-blue-400">Make sure you see it.</span>
                </h1>

                {/* Subtitle */}
                <p className="text-base sm:text-lg text-slate-200 mb-8 leading-relaxed font-normal">
                  Compare original contract specifications with revised submittals. ScopeSentry detects every scope variance,
                  verifies citations to the exact clause, and calculates financial impacts in exact decimal math before you sign off.
                </p>

                {/* Action CTAs */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 mb-8">
                  <Link
                    to="/demo"
                    className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-lg shadow-blue-600/30 transition-all hover:translate-y-[-1px] active:scale-[0.98]"
                  >
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>Try Interactive Demo</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>

                  <Link
                    to="/register"
                    className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl border border-white/30 hover:border-white hover:bg-white/10 text-white font-semibold backdrop-blur-sm transition-all active:scale-[0.98]"
                  >
                    <span>Create Free Account</span>
                  </Link>
                </div>

                {/* Proof Checkmarks */}
                <div className="pt-6 border-t border-white/15 grid grid-cols-1 sm:grid-cols-3 gap-3">
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

            {/* Right Column: Floating Interactive Glass Telemetry Cards */}
            <div className="lg:col-span-6 xl:col-span-5 relative flex flex-col gap-4 items-center lg:items-end justify-center">
              <div className="w-full max-w-md space-y-4">
                {/* Glass Card 1: Investigation Summary with Chart */}
                <div className="bg-white/95 backdrop-blur-xl rounded-2xl border border-white/80 p-5 shadow-2xl">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                        <FileSearch className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-headline text-sm font-bold text-secondary-navy leading-tight">
                          Investigation Summary
                        </h3>
                        <p className="text-[11px] text-secondary">AIA Addendum #04 vs Base Specification</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-bold font-mono">
                      12 changes found
                    </span>
                  </div>

                  <div className="grid grid-cols-12 gap-4 items-center">
                    {/* SVG Donut Chart */}
                    <div className="col-span-5 flex flex-col items-center justify-center relative">
                      <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 36 36">
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
                        <span className="font-headline text-lg font-black text-secondary-navy leading-none">12</span>
                        <span className="text-[9px] uppercase tracking-wider text-secondary font-semibold">Total</span>
                      </div>
                    </div>

                    {/* Breakdown legend */}
                    <div className="col-span-7 space-y-2 text-xs">
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

                {/* Glass Card 2: Estimated Cost Impact Badge */}
                <div className="bg-white/95 backdrop-blur-xl rounded-2xl border border-white/80 p-4 shadow-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 border border-amber-200/60 flex items-center justify-center shrink-0">
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
                      <div className="font-headline text-2xl font-black text-amber-600 tracking-tight">
                        +$54,200.00
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 font-mono block">CSI Div 08</span>
                    <span className="text-xs font-semibold text-emerald-600 font-mono">+12 Units</span>
                  </div>
                </div>

                {/* Micro Cards Row */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/90 backdrop-blur-md rounded-xl border border-white/70 p-3 shadow-md flex items-center gap-2.5">
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

                  <div className="bg-white/90 backdrop-blur-md rounded-xl border border-white/70 p-3 shadow-md flex items-center gap-2.5">
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
                <div className="bg-white/95 backdrop-blur-md rounded-xl border border-rose-200/80 p-3 shadow-md flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                      <AlertTriangle className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-semibold text-rose-900">
                      3 findings pending PM signature proof
                    </span>
                  </div>
                  <Link to="/demo" className="text-xs font-semibold text-blue-600 hover:underline">
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
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200/60 text-primary-container flex items-center justify-center shrink-0">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <div className="font-headline text-sm font-bold text-secondary-navy">4-Stage Pipeline</div>
                <div className="text-xs text-secondary">LangGraph automated investigation</div>
              </div>
            </div>

            <div className="flex items-center gap-3.5 px-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200/60 text-emerald-600 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="font-headline text-sm font-bold text-secondary-navy">100% Grounded Citations</div>
                <div className="text-xs text-secondary">Verbatim chunk snippet verification</div>
              </div>
            </div>

            <div className="flex items-center gap-3.5 px-4">
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200/60 text-amber-600 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <div className="font-headline text-sm font-bold text-secondary-navy">PDF & DOCX Submittals</div>
                <div className="text-xs text-secondary">Magic-byte validated extraction</div>
              </div>
            </div>

            <div className="flex items-center gap-3.5 px-4">
              <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-200/60 text-purple-600 flex items-center justify-center shrink-0">
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
      <section className="py-20 bg-surface-subtle border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold mb-3">
              THE REALITY OF CONSTRUCTION CONTRACTS
            </div>
            <h2 className="font-headline text-3xl sm:text-4xl font-extrabold text-secondary-navy tracking-tight mb-4">
              One subtle addendum clause. Millions in dispute risk.
            </h2>
            <p className="text-base text-secondary">
              A single substituted line item in Section 08 51 13 can wipe out a general contractor&apos;s margin. ScopeSentry
              mathematically flags the variance before signing.
            </p>
          </div>

          {/* Split Layout: Blueprint Image + Interactive Document Diff Card */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left: Real-world Blueprints & Spec Review Image */}
            <div className="lg:col-span-5 relative rounded-2xl overflow-hidden shadow-card border border-border group">
              <img
                src="/images/blueprints-spec.jpg"
                alt="Architect and engineer blueprints workspace with redline document markups"
                className="w-full h-80 sm:h-96 object-cover object-center transition-transform duration-500 group-hover:scale-105"
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
            <div className="lg:col-span-7 bg-surface rounded-2xl border border-border p-6 sm:p-8 shadow-card">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-border gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold font-mono uppercase tracking-wider text-secondary">
                    Spec Diff Comparison
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-blue-50 text-primary-container text-xs font-semibold font-mono">
                    CSI 08 51 13 — Glazing
                  </span>
                </div>
                <span className="text-xs font-mono text-amber-600 font-bold bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200">
                  Delta: +12 units (+$5,400.00)
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                {/* Original Spec */}
                <div className="p-4 rounded-xl border border-border bg-slate-50/70 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-semibold uppercase text-secondary">
                      Baseline Spec (Sheet A-402)
                    </span>
                    <span className="text-xs font-mono text-slate-600 font-bold">$450 / unit</span>
                  </div>
                  <div className="font-headline text-base font-bold text-secondary-navy">
                    20 Standard Windows
                  </div>
                  <p className="text-[11px] text-secondary font-mono bg-white p-2.5 rounded border border-border">
                    &ldquo;Section 08 51 13: Contractor shall supply 20 standard thermally broken aluminum window units.&rdquo;
                  </p>
                </div>

                {/* Revised Spec */}
                <div className="p-4 rounded-xl border-2 border-amber-300 bg-amber-50/40 space-y-2 relative">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-semibold uppercase text-amber-800">
                      Addendum #04 (Revised)
                    </span>
                    <span className="text-xs font-mono text-amber-700 font-bold">$450 / unit</span>
                  </div>
                  <div className="font-headline text-base font-bold text-secondary-navy">
                    32 Premium Windows
                  </div>
                  <p className="text-[11px] text-secondary font-mono bg-white p-2.5 rounded border border-amber-200">
                    &ldquo;Section 08 51 13: Contractor shall furnish 32 premium insulated triple-glazed units. Milestone shifted.&rdquo;
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 4: 4-STAGE INVESTIGATION WORKFLOW
      ========================================================================= */}
      <section className="py-20 bg-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-50 text-primary-container text-xs font-semibold mb-3 font-mono">
              ENGINEERING INTEGRITY PIPELINE
            </div>
            <h2 className="font-headline text-3xl sm:text-4xl font-extrabold text-secondary-navy tracking-tight mb-4">
              How ScopeSentry Works
            </h2>
            <p className="text-base text-secondary">
              A deterministic 4-stage LangGraph execution engine designed to eliminate hallucination and produce auditable reports.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Step 1 */}
            <div className="p-6 rounded-2xl border border-border bg-surface shadow-card hover:border-primary-container/40 transition-all">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-primary-container flex items-center justify-center font-bold text-sm mb-4 font-mono">
                01
              </div>
              <h3 className="font-headline font-bold text-base text-secondary-navy mb-2">
                Ingest &amp; Clause Index
              </h3>
              <p className="text-xs text-secondary leading-relaxed">
                PDF and DOCX submittals are parsed, verified with magic bytes, and indexed into clause-aware chunks preserving CSI division numbers.
              </p>
            </div>

            {/* Step 2 */}
            <div className="p-6 rounded-2xl border border-border bg-surface shadow-card hover:border-primary-container/40 transition-all">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-primary-container flex items-center justify-center font-bold text-sm mb-4 font-mono">
                02
              </div>
              <h3 className="font-headline font-bold text-base text-secondary-navy mb-2">
                Deterministic Matching
              </h3>
              <p className="text-xs text-secondary leading-relaxed">
                Items, clause numbers, and dates are compared deterministically. LLMs are prohibited from performing mathematical calculations.
              </p>
            </div>

            {/* Step 3 */}
            <div className="p-6 rounded-2xl border border-border bg-surface shadow-card hover:border-primary-container/40 transition-all">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-primary-container flex items-center justify-center font-bold text-sm mb-4 font-mono">
                03
              </div>
              <h3 className="font-headline font-bold text-base text-secondary-navy mb-2">
                Pure Decimal Math
              </h3>
              <p className="text-xs text-secondary leading-relaxed">
                Financial deltas are calculated in pure decimal code. Missing unit rates are clearly flagged as &ldquo;Cannot estimate&rdquo; per BR-I7.
              </p>
            </div>

            {/* Step 4 */}
            <div className="p-6 rounded-2xl border border-border bg-surface shadow-card hover:border-primary-container/40 transition-all">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-primary-container flex items-center justify-center font-bold text-sm mb-4 font-mono">
                04
              </div>
              <h3 className="font-headline font-bold text-base text-secondary-navy mb-2">
                12-Section PDF Audit
              </h3>
              <p className="text-xs text-secondary leading-relaxed">
                Generates boardroom-ready 12-section PDF reports with human review audit stamps, signed URLs, and statutory disclaimers.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 5: CANONICAL DEMO SCENARIOS SHOWCASE
      ========================================================================= */}
      <section className="py-20 bg-surface-subtle border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-12 gap-4">
            <div>
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-50 text-primary-container text-xs font-semibold mb-2 font-mono">
                TEST SCENARIOS
              </div>
              <h2 className="font-headline text-3xl font-extrabold text-secondary-navy tracking-tight">
                Explore Pre-Seeded Construction Projects
              </h2>
            </div>
            <Link
              to="/demo"
              className="inline-flex items-center gap-2 text-sm font-semibold text-primary-container hover:underline"
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
                <p className="text-xs text-secondary mb-4 leading-relaxed">
                  32-story downtown office tower. Tests glazing specification changes (+12 window units) and unapproved OAC meeting minutes.
                </p>
              </div>
              <Link
                to="/demo"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-container hover:text-blue-700"
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
                <p className="text-xs text-secondary mb-4 leading-relaxed">
                  48-unit master planned townhome community. Flags framing material substitution from Douglas Fir to cold-formed steel ($120k cost delta).
                </p>
              </div>
              <Link
                to="/demo"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-container hover:text-blue-700"
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
                <p className="text-xs text-secondary mb-4 leading-relaxed">
                  Corporate headquarters tenant improvement. Detects emergency generator scope addition and acoustic wall panel removal.
                </p>
              </div>
              <Link
                to="/demo"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-container hover:text-blue-700"
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
      <section className="py-20 bg-secondary-navy text-white relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 mb-6">
            <Lock className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-xs text-slate-300 font-medium">
              Private Storage &bull; Scoped Multi-Tenant Isolation
            </span>
          </div>

          <h2 className="font-headline text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight mb-6">
            Stop Scope Creep Before It Becomes A Dispute.
          </h2>

          <p className="text-base sm:text-lg text-slate-300 mb-10 max-w-2xl mx-auto leading-relaxed">
            Join construction project managers, estimators, and dispute resolution teams who rely on ScopeSentry for verifiable change verification.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/demo"
              className="w-full sm:w-auto h-12 px-8 rounded-xl bg-blue-600 text-white font-semibold flex items-center justify-center gap-2 hover:bg-blue-500 shadow-lg shadow-blue-600/30 transition-all active:scale-[0.98]"
            >
              <span>Test The Interactive Demo</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/register"
              className="w-full sm:w-auto h-12 px-8 rounded-xl border border-white/30 text-white font-semibold flex items-center justify-center gap-2 hover:bg-white/10 transition-all active:scale-[0.98]"
            >
              <span>Register Free Account</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
