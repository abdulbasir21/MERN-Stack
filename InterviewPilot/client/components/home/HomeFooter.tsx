'use client';

import React from 'react';
import Link from 'next/link';

export function HomeFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-[#1E293B] bg-[#080B11] py-12 md:py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-10">
          {/* Column 1: Brand */}
          <div className="space-y-3 sm:col-span-2 lg:col-span-1">
            <Link href="/" className="inline-flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center font-bold text-slate-950 text-xs">
                IP
              </div>
              <span className="font-semibold text-base tracking-tight text-[#F8FAFC]">
                InterviewPilot
              </span>
            </Link>
            <p className="text-sm text-[#CBD5E1] leading-relaxed">
              Voice-first AI mock interview rehearsal built for students, graduates, career switchers, and experienced engineers.
            </p>
            <p className="text-xs font-mono text-cyan-300">
              Zero voice recording or audio storage.
            </p>
          </div>

          {/* Column 2: Product */}
          <div className="space-y-3">
            <h2 className="text-xs font-mono uppercase tracking-wider text-[#94A3B8] font-semibold">
              Product
            </h2>
            <ul role="list" className="space-y-2.5 text-sm text-[#CBD5E1]">
              <li>
                <a href="#who-its-for" className="hover:text-cyan-300 transition-colors">
                  Who It&apos;s For
                </a>
              </li>
              <li>
                <a href="#how-it-works" className="hover:text-cyan-300 transition-colors">
                  How It Works
                </a>
              </li>
              <li>
                <a href="#features" className="hover:text-cyan-300 transition-colors">
                  What You Get
                </a>
              </li>
              <li>
                <a href="#types" className="hover:text-cyan-300 transition-colors">
                  Interview Tracks
                </a>
              </li>
              <li>
                <a href="#faq" className="hover:text-cyan-300 transition-colors">
                  FAQ
                </a>
              </li>
            </ul>
          </div>

          {/* Column 3: Account */}
          <div className="space-y-3">
            <h2 className="text-xs font-mono uppercase tracking-wider text-[#94A3B8] font-semibold">
              Account
            </h2>
            <ul role="list" className="space-y-2.5 text-sm text-[#CBD5E1]">
              <li>
                <Link href="/register" className="hover:text-cyan-300 transition-colors">
                  Create Free Account
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-cyan-300 transition-colors">
                  Sign In
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Legal */}
          <div className="space-y-3">
            <h2 className="text-xs font-mono uppercase tracking-wider text-[#94A3B8] font-semibold">
              Legal &amp; Trust
            </h2>
            <ul role="list" className="space-y-2.5 text-sm text-[#CBD5E1]">
              <li>
                <Link href="/privacy" className="hover:text-cyan-300 transition-colors">
                  Privacy &amp; Data Retention
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Copyright & Subtle Portal Link */}
        <div className="pt-8 border-t border-[#1E293B] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#94A3B8]">
          <p>© {currentYear} InterviewPilot. All rights reserved.</p>
          <div className="flex items-center gap-5">
            <Link href="/privacy" className="hover:text-[#F8FAFC] transition-colors">
              Privacy Policy
            </Link>
            <Link
              href="/dashboard"
              className="text-[#94A3B8]/80 hover:text-[#CBD5E1] transition-colors"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
