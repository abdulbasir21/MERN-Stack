import { Link } from 'react-router-dom';
import { ArrowRight, FileSearch, ShieldCheck, Cpu } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="py-16 md:py-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Value tag */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-primary-fixed text-primary tracking-wide mb-6">
          <ShieldCheck className="w-4 h-4 text-primary" />
          <span>Construction Change Verification Engine</span>
        </div>

        {/* Hero headline */}
        <h1 className="font-headline text-4xl sm:text-5xl md:text-6xl font-extrabold text-secondary-navy tracking-tight leading-[1.15] mb-6">
          Every project change has a cost. <br className="hidden sm:inline" />
          <span className="text-primary-container">Make sure you see it.</span>
        </h1>

        <p className="max-w-2xl mx-auto text-lg text-secondary mb-10 leading-relaxed">
          Automated cross-document change investigation between original specifications and revised submittals.
          Evidence-backed delta detection, deterministic financial estimates, and human-in-the-loop audit verification.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            to="/register"
            className="w-full sm:w-auto h-12 px-6 rounded-lg bg-primary-container text-white font-semibold flex items-center justify-center gap-2 hover:bg-primary-hover shadow-sm transition-all"
          >
            <span>Start Free Verification</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/demo"
            className="w-full sm:w-auto h-12 px-6 rounded-lg bg-surface border border-border text-secondary-navy font-semibold flex items-center justify-center gap-2 hover:bg-surface-subtle transition-all"
          >
            <Cpu className="w-4 h-4 text-primary-container" />
            <span>Explore Live Demo</span>
          </Link>
        </div>

        {/* Feature Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20 text-left">
          <div className="p-6 rounded-xl bg-surface border border-border shadow-card">
            <div className="w-10 h-10 rounded-lg bg-primary-container/10 flex items-center justify-center text-primary-container mb-4">
              <FileSearch className="w-5 h-5" />
            </div>
            <h3 className="font-headline font-bold text-lg text-secondary-navy mb-2">Deterministic Diffing</h3>
            <p className="text-sm text-secondary leading-relaxed">
              Exact quantities, clause numbers, and unit prices are compared mathematically—never by fuzzy LLM guessing.
            </p>
          </div>

          <div className="p-6 rounded-xl bg-surface border border-border shadow-card">
            <div className="w-10 h-10 rounded-lg bg-confirmed-bg border border-confirmed-border flex items-center justify-center text-confirmed-text mb-4">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-headline font-bold text-lg text-secondary-navy mb-2">100% Verifiable Citations</h3>
            <p className="text-sm text-secondary leading-relaxed">
              Every finding quotes the exact snippet, page, and chunk from your uploaded PDF or DOCX contract documents.
            </p>
          </div>

          <div className="p-6 rounded-xl bg-surface border border-border shadow-card">
            <div className="w-10 h-10 rounded-lg bg-ai-bg border border-ai-border flex items-center justify-center text-ai-text mb-4">
              <Cpu className="w-5 h-5" />
            </div>
            <h3 className="font-headline font-bold text-lg text-secondary-navy mb-2">Human Review Audit</h3>
            <p className="text-sm text-secondary leading-relaxed">
              Every delta requires your explicit review. Append-only audit trails record every approval decision and price override.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
