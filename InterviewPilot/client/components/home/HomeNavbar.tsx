'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';

interface HomeNavbarProps {
  activeSection: string;
}

const SECTION_LINKS = [
  { href: '#who-its-for', id: 'who-its-for', label: "Who It's For" },
  { href: '#how-it-works', id: 'how-it-works', label: 'How It Works' },
  { href: '#features', id: 'features', label: 'Features' },
  { href: '#types', id: 'types', label: 'Interview Types' },
  { href: '#faq', id: 'faq', label: 'FAQ' },
];

export function HomeNavbar({ activeSection }: HomeNavbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 12);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <header
      className={`sticky top-0 z-40 transition-colors duration-200 ${
        scrolled || mobileMenuOpen
          ? 'border-b border-[#334155]/80 bg-[#0B0F17]/88 backdrop-blur-md shadow-lg shadow-black/25'
          : 'border-b border-[#1E293B]/60 bg-[#0B0F17]/70 backdrop-blur-sm'
      }`}
    >
      <div className="max-w-7xl mx-auto h-16 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0 rounded-lg">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center font-bold text-slate-950 shadow-md shadow-cyan-500/20 text-xs">
            IP
          </div>
          <span className="font-semibold text-base tracking-tight text-[#F8FAFC]">
            InterviewPilot
          </span>
        </Link>

        {/* Primary Desktop Navigation */}
        <nav aria-label="Primary" className="hidden md:flex items-center gap-1 lg:gap-1.5">
          {SECTION_LINKS.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <a
                key={item.id}
                href={item.href}
                aria-current={isActive ? 'location' : undefined}
                className={`relative px-3 py-2 rounded-lg text-xs lg:text-sm font-medium transition-colors whitespace-nowrap ${
                  isActive
                    ? 'text-cyan-300 bg-cyan-500/10'
                    : 'text-[#CBD5E1] hover:text-[#F8FAFC] hover:bg-[#1E293B]/60'
                }`}
              >
                {item.label}
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-cyan-400"
                  />
                )}
              </a>
            );
          })}
          <Link
            href="/privacy"
            className="px-3 py-2 rounded-lg text-xs lg:text-sm font-medium text-[#CBD5E1] hover:text-[#F8FAFC] hover:bg-[#1E293B]/60 transition-colors whitespace-nowrap"
          >
            Privacy
          </Link>
        </nav>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-3 shrink-0">
          <Link
            href="/login"
            className="px-3 py-2 rounded-lg text-sm font-medium text-[#CBD5E1] hover:text-[#F8FAFC] transition-colors whitespace-nowrap"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-sm font-semibold shadow-md shadow-cyan-500/20 transition-all whitespace-nowrap"
          >
            Start Free
          </Link>
        </div>

        {/* Mobile Hamburger Toggle */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen((prev) => !prev)}
          aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={mobileMenuOpen}
          aria-controls="home-mobile-menu"
          className="md:hidden inline-flex items-center justify-center p-2.5 rounded-xl border border-[#334155] bg-[#111827] text-[#F8FAFC] hover:bg-[#1E293B] transition-colors"
        >
          {mobileMenuOpen ? (
            <X className="h-5 w-5" aria-hidden="true" />
          ) : (
            <Menu className="h-5 w-5" aria-hidden="true" />
          )}
        </button>
      </div>

      {/* Mobile Slide-Down Drawer */}
      <div
        id="home-mobile-menu"
        className={`md:hidden grid transition-[grid-template-rows,opacity] duration-200 ease-out ${
          mobileMenuOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0 pointer-events-none'
        }`}
        hidden={!mobileMenuOpen}
      >
        <div className="overflow-hidden border-t border-[#1E293B] bg-[#0B0F17]/95 backdrop-blur-md">
          <nav aria-label="Mobile" className="px-4 py-4 space-y-1">
            {SECTION_LINKS.map((item) => {
              const isActive = activeSection === item.id;
              return (
                <a
                  key={item.id}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/30'
                      : 'text-[#CBD5E1] hover:bg-[#1E293B]/60 hover:text-[#F8FAFC]'
                  }`}
                >
                  <span>{item.label}</span>
                  {isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" aria-hidden="true" />
                  )}
                </a>
              );
            })}
            <Link
              href="/privacy"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3.5 py-2.5 rounded-xl text-sm font-medium text-[#CBD5E1] hover:bg-[#1E293B]/60 hover:text-[#F8FAFC] transition-colors"
            >
              Privacy
            </Link>

            <div className="pt-3 mt-2 border-t border-[#1E293B] grid grid-cols-2 gap-2.5">
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-[#334155] bg-[#111827] hover:bg-[#1E293B] text-sm font-medium text-[#F8FAFC] text-center transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-sm font-semibold text-center shadow-md shadow-cyan-500/20 transition-colors"
              >
                Start Free
              </Link>
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}
