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

export default function Navbar() {
  const { user, demoLogin, logout } = useAuth();
  const [demoOpen, setDemoOpen] = useState(false);
  const navigate = useNavigate();

  async function handleDemo(role) {
    setDemoOpen(false);
    try {
      await demoLogin(role);
      toast.success(`Logged in as demo ${role}`);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Demo login failed');
    }
  }

  async function handleLogout() {
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
          className="font-headline-lg text-headline-lg font-bold text-primary flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-on-tertiary-container" style={{ fontSize: '32px' }}>
            shield
          </span>
          SafeCity Portal
        </Link>

        {/* Nav links */}
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

        {/* Auth section */}
        <div className="flex items-center gap-space-md">
          {user ? (
            <>
              <Link
                to={getRoleDashboard(user.role)}
                className="text-on-surface-variant font-label-md text-label-md hover:text-on-tertiary-container transition-colors hidden md:inline"
              >
                Dashboard
              </Link>
              <span className="text-on-surface-variant font-label-sm text-label-sm hidden md:inline">
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
                    {[
                      { role: 'citizen', label: 'As Citizen', icon: 'person' },
                      { role: 'officer', label: 'As Officer', icon: 'badge' },
                      { role: 'admin',   label: 'As Admin',   icon: 'admin_panel_settings' },
                    ].map(({ role, label, icon }) => (
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
      </nav>
    </header>
  );
}
