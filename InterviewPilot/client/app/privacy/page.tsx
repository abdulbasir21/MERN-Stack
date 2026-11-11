import React from 'react';
import Link from 'next/link';

export const metadata = {
  title: 'Privacy & Data Retention Policy — InterviewPilot',
  description: 'InterviewPilot commitments to candidate privacy, zero audio storage, and transparent data retention.',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#0B0F17] text-[#F8FAFC] antialiased">
      {/* Header */}
      <header className="h-16 border-b border-[#1E293B] bg-[#111827]/80 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-20">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center font-bold text-white shadow-md shadow-cyan-500/20 text-xs">
            IP
          </div>
          <span className="font-semibold text-sm tracking-tight text-[#F8FAFC]">InterviewPilot</span>
        </Link>

        <div className="flex items-center gap-4 text-xs font-medium">
          <Link href="/" className="text-[#94A3B8] hover:text-[#F8FAFC] transition">
            Home
          </Link>
          <Link href="/login" className="text-[#94A3B8] hover:text-[#F8FAFC] transition">
            Sign In
          </Link>
          <Link
            href="/register"
            className="px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold transition"
          >
            Get Started
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto p-6 md:p-12 space-y-10">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-cyan-950/60 border border-cyan-800/50 text-[11px] font-mono text-cyan-400 mb-3">
            <span>●</span>
            <span>TRANSPARENCY &amp; PRIVACY GUARANTEE</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-[#F8FAFC]">
            Privacy &amp; Data Retention Policy
          </h1>
          <p className="text-sm text-[#94A3B8] mt-2">
            Last updated: November 2026. Explicit commitments governing candidate audio, documents, and transcripts.
          </p>
        </div>

        <div className="space-y-8 text-xs text-[#CBD5E1] leading-relaxed">
          {/* Audio Storage Rule */}
          <section className="p-6 rounded-2xl bg-[#111827] border border-[#1E293B] space-y-2">
            <h2 className="text-sm font-semibold text-[#F8FAFC] flex items-center gap-2">
              <span className="text-emerald-400">✓</span> 1. Audio is Never Stored (Zero Audio Storage)
            </h2>
            <p>
              Your spoken voice and microphone input are processed strictly transiently in memory for immediate speech-to-text transcription. <strong>No audio files, voice recordings, raw microphone streams, or audio buffers are ever written to disk, databases, or cloud storage.</strong> Once transcribed, in-memory buffers are instantly purged.
            </p>
          </section>

          {/* Transcripts and Reports */}
          <section className="p-6 rounded-2xl bg-[#111827] border border-[#1E293B] space-y-2">
            <h2 className="text-sm font-semibold text-[#F8FAFC] flex items-center gap-2">
              <span className="text-cyan-400">✓</span> 2. Transcripts and Performance Reports
            </h2>
            <p>
              Written transcripts and generated STAR evaluation reports are stored privately and securely associated with your user account. They are retained until you explicitly delete the interview, delete your account via our 3-step deletion process (USR-3), or request data erasure.
            </p>
          </section>

          {/* Documents & RAG Grounding */}
          <section className="p-6 rounded-2xl bg-[#111827] border border-[#1E293B] space-y-2">
            <h2 className="text-sm font-semibold text-[#F8FAFC] flex items-center gap-2">
              <span className="text-blue-400">✓</span> 3. Resumes, CVs, and Job Descriptions
            </h2>
            <p>
              Uploaded resumes and pasted job descriptions are stored in private, access-controlled cloud storage. Text chunks and vector embeddings are strictly partitioned by your unique candidate ID (userId) and specific interview configuration. No cross-candidate document leakage is possible. Documents are kept until you delete them.
            </p>
          </section>

          {/* Support and Audited Admin Access */}
          <section className="p-6 rounded-2xl bg-[#111827] border border-[#1E293B] space-y-2">
            <h2 className="text-sm font-semibold text-[#F8FAFC] flex items-center gap-2">
              <span className="text-amber-400">✓</span> 4. Audited Administrator Access
            </h2>
            <p>
              An authorized platform administrator may access documents or interview transcripts solely for technical debugging, user support, or security investigations. <strong>Every single administrative view, download, preview, or modification is cryptographically recorded in an immutable audit log row within the same atomic transaction.</strong> If the audit record fails to write, the action is immediately denied (fail closed).
            </p>
          </section>

          {/* Demo Data Retention (24-Hour Purge) */}
          <section className="p-6 rounded-2xl bg-[#111827] border border-[#1E293B] space-y-2">
            <h2 className="text-sm font-semibold text-[#F8FAFC] flex items-center gap-2">
              <span className="text-rose-400">✓</span> 5. Demo Sessions (24-Hour Automatic Purge)
            </h2>
            <p>
              Ephemeral demo sessions created through &quot;Try Instant Demo&quot; are isolated temporary accounts. All demo sessions, temporary records, and practice attempts are automatically purged after 24 hours. IP addresses are hashed using HMAC SHA-256 and never stored in plain text.
            </p>
          </section>
        </div>

        <div className="pt-6 border-t border-[#1E293B] flex items-center justify-between text-xs text-[#64748B]">
          <span>InterviewPilot Platform Security &amp; Compliance</span>
          <Link href="/" className="text-cyan-400 hover:text-cyan-300">
            Return to Homepage →
          </Link>
        </div>
      </main>
    </div>
  );
}
