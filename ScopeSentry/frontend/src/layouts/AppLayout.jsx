import { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Shield,
  LayoutDashboard,
  FolderGit2,
  SearchCode,
  FileSpreadsheet,
  Settings,
  LogOut,
  Menu,
  X
} from 'lucide-react';
import { useAuth } from '../features/auth/AuthContext';

export default function AppLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const navItems = [
    { label: 'Dashboard', path: '/app', icon: LayoutDashboard },
    { label: 'Projects', path: '/app/projects', icon: FolderGit2 },
    { label: 'Investigations', path: '/app/investigations', icon: SearchCode },
    { label: 'Change Reports', path: '/app/reports', icon: FileSpreadsheet },
    { label: 'Settings', path: '/app/settings', icon: Settings }
  ];

  const renderNavContent = () => (
    <>
      <div>
        {/* Brand header */}
        <div className="h-16 px-5 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary-container flex items-center justify-center text-white">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <span className="font-headline font-bold text-sm tracking-tight text-white block">
                ScopeSentry
              </span>
              <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400">
                Workspace v1.0
              </span>
            </div>
          </div>
          {/* Close button on mobile */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="md:hidden p-1 text-slate-400 hover:text-white rounded focus-ring"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="p-3 space-y-1" aria-label="Main Navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              location.pathname === item.path ||
              (item.path !== '/app' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all focus-ring ${
                  isActive
                    ? 'bg-primary-container text-white shadow-sm'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* User profile & logout */}
      <div className="p-3 border-t border-white/10">
        <div className="px-3 py-2 mb-2 bg-white/5 rounded-lg border border-white/5">
          <p className="text-xs font-semibold text-white truncate">{user?.name || 'Authorized User'}</p>
          <p className="text-[10px] text-slate-400 font-mono truncate">{user?.email}</p>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:bg-white/10 hover:text-white transition-colors focus-ring"
        >
          <LogOut className="w-4 h-4 shrink-0 text-slate-400" />
          <span>Sign Out</span>
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex bg-background">
      {/* Permanent Desktop Sidebar */}
      <aside className="hidden md:flex w-64 bg-secondary-navy text-white flex-col justify-between shrink-0 border-r border-white/10">
        {renderNavContent()}
      </aside>

      {/* Mobile Backdrop & Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden" role="dialog" aria-modal="true">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <aside className="relative flex-1 flex flex-col max-w-xs w-full bg-secondary-navy text-white justify-between shadow-2xl z-10">
            {renderNavContent()}
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Utility Header */}
        <header className="h-16 bg-surface border-b border-border px-4 md:px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            {/* Mobile Hamburger Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-1.5 -ml-1 text-slate-600 hover:text-slate-900 rounded-lg focus-ring"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-xs font-mono text-secondary">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="hidden sm:inline">SYSTEM OPERATIONAL</span>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs text-secondary">
            <span>
              Workspace: <strong className="text-primary font-mono">{user?.role || 'PROJECT_OWNER'}</strong>
            </span>
          </div>
        </header>

        {/* Workspace Body */}
        <main className="flex-1 p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
