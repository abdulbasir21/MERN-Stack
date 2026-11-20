'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';

export interface AppNavbarProps {
  activeHref?: string;
  badgeText?: string;
  rightSlot?: React.ReactNode;
}

const CANDIDATE_NAV_LINKS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/interviews/setup', label: 'Mock Interviews' },
  { href: '/history', label: 'History & Trends' },
  { href: '/documents', label: 'Documents & CVs' },
  { href: '/settings', label: 'Settings' },
];

export function AppNavbar({ activeHref, badgeText, rightSlot }: AppNavbarProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const currentHref = activeHref ?? pathname;

  const isLinkActive = (href: string) =>
    currentHref === href || (href !== '/dashboard' && currentHref.startsWith(`${href}/`));

  const defaultRightAction =
    currentHref !== '/interviews/setup' ? (
      <Link
        href="/interviews/setup"
        className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-lg shadow-cyan-600/20 transition flex items-center justify-center gap-2 whitespace-nowrap"
      >
        <span>Start Practice</span>
        <span className="text-cyan-200">→</span>
      </Link>
    ) : (
      <Link
        href="/dashboard"
        className="px-3.5 py-2 rounded-xl bg-[#1E293B] hover:bg-[#283548] text-[#F8FAFC] text-xs font-semibold border border-[#334155] transition whitespace-nowrap"
      >
        ← Dashboard
      </Link>
    );

  return (
    <header className="border-b border-[#1E293B] bg-[#0B0F17]/90 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
        <div className="flex items-center gap-4 lg:gap-6 min-w-0">
          <Link href="/dashboard" className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center font-bold text-white shadow-md shadow-cyan-500/20 text-xs">
              IP
            </div>
            <span className="font-semibold text-sm tracking-tight text-[#F8FAFC]">
              InterviewPilot
            </span>
          </Link>

          {badgeText && (
            <>
              <span className="hidden sm:inline-block h-4 w-[1px] bg-[#1E293B]" />
              <span className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-full bg-[#1E293B] border border-[#334155] text-[11px] font-medium text-cyan-300 truncate max-w-[180px] lg:max-w-[240px]">
                {badgeText}
              </span>
            </>
          )}

          <nav
            className="hidden md:flex items-center gap-1 lg:gap-2 text-xs font-medium"
            aria-label="Candidate navigation"
          >
            {CANDIDATE_NAV_LINKS.map((link) => {
              const active = isLinkActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
                    active
                      ? 'bg-[#1E293B] text-cyan-400 font-semibold'
                      : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1E293B]/60'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="hidden md:flex items-center gap-3 shrink-0">
          {rightSlot ?? defaultRightAction}
        </div>

        <div className="flex md:hidden items-center gap-2 shrink-0">
          {badgeText && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#1E293B] text-[10px] font-medium text-cyan-300 truncate max-w-[110px]">
              {badgeText}
            </span>
          )}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
            className="p-2 rounded-lg border border-[#1E293B] bg-[#111827] text-[#F8FAFC] hover:bg-[#1E293B] transition"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#1E293B] bg-[#0B0F17] px-4 pt-3 pb-4 space-y-1.5 shadow-2xl">
          <nav className="space-y-1" aria-label="Mobile candidate navigation">
            {CANDIDATE_NAV_LINKS.map((link) => {
              const active = isLinkActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${
                    active
                      ? 'bg-[#1E293B] text-cyan-400 font-semibold border border-cyan-500/30'
                      : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#111827]'
                  }`}
                >
                  <span>{link.label}</span>
                  {active && (
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="pt-2 border-t border-[#1E293B] flex flex-col gap-2">
            {rightSlot ?? defaultRightAction}
          </div>
        </div>
      )}
    </header>
  );
}
