import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

function getRoleDashboard(role) {
  if (role === 'citizen') return '/dashboard/citizen';
  if (role === 'officer') return '/dashboard/officer';
  if (role === 'admin') return '/dashboard/admin';
  return '/';
}

const DEMO_ROLES = [
  { role: 'citizen', label: 'As Citizen', icon: 'person' },
  { role: 'officer', label: 'As Officer', icon: 'badge' },
  { role: 'admin',   label: 'As Admin',   icon: 'admin_panel_settings' },
];

export default function Navbar() {
  const { user, demoLogin, logout } = useAuth();
  const [demoOpen, setDemoOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileDemoOpen, setMobileDemoOpen] = useState(false);
  const navigate = useNavigate();

  async function handleDemo(role) {
    setDemoOpen(false);
    setMobileOpen(false);
    setMobileDemoOpen(false);
    try {
      await demoLogin(role);
      toast.success(`Logged in as demo ${role}`);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Demo login failed');
    }
  }

  async function handleLogout() {
    setMobileOpen(false);
    try {
      await logout();
    } catch {
      // ignore
    }
  }

  return (
    <header className="bg-surface-container-lowest sticky top-0 z-50 border-b border-border-subtle shadow-sm">
      <nav className="flex justify-between items-center w-full px-gutter max-w-container-max mx-auto h-16">
        {/* Logo */}
        <Link
          to="/"
          onClick={() => setMobileOpen(false)}
          className="font-headline-lg text-headline-lg font-bold text-primary flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-on-tertiary-container" style={{ fontSize: '32px' }}>
            shield
          </span>
          <span className="hidden sm:inline">SafeCity Portal</span>
          <span className="sm:hidden">SafeCity</span>
        </Link>

        {/* Nav links - desktop only */}
        <div className="hidden md:flex gap-space-lg items-center">
          <a
            href="/#how-it-works"
            className="text-on-surface-variant font-label-md text-label-md hover:text-on-tertiary-container transition-colors"
          >
            How It Works
          </a>
          <a
            href="/#stats"
            className="text-on-surface-variant font-label-md text-label-md hover:text-on-tertiary-container transition-colors"
          >
            Statistics
          </a>
        </div>

        {/* Auth section - desktop only */}
        <div className="hidden md:flex items-center gap-space-md">
          {user ? (
            <>
              <Link
                to={getRoleDashboard(user.role)}
                className="text-on-surface-variant font-label-md text-label-md hover:text-on-tertiary-container transition-colors"
              >
                Dashboard
              </Link>
              <span className="text-on-surface-variant font-label-sm text-label-sm">
                {user.name}
              </span>
              <button
                onClick={handleLogout}
                className="border border-outline-variant text-on-surface-variant font-label-md text-label-md px-space-md py-2 rounded-lg hover:border-error hover:text-error transition-all"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="text-primary font-label-md text-label-md px-space-md py-2 hover:opacity-80"
              >
                Login
              </Link>

              {/* Demo dropdown */}
              <div className="relative">
                <button
                  onClick={() => setDemoOpen((v) => !v)}
                  className="bg-on-tertiary-container text-on-primary font-label-md text-label-md px-space-lg py-2.5 rounded-lg hover:opacity-90 flex items-center gap-1"
                >
                  Try Demo
                  <span className="material-symbols-outlined text-sm" style={{ fontSize: '16px' }}>
                    expand_more
                  </span>
                </button>
                {demoOpen && (
                  <div className="absolute right-0 top-full mt-1 bg-surface-container-lowest border border-border-subtle rounded-xl level-2-shadow w-48 py-1 z-50">
                    {DEMO_ROLES.map(({ role, label, icon }) => (
                      <button
                        key={role}
                        onClick={() => handleDemo(role)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-on-surface font-label-md text-label-md hover:bg-surface-container-low transition-colors"
                      >
                        <span className="material-symbols-outlined text-on-tertiary-container" style={{ fontSize: '18px' }}>
                          {icon}
                        </span>
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Mobile hamburger toggle */}
        <button
          onClick={() => setMobileOpen((v) => !v)}
          className="md:hidden flex items-center justify-center w-10 h-10 rounded-lg text-on-surface hover:bg-surface-container-low transition-colors"
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileOpen}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '28px' }}>
            {mobileOpen ? 'close' : 'menu'}
          </span>
        </button>
      </nav>

      {/* Mobile menu panel */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border-subtle bg-surface-container-lowest px-gutter py-space-md flex flex-col gap-space-sm">
          <a
            href="/#how-it-works"
            onClick={() => setMobileOpen(false)}
            className="text-on-surface-variant font-label-md text-label-md py-2 hover:text-on-tertiary-container transition-colors"
          >
            How It Works
          </a>
          <a
            href="/#stats"
            onClick={() => setMobileOpen(false)}
            className="text-on-surface-variant font-label-md text-label-md py-2 hover:text-on-tertiary-container transition-colors"
          >
            Statistics
          </a>

          <div className="border-t border-border-subtle my-1" />

          {user ? (
            <>
              <Link
                to={getRoleDashboard(user.role)}
                onClick={() => setMobileOpen(false)}
                className="text-on-surface-variant font-label-md text-label-md py-2 hover:text-on-tertiary-container transition-colors"
              >
                Dashboard
              </Link>
              <span className="text-on-surface-variant font-label-sm text-label-sm py-1">
                {user.name}
              </span>
              <button
                onClick={handleLogout}
                className="border border-outline-variant text-on-surface-variant font-label-md text-label-md px-space-md py-2.5 rounded-lg hover:border-error hover:text-error transition-all text-left"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                onClick={() => setMobileOpen(false)}
                className="text-primary font-label-md text-label-md py-2"
              >
                Login
              </Link>

              {/* Mobile demo section */}
              <button
                onClick={() => setMobileDemoOpen((v) => !v)}
                className="bg-on-tertiary-container text-on-primary font-label-md text-label-md px-space-lg py-2.5 rounded-lg hover:opacity-90 flex items-center justify-center gap-1"
              >
                Try Demo
                <span className="material-symbols-outlined text-sm" style={{ fontSize: '16px' }}>
                  {mobileDemoOpen ? 'expand_less' : 'expand_more'}
                </span>
              </button>
              {mobileDemoOpen && (
                <div className="flex flex-col bg-surface-container-low rounded-xl overflow-hidden">
                  {DEMO_ROLES.map(({ role, label, icon }) => (
                    <button
                      key={role}
                      onClick={() => handleDemo(role)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-on-surface font-label-md text-label-md hover:bg-surface-container-lowest transition-colors"
                    >
                      <span className="material-symbols-outlined text-on-tertiary-container" style={{ fontSize: '18px' }}>
                        {icon}
                      </span>
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </header>
  );
}