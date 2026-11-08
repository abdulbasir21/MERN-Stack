import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/useAuth';
import type { Role } from '../../types/auth';
import { Avatar } from '../shared/Avatar';
import { NotificationsDropdown } from './NotificationsDropdown';
import { PageTransition } from '../common/MotionWrapper';
import {
  Terminal,
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  Users,
  CreditCard,
  Package,
  CalendarCheck,
  CalendarOff,
  Settings,
  ShieldAlert,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: Role[];
}

const NAV_ITEMS: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/',
    icon: LayoutDashboard,
    roles: ['OWNER', 'HR_MANAGER', 'PROJECT_MANAGER', 'FINANCE_MANAGER', 'INVENTORY_MANAGER', 'EMPLOYEE'],
  },
  {
    label: 'Project Portfolio',
    href: '/projects',
    icon: FolderKanban,
    roles: ['OWNER', 'PROJECT_MANAGER', 'EMPLOYEE'],
  },
  {
    label: 'Tasks & Deliverables',
    href: '/tasks',
    icon: CheckSquare,
    roles: ['OWNER', 'PROJECT_MANAGER', 'EMPLOYEE'],
  },
  {
    label: 'Resource & HR',
    href: '/hr',
    icon: Users,
    roles: ['OWNER', 'HR_MANAGER'],
  },
  {
    label: 'Financial Ledger',
    href: '/finance',
    icon: CreditCard,
    roles: ['OWNER', 'FINANCE_MANAGER'],
  },
  {
    label: 'Asset & Inventory',
    href: '/inventory',
    icon: Package,
    roles: ['OWNER', 'INVENTORY_MANAGER', 'EMPLOYEE'],
  },
  {
    label: 'Attendance',
    href: '/attendance',
    icon: CalendarCheck,
    roles: ['OWNER', 'HR_MANAGER', 'PROJECT_MANAGER', 'FINANCE_MANAGER', 'INVENTORY_MANAGER', 'EMPLOYEE'],
  },
  {
    label: 'Leave Management',
    href: '/leave',
    icon: CalendarOff,
    roles: ['OWNER', 'HR_MANAGER', 'PROJECT_MANAGER', 'FINANCE_MANAGER', 'INVENTORY_MANAGER', 'EMPLOYEE'],
  },
  {
    label: 'Audit Log',
    href: '/audit',
    icon: ShieldAlert,
    roles: ['OWNER'],
  },
  {
    label: 'My Profile',
    href: '/profile',
    icon: Users,
    roles: ['OWNER', 'HR_MANAGER', 'PROJECT_MANAGER', 'FINANCE_MANAGER', 'INVENTORY_MANAGER', 'EMPLOYEE'],
  },
  {
    label: 'Company Settings',
    href: '/settings',
    icon: Settings,
    roles: ['OWNER'],
  },
];

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Close mobile drawer on route transition
  useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname]);

  if (!user) return null;

  const allowedNav = NAV_ITEMS.filter((item) => item.roles.includes(user.role));

  return (
    <div className="min-h-screen bg-[#F6F5F0] text-ink flex flex-col lg:flex-row">
      {/* 1. Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-40 lg:hidden transition-opacity"
          onClick={() => setIsMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* 2. Left Sidebar Navigation (240px wide per Stitch design tokens, sliding drawer on mobile) */}
      <aside
        className={`fixed top-0 left-0 h-screen w-64 lg:w-60 z-50 bg-white border-r border-outline-variant flex flex-col justify-between p-4 transition-transform duration-300 ease-in-out ${
          isMobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex flex-col gap-4">
          {/* Brand & Mobile Close Button */}
          <div className="flex items-center justify-between px-1 py-1">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded bg-primary-container flex items-center justify-center text-white">
                <Terminal className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-sm text-primary leading-tight">CrewDesk</span>
                <span className="text-[11px] text-ink-muted capitalize">
                  {user.role.replace('_', ' ').toLowerCase()}
                </span>
              </div>
            </div>

            <button
              onClick={() => setIsMobileOpen(false)}
              className="lg:hidden p-1.5 rounded-lg text-ink-muted hover:text-ink hover:bg-surface-low transition-colors"
              aria-label="Close navigation menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-1 mt-2 overflow-y-auto max-h-[calc(100vh-220px)] pr-1">
            {allowedNav.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setIsMobileOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2 rounded text-xs transition-colors ${
                    isActive
                      ? 'bg-surface-low text-primary font-semibold border-l-2 border-primary'
                      : 'text-ink-muted hover:bg-surface-low hover:text-ink font-medium'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Profile Anchor */}
        <div className="flex flex-col gap-2 pt-3 border-t border-outline-variant">
          <Link
            to="/profile"
            onClick={() => setIsMobileOpen(false)}
            className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-surface-low transition-colors min-w-0"
            title="View personal profile"
          >
            <Avatar name={user.name} avatarUrl={user.avatarUrl} size="md" />
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-xs font-semibold text-ink truncate">{user.name}</span>
              <span className="text-[11px] text-ink-muted truncate">{user.email}</span>
            </div>
          </Link>

          {/* Prominent & Clearly Visible Logout Button */}
          <button
            onClick={() => logout()}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 hover:border-rose-300 rounded-lg transition-all shadow-xs group"
            title="Sign out of CrewDesk"
          >
            <LogOut className="w-3.5 h-3.5 text-rose-600 transition-transform group-hover:-translate-x-0.5" />
            <span>Sign Out / Log Out</span>
          </button>
        </div>
      </aside>

      {/* 3. Global Canvas Header & Content (Offset 240px on desktop, full width on mobile) */}
      <div className="flex-1 flex flex-col min-h-screen lg:ml-60 w-full min-w-0">
        <header className="sticky top-0 right-0 h-14 z-30 bg-white border-b border-outline-variant px-3 sm:px-6 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3 min-w-0">
            {/* Hamburger Button for Mobile */}
            <button
              onClick={() => setIsMobileOpen(true)}
              className="lg:hidden p-2 rounded-lg text-ink-muted hover:text-ink hover:bg-surface-low transition-colors"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-1.5 sm:gap-2 text-xs truncate">
              <span className="text-ink-muted hidden sm:inline">CrewDesk</span>
              <span className="text-outline-variant hidden sm:inline">/</span>
              <span className="text-primary font-semibold capitalize truncate">
                {location.pathname === '/' ? 'Command Center' : location.pathname.substring(1)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <NotificationsDropdown />
            <div className="h-4 w-px bg-outline-variant" />
            <button
              onClick={() => logout()}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 rounded-lg transition-colors shadow-xs"
              title="Sign out of CrewDesk"
            >
              <LogOut className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Log Out</span>
            </button>
          </div>
        </header>

        <main className="flex-1 p-3.5 sm:p-5 lg:p-6 max-w-[1600px] w-full mx-auto min-w-0 overflow-x-hidden">
          <PageTransition key={location.pathname}>{children}</PageTransition>
        </main>
      </div>
    </div>
  );
};
