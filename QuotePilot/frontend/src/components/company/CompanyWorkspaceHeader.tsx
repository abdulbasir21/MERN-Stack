'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Inbox,
  Briefcase,
  Building2,
  Star,
  ExternalLink,
  Home,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  X,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { NotificationBell } from '@/components/notifications/NotificationBell';

interface CompanyWorkspaceHeaderProps {
  activeTab: 'inquiries' | 'services' | 'profile' | 'reviews';
  inquiryCount?: number;
}

interface CompanyInfo {
  _id: string;
  name: string;
  slug: string;
  mainCategory: string;
  city: string;
  status: string;
  logo?: { url: string };
  servicesCount?: number;
}

export function CompanyWorkspaceHeader({ activeTab, inquiryCount }: CompanyWorkspaceHeaderProps) {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [company, setCompany] = useState<CompanyInfo | null>(null);
  const [dismissOnboarding, setDismissOnboarding] = useState(false);
  const [hasServices, setHasServices] = useState<boolean | null>(null);

  useEffect(() => {
    const fetchCompanyData = async () => {
      try {
        const [compRes, srvRes] = await Promise.all([
          api.get<{ company: CompanyInfo }>('/company/me'),
          api.get<{ services: any[] }>('/company/services').catch(() => ({ data: { services: [] } })),
        ]);
        setCompany(compRes.data.company);
        const srvCount = srvRes.data?.services?.length ?? 0;
        setHasServices(srvCount > 0);
      } catch {
        // Fallback silently if offline or restricted
      }
    };

    fetchCompanyData();
  }, []);

  const navTabs = [
    {
      id: 'inquiries',
      label: 'Inquiries Pipeline',
      href: '/company/inquiries',
      icon: Inbox,
      badge: inquiryCount !== undefined ? inquiryCount : undefined,
    },
    {
      id: 'services',
      label: 'Services & AI Intake Gates',
      href: '/company/services',
      icon: Briefcase,
    },
    {
      id: 'profile',
      label: 'Studio Profile & Portfolio',
      href: '/company/profile',
      icon: Building2,
    },
    {
      id: 'reviews',
      label: 'Client Reviews',
      href: '/company/reviews',
      icon: Star,
    },
  ];

  const showSetupAlert = hasServices === false && !dismissOnboarding;

  return (
    <div className="bg-white border-b border-paper-200">
      {/* 1. SECP Trust & Escrow Bar */}
      <aside className="bg-paper-100 border-b border-paper-200 px-4 sm:px-8 py-1.5 text-[11px] font-mono text-stone-600">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
            <span className="font-semibold text-stone-900">Meezan Escrow Protected Studio</span>
            <span className="text-stone-300">•</span>
            <span>Commercial Clearing Currency: PKR (Rs.)</span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-teal-800" />
            <span>SECP Institutional Arbitrated Standard</span>
          </div>
        </div>
      </aside>

      {/* 2. Top Header Toolbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-mono text-stone-500">
              <Link href="/" className="hover:text-teal-900 transition-colors flex items-center gap-1">
                <Home className="w-3 h-3" />
                <span>Home</span>
              </Link>
              <span>›</span>
              <span className="text-stone-600">Studio Workspace</span>
              <span>›</span>
              <span className="text-stone-900 font-semibold uppercase">{activeTab}</span>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-serif font-bold text-stone-900 tracking-tight">
                {company?.name || 'Studio Management Desk'}
              </h1>
              {company && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>SECP Approved Studio</span>
                </span>
              )}
            </div>

            {company && (
              <p className="text-xs font-mono text-stone-500">
                Discipline: <strong className="text-stone-700">{company.mainCategory}</strong> • Jurisdiction: <strong className="text-stone-700">{company.city}</strong>
              </p>
            )}
          </div>

          {/* Quick Header Actions */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs font-mono">
            {company?.slug && (
              <Link
                href={`/companies/${company.slug}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-teal-50 text-teal-900 border border-teal-200 hover:bg-teal-100 transition-colors font-semibold"
                title="View how institutional buyers see your public studio profile"
              >
                <ExternalLink className="w-3.5 h-3.5 text-teal-800" />
                <span>View Public Profile</span>
              </Link>
            )}

            <Link href="/companies">
              <Button variant="secondary" size="md" className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-stone-600" />
                <span>Marketplace</span>
              </Button>
            </Link>

            <NotificationBell />

            <Button variant="ghost" size="md" onClick={logout} className="text-stone-500 hover:text-stone-900">
              Sign Out
            </Button>
          </div>
        </div>

        {/* 3. Studio Workspace Navigation Tabs */}
        <nav className="flex space-x-1 sm:space-x-2 border-b border-paper-200 mt-6 -mb-px overflow-x-auto scrollbar-none">
          {navTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <Link
                key={tab.id}
                href={tab.href}
                className={`py-3 px-3.5 sm:px-4 text-xs font-mono font-medium rounded-t-lg border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
                  isActive
                    ? 'border-teal-900 text-teal-950 bg-teal-50/50 font-bold'
                    : 'border-transparent text-stone-600 hover:text-stone-900 hover:bg-paper-100/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-teal-900' : 'text-stone-400'}`} />
                <span>{tab.label}</span>
                {tab.badge !== undefined && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                      isActive ? 'bg-teal-900 text-white' : 'bg-paper-200 text-stone-600'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* 4. Onboarding Alert: Studio Setup Guide (shown when services are 0) */}
      {showSetupAlert && (
        <div className="bg-amber-50/80 border-b border-amber-200/80 px-4 sm:px-6 lg:px-8 py-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-serif font-bold text-sm text-stone-900">
                    🎉 Studio Application Approved! Complete Your Marketplace Setup
                  </h3>
                  <p className="text-xs text-stone-600 max-w-3xl">
                    Your studio is verified and live on QuotePilot! Follow these 3 simple steps to make your profile stand out and start receiving quotation requests from institutional clients:
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 font-mono text-xs">
                    {/* Step 1 */}
                    <Link
                      href="/company/profile"
                      className="p-3 rounded-xl bg-white border border-amber-200/60 hover:border-teal-800 hover:shadow-xs transition-all group flex flex-col justify-between"
                    >
                      <div>
                        <div className="text-[10px] text-amber-700 font-bold uppercase tracking-wider mb-1">
                          Step 1 • Profile
                        </div>
                        <div className="font-bold text-stone-900 group-hover:text-teal-900 mb-1">
                          Upload Logo &amp; Studio Bio
                        </div>
                        <div className="text-[11px] text-stone-500">
                          Add your visual branding, tagline, and verified contact phone.
                        </div>
                      </div>
                      <div className="text-teal-900 font-bold text-[11px] flex items-center gap-1 pt-2">
                        <span>Configure Profile</span>
                        <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </Link>

                    {/* Step 2 */}
                    <Link
                      href="/company/services"
                      className="p-3 rounded-xl bg-white border border-amber-200/60 hover:border-teal-800 hover:shadow-xs transition-all group flex flex-col justify-between"
                    >
                      <div>
                        <div className="text-[10px] text-amber-700 font-bold uppercase tracking-wider mb-1">
                          Step 2 • Services
                        </div>
                        <div className="font-bold text-stone-900 group-hover:text-teal-900 mb-1">
                          Add Services &amp; AI Gates
                        </div>
                        <div className="text-[11px] text-stone-500">
                          Define price tiers and intake checklists for buyers to submit RFQs.
                        </div>
                      </div>
                      <div className="text-teal-900 font-bold text-[11px] flex items-center gap-1 pt-2">
                        <span>Publish Service</span>
                        <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </Link>

                    {/* Step 3 */}
                    <Link
                      href="/company/profile"
                      className="p-3 rounded-xl bg-white border border-amber-200/60 hover:border-teal-800 hover:shadow-xs transition-all group flex flex-col justify-between"
                    >
                      <div>
                        <div className="text-[10px] text-amber-700 font-bold uppercase tracking-wider mb-1">
                          Step 3 • Portfolio
                        </div>
                        <div className="font-bold text-stone-900 group-hover:text-teal-900 mb-1">
                          Showcase Past Projects
                        </div>
                        <div className="text-[11px] text-stone-500">
                          Upload high-resolution case studies to build credibility.
                        </div>
                      </div>
                      <div className="text-teal-900 font-bold text-[11px] flex items-center gap-1 pt-2">
                        <span>Add Projects</span>
                        <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </Link>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setDismissOnboarding(true)}
                className="text-stone-400 hover:text-stone-600 p-1 rounded-lg hover:bg-amber-100/60 transition-colors shrink-0"
                title="Dismiss setup guide"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
