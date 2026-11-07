'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2,
  Scale,
  Briefcase,
  Zap,
  Menu,
  X,
  ArrowRight,
  ShieldCheck,
  User,
  LogOut,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { apiClient, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { NotificationBell } from '@/components/notifications/NotificationBell';

interface NavbarProps {
  activeTab?: string;
}

export function Navbar({ activeTab }: NavbarProps) {
  const router = useRouter();
  const { user, logout, login } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [demoDropdownOpen, setDemoDropdownOpen] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Close mobile menu on route change or ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileMenuOpen(false);
        setDemoDropdownOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Quick Demo Login Handler
  const handleQuickDemoLogin = async (demoEmail: string, demoPass: string, targetPath?: string) => {
    setIsLoggingIn(true);
    try {
      const res = await apiClient<{ user: any; token: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: demoEmail, password: demoPass }),
      });
      setMobileMenuOpen(false);
      setDemoDropdownOpen(false);
      login(res.data.token, res.data.user, targetPath);
    } catch (err) {
      console.error('Quick demo login error:', err);
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <header className="bg-paper-surface border-b border-paper-border sticky top-0 z-40 backdrop-blur-md bg-white/95">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-control bg-brand-teal flex items-center justify-center text-white font-serif font-bold text-base shadow-sm group-hover:bg-brand-teal-hover transition-colors shrink-0">
              Q
            </div>
            <div className="flex flex-col">
              <span className="font-serif font-bold text-xl text-ink-primary tracking-tight leading-none">
                QuotePilot
              </span>
              <span className="text-[9px] font-mono tracking-wider text-ink-muted uppercase hidden sm:block">
                Institutional Marketplace
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center space-x-6 text-sm text-ink-secondary font-medium">
            <Link
              href="/companies"
              className={`hover:text-brand-teal transition-colors flex items-center gap-1.5 ${
                activeTab === 'companies' ? 'text-brand-teal font-semibold' : ''
              }`}
            >
              <Building2 className="w-4 h-4 text-ink-muted" />
              <span>Browse Companies</span>
            </Link>
            <a
              href="/#how-it-works"
              className="hover:text-brand-teal transition-colors flex items-center gap-1.5"
            >
              <Scale className="w-4 h-4 text-ink-muted" />
              <span>Arbitration Workflow</span>
            </a>
            <a
              href="/#categories"
              className="hover:text-brand-teal transition-colors flex items-center gap-1.5"
            >
              <Briefcase className="w-4 h-4 text-ink-muted" />
              <span>Disciplines</span>
            </a>
          </nav>
        </div>

        {/* Right Action Controls (Desktop + Mobile Toggle) */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Quick Demo Personas Dropdown (Desktop) */}
          <div className="relative hidden sm:block">
            <button
              type="button"
              onClick={() => setDemoDropdownOpen(!demoDropdownOpen)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand-teal/10 hover:bg-brand-teal/20 text-brand-teal font-mono text-xs font-semibold border border-brand-teal/25 transition-all"
              title="One-click switch to pre-seeded demo users"
            >
              <Zap className="w-3.5 h-3.5 fill-brand-teal" />
              <span>Demo Personas</span>
            </button>

            {/* Desktop Demo Dropdown Menu */}
            <AnimatePresence>
              {demoDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-modal border border-paper-border p-3 z-50 space-y-1.5 text-xs font-mono"
                >
                  <div className="px-2 py-1 text-[10px] uppercase font-bold text-ink-muted tracking-wider border-b border-paper-border pb-1.5 flex items-center gap-1.5">
                    <Zap className="w-3 h-3 text-brand-teal fill-brand-teal" />
                    <span>Instant One-Click Login</span>
                  </div>
                  <button
                    type="button"
                    disabled={isLoggingIn}
                    onClick={() => handleQuickDemoLogin('zain.customer@example.com', 'Password123!', '/inquiries')}
                    className="w-full text-left p-2 rounded-xl hover:bg-brand-teal-tint hover:border-brand-teal/30 border border-transparent transition-all flex items-center justify-between group"
                  >
                    <div>
                      <div className="font-semibold text-ink-primary group-hover:text-brand-teal">
                        Client / Buyer
                      </div>
                      <div className="text-[10px] text-ink-muted">Zain Ahmed</div>
                    </div>
                    <ArrowRight className="w-3 h-3 text-ink-muted group-hover:text-brand-teal group-hover:translate-x-0.5 transition-transform" />
                  </button>
                  <button
                    type="button"
                    disabled={isLoggingIn}
                    onClick={() => handleQuickDemoLogin('tariq.pixel@example.com', 'Password123!', '/company/inquiries')}
                    className="w-full text-left p-2 rounded-xl hover:bg-brand-teal-tint hover:border-brand-teal/30 border border-transparent transition-all flex items-center justify-between group"
                  >
                    <div>
                      <div className="font-semibold text-ink-primary group-hover:text-brand-teal">
                        Pixel &amp; Pine Studio
                      </div>
                      <div className="text-[10px] text-ink-muted">Web Dev Provider</div>
                    </div>
                    <ArrowRight className="w-3 h-3 text-ink-muted group-hover:text-brand-teal group-hover:translate-x-0.5 transition-transform" />
                  </button>
                  <button
                    type="button"
                    disabled={isLoggingIn}
                    onClick={() => handleQuickDemoLogin('ayla.hearth@example.com', 'Password123!', '/company/inquiries')}
                    className="w-full text-left p-2 rounded-xl hover:bg-brand-teal-tint hover:border-brand-teal/30 border border-transparent transition-all flex items-center justify-between group"
                  >
                    <div>
                      <div className="font-semibold text-ink-primary group-hover:text-brand-teal">
                        Hearth Interiors
                      </div>
                      <div className="text-[10px] text-ink-muted">Ayla Hearth · Interior Design</div>
                    </div>
                    <ArrowRight className="w-3 h-3 text-ink-muted group-hover:text-brand-teal group-hover:translate-x-0.5 transition-transform" />
                  </button>
                  <button
                    type="button"
                    disabled={isLoggingIn}
                    onClick={() => handleQuickDemoLogin('admin@quotepilot.com', 'AdminPassword123!', '/admin/companies')}
                    className="w-full text-left p-2 rounded-xl hover:bg-brand-teal-tint hover:border-brand-teal/30 border border-transparent transition-all flex items-center justify-between group"
                  >
                    <div>
                      <div className="font-semibold text-ink-primary group-hover:text-brand-teal">
                        Platform Admin
                      </div>
                      <div className="text-[10px] text-ink-muted">SECP Verification Desk</div>
                    </div>
                    <ArrowRight className="w-3 h-3 text-ink-muted group-hover:text-brand-teal group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Desktop User Status / Auth Buttons */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                <NotificationBell />
                {user.role === 'customer' && (
                  <Link href="/inquiries">
                    <Button variant="secondary" size="sm" className="font-mono text-xs">
                      My Inquiries
                    </Button>
                  </Link>
                )}
                {user.role === 'company_admin' && (
                  <Link href="/company/inquiries">
                    <Button variant="primary" size="sm" className="font-mono text-xs bg-brand-teal">
                      Provider Desk
                    </Button>
                  </Link>
                )}
                {user.role === 'platform_admin' && (
                  <Link href="/admin/companies">
                    <Button variant="secondary" size="sm" className="font-mono text-xs">
                      Admin Desk
                    </Button>
                  </Link>
                )}
                <div className="text-xs font-mono text-ink-muted">
                  {user.name.split(' ')[0]}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={logout}
                  className="font-mono text-xs text-ink-muted hover:text-ink-primary"
                >
                  Sign Out
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/login">
                  <Button variant="ghost" size="sm" className="font-mono text-xs">
                    Log In
                  </Button>
                </Link>
                <Link href="/register">
                  <Button
                    variant="primary"
                    size="sm"
                    className="font-mono text-xs bg-brand-teal hover:bg-brand-teal-hover"
                  >
                    Get Quotes
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Hamburger Toggle Button (Always visible on mobile) */}
          <div className="md:hidden flex items-center gap-1.5">
            {user && <NotificationBell />}
            <button
              type="button"
              aria-label="Toggle navigation menu"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="w-10 h-10 rounded-xl bg-paper-canvas border border-paper-border flex items-center justify-center text-ink-primary hover:text-brand-teal hover:border-brand-teal/40 transition-colors focus:outline-none"
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5 text-brand-teal" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer / Hamburger Dropdown Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="md:hidden bg-white border-b border-paper-border overflow-hidden shadow-2xl px-4 pt-3 pb-6 space-y-5"
          >
            {/* Primary Mobile Navigation Links */}
            <div className="space-y-1">
              <Link
                href="/companies"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between p-3 rounded-xl hover:bg-paper-canvas text-sm font-medium text-ink-primary transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-brand-teal-tint flex items-center justify-center text-brand-teal">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <span>Browse Approved Companies</span>
                </div>
                <ChevronRight className="w-4 h-4 text-ink-muted" />
              </Link>

              <a
                href="/#how-it-works"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between p-3 rounded-xl hover:bg-paper-canvas text-sm font-medium text-ink-primary transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-brand-teal-tint flex items-center justify-center text-brand-teal">
                    <Scale className="w-4 h-4" />
                  </div>
                  <span>Arbitration &amp; Escrow Covenant</span>
                </div>
                <ChevronRight className="w-4 h-4 text-ink-muted" />
              </a>

              <a
                href="/#categories"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between p-3 rounded-xl hover:bg-paper-canvas text-sm font-medium text-ink-primary transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-brand-teal-tint flex items-center justify-center text-brand-teal">
                    <Briefcase className="w-4 h-4" />
                  </div>
                  <span>Commercial Disciplines</span>
                </div>
                <ChevronRight className="w-4 h-4 text-ink-muted" />
              </a>
            </div>

            {/* Mobile One-Click Demo Personas Selector */}
            <div className="p-3.5 rounded-2xl bg-paper-canvas border border-paper-border space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono uppercase tracking-wider text-brand-teal font-bold flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 fill-brand-teal" />
                  Instant Demo Login
                </span>
                <span className="text-[10px] font-mono text-ink-muted">Tap to switch</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <button
                  type="button"
                  disabled={isLoggingIn}
                  onClick={() => handleQuickDemoLogin('zain.customer@example.com', 'Password123!', '/inquiries')}
                  className="p-2.5 rounded-xl border border-paper-border bg-white hover:border-brand-teal/50 text-left transition-all active:scale-95"
                >
                  <div className="font-semibold text-ink-primary">Buyer / Client</div>
                  <div className="text-[10px] text-ink-muted truncate">Zain Ahmed</div>
                </button>
                <button
                  type="button"
                  disabled={isLoggingIn}
                  onClick={() => handleQuickDemoLogin('tariq.pixel@example.com', 'Password123!', '/company/inquiries')}
                  className="p-2.5 rounded-xl border border-paper-border bg-white hover:border-brand-teal/50 text-left transition-all active:scale-95"
                >
                  <div className="font-semibold text-ink-primary">Web Studio</div>
                  <div className="text-[10px] text-ink-muted truncate">Pixel &amp; Pine</div>
                </button>
                <button
                  type="button"
                  disabled={isLoggingIn}
                  onClick={() => handleQuickDemoLogin('ayla.hearth@example.com', 'Password123!', '/company/inquiries')}
                  className="p-2.5 rounded-xl border border-paper-border bg-white hover:border-brand-teal/50 text-left transition-all active:scale-95"
                >
                  <div className="font-semibold text-ink-primary">Interior Studio</div>
                  <div className="text-[10px] text-ink-muted truncate">Hearth Interiors</div>
                </button>
                <button
                  type="button"
                  disabled={isLoggingIn}
                  onClick={() => handleQuickDemoLogin('admin@quotepilot.com', 'AdminPassword123!', '/admin/companies')}
                  className="p-2.5 rounded-xl border border-paper-border bg-white hover:border-brand-teal/50 text-left transition-all active:scale-95"
                >
                  <div className="font-semibold text-ink-primary">Platform Admin</div>
                  <div className="text-[10px] text-ink-muted truncate">SECP Desk</div>
                </button>
              </div>
            </div>

            {/* Mobile Auth Session Actions */}
            <div className="pt-2 border-t border-paper-border space-y-2">
              {user ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-2 text-xs font-mono text-ink-muted">
                    <span>Signed in as</span>
                    <span className="font-semibold text-ink-primary">{user.name}</span>
                  </div>
                  {user.role === 'customer' && (
                    <Link
                      href="/inquiries"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block w-full py-2.5 px-4 rounded-xl bg-brand-teal text-white text-center text-xs font-mono font-semibold"
                    >
                      View My Inquiries
                    </Link>
                  )}
                  {user.role === 'company_admin' && (
                    <Link
                      href="/company/inquiries"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block w-full py-2.5 px-4 rounded-xl bg-brand-teal text-white text-center text-xs font-mono font-semibold"
                    >
                      Open Provider Desk
                    </Link>
                  )}
                  {user.role === 'platform_admin' && (
                    <Link
                      href="/admin/companies"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block w-full py-2.5 px-4 rounded-xl bg-brand-teal text-white text-center text-xs font-mono font-semibold"
                    >
                      Open Admin Audit Desk
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      logout();
                      setMobileMenuOpen(false);
                    }}
                    className="w-full py-2 px-4 rounded-xl border border-paper-border text-xs font-mono text-semantic-error hover:bg-semantic-error-tint transition-colors flex items-center justify-center gap-1.5"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="py-2.5 px-4 rounded-xl border border-paper-border bg-white text-center text-xs font-mono font-semibold text-ink-primary hover:bg-paper-canvas transition-colors"
                  >
                    Log In
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="py-2.5 px-4 rounded-xl bg-brand-teal text-center text-xs font-mono font-semibold text-white hover:bg-brand-teal-hover transition-colors"
                  >
                    Get Quotes
                  </Link>
                  <div className="col-span-2 text-center pt-2">
                    <Link
                      href="/register-company"
                      onClick={() => setMobileMenuOpen(false)}
                      className="text-xs font-mono text-brand-teal hover:underline"
                    >
                      Are you a service agency? Register your company →
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
