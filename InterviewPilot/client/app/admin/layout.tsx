'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { triggerEmergencyShutdownApi } from '@/lib/api';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [shuttingDown, setShuttingDown] = useState(false);
  const [shutdownConfirmed, setShutdownConfirmed] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const handleEmergencyShutdown = async () => {
    if (!window.confirm('EMERGENCY ACTION: Are you sure you want to immediately halt ALL AI operations across InterviewPilot?')) {
      return;
    }
    try {
      setShuttingDown(true);
      await triggerEmergencyShutdownApi();
      setShutdownConfirmed(true);
      setMessage('Emergency shutdown executed: AI operations disabled.');
    } catch (err: any) {
      setMessage(`Failed to execute shutdown: ${err?.message || 'Unknown error'}`);
    } finally {
      setShuttingDown(false);
    }
  };

  const navLinks = [
    { href: '/admin', label: 'Overview' },
    { href: '/admin/users', label: 'Users' },
    { href: '/admin/documents', label: 'Documents' },
    { href: '/admin/interviews', label: 'Interviews' },
    { href: '/admin/usage', label: 'AI Usage' },
    { href: '/admin/settings', label: 'Settings' },
    { href: '/admin/audit', label: 'Audit Log' },
  ];

  return (
    <div className="min-h-screen bg-[#0B0F17] text-[#F8FAFC] antialiased">
      {/* Top Admin Header */}
      <header className="border-b border-[#1E293B] bg-[#111827]/90 backdrop-blur-md sticky top-0 z-30">
        <div className="h-16 px-4 sm:px-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-4 lg:gap-6 min-w-0">
            <Link href="/admin" className="flex items-center gap-2 shrink-0">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-red-600 flex items-center justify-center font-bold text-white shadow-md shadow-red-500/20 text-xs">
                ADM
              </div>
              <span className="font-semibold text-sm tracking-tight text-[#F8FAFC] truncate">
                <span className="sm:hidden">Admin Control</span>
                <span className="hidden sm:inline">InterviewPilot Admin Control</span>
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-1 text-xs font-medium">
              {navLinks.map((link) => {
                const active = pathname === link.href;
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
            <Link
              href="/dashboard"
              className="text-xs text-[#94A3B8] hover:text-[#F8FAFC] px-3 py-1.5 rounded-lg border border-[#1E293B] transition whitespace-nowrap"
            >
              ← Candidate Portal
            </Link>

            {/* Emergency AI Shutdown Button (QTA-10) */}
            <button
              onClick={handleEmergencyShutdown}
              disabled={shuttingDown || shutdownConfirmed}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-md whitespace-nowrap ${
                shutdownConfirmed
                  ? 'bg-red-950/60 text-red-400 border border-red-800/60 cursor-not-allowed'
                  : 'bg-red-600 hover:bg-red-500 text-white shadow-red-600/30'
              }`}
            >
              <span>⚠</span>
              <span>{shutdownConfirmed ? 'AI SHUTDOWN ACTIVE' : shuttingDown ? 'Halting...' : 'Emergency AI Shutdown'}</span>
            </button>
          </div>

          <div className="flex md:hidden items-center gap-2 shrink-0">
            <button
              onClick={handleEmergencyShutdown}
              disabled={shuttingDown || shutdownConfirmed}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition flex items-center gap-1 shadow-md ${
                shutdownConfirmed
                  ? 'bg-red-950/60 text-red-400 border border-red-800/60 cursor-not-allowed'
                  : 'bg-red-600 hover:bg-red-500 text-white shadow-red-600/30'
              }`}
              title="Emergency AI Shutdown"
            >
              <span>⚠</span>
              <span>{shutdownConfirmed ? 'HALTED' : shuttingDown ? '...' : 'Halt AI'}</span>
            </button>
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label="Toggle admin navigation menu"
              aria-expanded={mobileMenuOpen}
              className="p-2 rounded-lg border border-[#1E293B] bg-[#0B0F17] text-[#F8FAFC] hover:bg-[#1E293B] transition"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t border-[#1E293B] bg-[#111827] px-4 py-3 space-y-2 shadow-2xl">
            <nav className="grid grid-cols-2 gap-1.5 text-xs font-medium">
              {navLinks.map((link) => {
                const active = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`px-3 py-2 rounded-lg transition text-center ${
                      active
                        ? 'bg-[#1E293B] text-cyan-400 font-semibold border border-cyan-500/30'
                        : 'text-[#94A3B8] hover:text-[#F8FAFC] bg-[#0B0F17]/60'
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>

            <div className="pt-2 border-t border-[#1E293B] flex flex-col gap-2">
              <Link
                href="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center text-xs text-[#F8FAFC] hover:bg-[#1E293B] px-3 py-2 rounded-lg border border-[#1E293B] transition"
              >
                ← Candidate Portal
              </Link>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  void handleEmergencyShutdown();
                }}
                disabled={shuttingDown || shutdownConfirmed}
                className={`w-full px-3.5 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md ${
                  shutdownConfirmed
                    ? 'bg-red-950/60 text-red-400 border border-red-800/60 cursor-not-allowed'
                    : 'bg-red-600 hover:bg-red-500 text-white shadow-red-600/30'
                }`}
              >
                <span>⚠</span>
                <span>{shutdownConfirmed ? 'AI SHUTDOWN ACTIVE' : shuttingDown ? 'Halting...' : 'Emergency AI Shutdown'}</span>
              </button>
            </div>
          </div>
        )}
      </header>

      {message && (
        <div className="bg-red-950/40 border-b border-red-800/40 px-4 sm:px-6 py-2 text-xs text-red-200 text-center">
          {message}
        </div>
      )}

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto p-4 sm:p-6 md:p-10 space-y-6 sm:space-y-8">
        {children}
      </main>
    </div>
  );
}
