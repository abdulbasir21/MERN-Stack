'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Mic,
  FileText,
  History,
  Settings,
  Shield,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import type { AuthUserDto } from '@interviewpilot/shared';
import { logoutAccount } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface AppShellProps {
  user?: AuthUserDto | null;
  children: React.ReactNode;
}

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/interviews/setup', label: 'New Interview', icon: Mic },
  { href: '/documents', label: 'Documents', icon: FileText },
  { href: '/history', label: 'Interview History', icon: History },
  { href: '/settings', label: 'Profile & Settings', icon: Settings },
];

export function AppShell({ user, children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    try {
      await logoutAccount();
    } finally {
      router.push('/login');
    }
  };

  return (
    <div className="flex min-h-screen bg-canvas text-text-primary">
      {/* Desktop Sidebar (256px) */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-surface md:flex">
        <div className="flex h-16 items-center justify-between border-b border-border px-6">
          <Link href="/dashboard" className="text-lg font-bold tracking-tight">
            Interview<span className="text-secondary">Pilot</span>
          </Link>
          {user?.isDemo && <Badge variant="live">Demo</Badge>}
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4" aria-label="Main navigation">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                  active
                    ? 'bg-surface-raised text-text-primary border-l-2 border-primary'
                    : 'text-text-secondary hover:bg-surface-raised/60 hover:text-text-primary'
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}

          {user?.role === 'ADMIN' && (
            <Link
              href="/admin"
              className={cn(
                'mt-4 flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                pathname.startsWith('/admin')
                  ? 'bg-surface-raised text-text-primary border-l-2 border-primary'
                  : 'text-secondary hover:bg-surface-raised/60'
              )}
            >
              <Shield className="h-4 w-4 shrink-0" />
              <span>Admin Console</span>
            </Link>
          )}
        </nav>

        <div className="border-t border-border p-4">
          {user && (
            <div className="mb-3 truncate px-1">
              <p className="truncate text-sm font-medium text-text-primary">
                {user.profile?.fullName || user.email}
              </p>
              <p className="truncate text-xs text-text-muted">{user.email}</p>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-text-secondary hover:text-rose-400"
            onClick={() => void handleLogout()}
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main Content Workspace */}
      <div className="flex flex-1 flex-col min-w-0">
        <header className="border-b border-border bg-surface md:hidden sticky top-0 z-40">
          <div className="flex h-16 items-center justify-between px-4">
            <div className="flex items-center gap-2">
              <Link href="/dashboard" className="text-lg font-bold tracking-tight">
                Interview<span className="text-secondary">Pilot</span>
              </Link>
              {user?.isDemo && <Badge variant="live">Demo</Badge>}
            </div>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label="Toggle navigation menu"
              aria-expanded={mobileMenuOpen}
              className="rounded-lg border border-border bg-surface-raised p-2 text-text-primary transition hover:bg-surface-raised/80"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>

          {mobileMenuOpen && (
            <nav
              className="border-t border-border bg-surface px-4 py-3 space-y-1 shadow-lg"
              aria-label="Mobile navigation"
            >
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active =
                  pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                      active
                        ? 'bg-surface-raised text-text-primary border-l-2 border-primary'
                        : 'text-text-secondary hover:bg-surface-raised/60 hover:text-text-primary'
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}

              {user?.role === 'ADMIN' && (
                <Link
                  href="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                    pathname.startsWith('/admin')
                      ? 'bg-surface-raised text-text-primary border-l-2 border-primary'
                      : 'text-secondary hover:bg-surface-raised/60'
                  )}
                >
                  <Shield className="h-4 w-4 shrink-0" />
                  <span>Admin Console</span>
                </Link>
              )}

              <div className="pt-2 mt-2 border-t border-border">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-text-secondary hover:text-rose-400"
                  onClick={() => void handleLogout()}
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </Button>
              </div>
            </nav>
          )}
        </header>

        <main className="mx-auto w-full max-w-[1280px] flex-1 px-4 sm:px-6 py-6 sm:py-8 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
