import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const buttons = document.querySelectorAll('[data-btn]');
    const down = (e) => e.currentTarget.style.transform = 'scale(0.95)';
    const up = (e) => e.currentTarget.style.transform = 'scale(1)';
    buttons.forEach(b => { b.addEventListener('mousedown', down); b.addEventListener('mouseup', up); });
    return () => buttons.forEach(b => { b.removeEventListener('mousedown', down); b.removeEventListener('mouseup', up); });
  }, [isAdmin]);

  const navLinks = [
    { label: 'Marketplace', href: '/' },
    { label: 'Bundles', href: '/bundles' },
    { label: 'Exclusive', href: '/exclusive' },
    { label: 'Support', href: '/support' },
  ];

  const isActive = (href) => location.pathname === href;

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <nav
      className={`fixed top-0 w-full z-50 bg-surface/80 backdrop-blur-xl border-b border-outline-variant/30 shadow-sm transition-all duration-300 ${scrolled ? 'shadow-md' : ''}`}
    >
      <div className="flex justify-between items-center h-16 px-margin-desktop max-w-[1440px] mx-auto">
        {/* Logo */}
        <a
          href="/"
          className="text-headline-md font-bold text-primary flex items-center gap-2 select-none"
        >
          <span
            className="material-symbols-outlined"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            water_drop
          </span>
          DigitalDrop
        </a>

        {/* Center Nav Links */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className={
                isActive(link.href)
                  ? 'text-primary border-b-2 border-primary pb-1 font-mono text-label-md transition-colors'
                  : 'text-on-surface-variant hover:text-primary transition-colors font-mono text-label-md'
              }
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Right Actions */}
        <div className="hidden lg:flex items-center gap-4">
          {!isAdmin ? (
            <>
              <a
                href="/admin/login"
                className="text-label-md font-mono text-on-surface-variant hover:text-primary transition-colors"
              >
                Admin Login
              </a>
              <button
                data-btn
                onClick={() => navigate('/')}
                className="bg-primary text-on-primary font-mono text-label-md px-4 py-2 rounded-lg hover:scale-95 active:scale-90 transition-transform"
              >
                Get Started
              </button>
            </>
          ) : (
            <>
              <a
                href="/admin"
                className="text-label-md font-mono text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[18px]">dashboard</span>
                Dashboard
              </a>
              <button
                data-btn
                onClick={handleLogout}
                className="bg-transparent border border-[#2A2A3A] text-on-surface px-4 py-2 rounded-lg font-mono text-label-md hover:border-[#6C63FF] hover:bg-white/5 transition-all active:scale-95"
              >
                Logout
              </button>
              <button
                data-btn
                onClick={() => navigate('/')}
                className="bg-primary text-on-primary font-mono text-label-md px-4 py-2 rounded-lg hover:scale-95 active:scale-90 transition-transform"
              >
                Get Started
              </button>
            </>
          )}
        </div>

        {/* Mobile: Get Started + Hamburger */}
        <div className="flex items-center gap-3 lg:hidden">
          <button
            data-btn
            onClick={() => navigate('/')}
            className="bg-primary text-on-primary font-mono text-label-md px-4 py-2 rounded-lg hover:scale-95 active:scale-90 transition-transform"
          >
            Get Started
          </button>
          <button
            data-btn
            onClick={() => setMobileOpen(!mobileOpen)}
            className="text-on-surface-variant hover:text-primary transition-colors p-1"
            aria-label="Toggle menu"
          >
            <span className="material-symbols-outlined">
              {mobileOpen ? 'close' : 'menu'}
            </span>
          </button>
        </div>
      </div>

      {/* Mobile Dropdown */}
      {mobileOpen && (
        <div className="md:hidden bg-surface border-b border-outline-variant/30 px-margin-mobile py-4 flex flex-col gap-4">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className={
                isActive(link.href)
                  ? 'text-primary font-mono text-label-md'
                  : 'text-on-surface-variant hover:text-primary transition-colors font-mono text-label-md'
              }
            >
              {link.label}
            </a>
          ))}
          {!isAdmin ? (
            <a
              href="/admin/login"
              className="text-label-md font-mono text-on-surface-variant hover:text-primary transition-colors"
            >
              Admin Login
            </a>
          ) : (
            <>
              <a
                href="/admin"
                className="text-label-md font-mono text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[18px]">dashboard</span>
                Dashboard
              </a>
              <button
                onClick={handleLogout}
                className="text-left text-label-md font-mono text-on-surface-variant hover:text-primary transition-colors"
              >
                Logout
              </button>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
