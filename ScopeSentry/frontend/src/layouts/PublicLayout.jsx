import { useState, useEffect, useRef, useCallback } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Shield, Menu, X } from 'lucide-react';

export default function PublicLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const headerRef = useRef(null);
  const toggleBtnRef = useRef(null);
  const { pathname } = useLocation();

  const closeMenu = useCallback((returnFocus = false) => {
    setMenuOpen(false);
    if (returnFocus) {
      requestAnimationFrame(() => toggleBtnRef.current?.focus());
    }
  }, []);

  // Track scroll to add soft shadow after scrolling a few pixels
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Lock body scroll while mobile menu is open & handle Escape / outside click / viewport >= md
  useEffect(() => {
    if (!menuOpen) return undefined;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        closeMenu(true);
      }
    };

    const onPointerDown = (e) => {
      if (headerRef.current && !headerRef.current.contains(e.target)) {
        closeMenu(false);
      }
    };

    const mq = window.matchMedia('(min-width: 768px)');
    const onMqChange = (e) => {
      if (e.matches) closeMenu(false);
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    mq.addEventListener('change', onMqChange);

    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
      mq.removeEventListener('change', onMqChange);
    };
  }, [menuOpen, closeMenu]);

  return (
    <div className="min-h-screen flex flex-col bg-background text-on-surface">
      {/* Public Header */}
      <header
        ref={headerRef}
        className={`sticky top-0 z-50 bg-surface/90 backdrop-blur-md border-b border-border transition-shadow duration-200 ${
          scrolled ? 'shadow-md shadow-slate-900/5' : ''
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 lg:h-20 flex items-center justify-between gap-3">
          <Link
            to="/"
            onClick={() => closeMenu(false)}
            className="flex items-center gap-2.5 sm:gap-3 focus-ring rounded-lg shrink-0 min-w-0"
          >
            <div className="w-8 h-8 min-[360px]:w-9 min-[360px]:h-9 rounded-lg bg-primary-container flex items-center justify-center text-white shadow-sm shrink-0">
              <Shield className="w-4 h-4 min-[360px]:w-5 min-[360px]:h-5" />
            </div>
            <div className="min-w-0">
              <span className="font-headline font-bold text-base min-[360px]:text-lg text-secondary-navy leading-none block whitespace-nowrap">
                ScopeSentry
              </span>
              <span className="hidden sm:block text-[10px] uppercase font-mono tracking-wider text-secondary whitespace-nowrap truncate max-w-[180px] lg:max-w-none mt-0.5">
                Change Verification Engine
              </span>
            </div>
          </Link>

          {/* Tablet & Desktop Inline Navigation */}
          <nav
            className="hidden md:flex items-center gap-4 lg:gap-6 shrink-0"
            aria-label="Public Navigation"
          >
            <Link
              to="/demo"
              className="text-sm font-medium text-secondary hover:text-on-surface transition-colors focus-ring rounded whitespace-nowrap shrink-0"
            >
              Interactive Demo
            </Link>
            <Link
              to="/login"
              className="text-sm font-semibold text-secondary hover:text-primary transition-colors focus-ring rounded whitespace-nowrap shrink-0"
            >
              Log in
            </Link>
            <Link
              to="/register"
              className="h-9 px-4 rounded-lg bg-primary-container text-white text-sm font-semibold hover:bg-primary-hover shadow-sm transition-all flex items-center justify-center focus-ring whitespace-nowrap shrink-0"
            >
              Get Started
            </Link>
          </nav>

          {/* Mobile Hamburger Toggle (44x44px tap target) */}
          <button
            ref={toggleBtnRef}
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            aria-controls="public-mobile-menu"
            className="md:hidden w-11 h-11 -mr-1.5 rounded-lg flex items-center justify-center text-secondary-navy hover:bg-slate-100 active:bg-slate-200/70 transition-colors focus-ring shrink-0 cursor-pointer"
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile Dropdown Menu Panel */}
        <nav
          id="public-mobile-menu"
          aria-label="Mobile Navigation"
          className={`md:hidden absolute left-0 right-0 top-full bg-white border-b border-border rounded-b-2xl shadow-xl shadow-slate-900/10 px-4 pt-2 pb-4 transition-all duration-200 ease-out origin-top ${
            menuOpen
              ? 'opacity-100 translate-y-0 pointer-events-auto visible'
              : 'opacity-0 -translate-y-2 pointer-events-none invisible'
          }`}
        >
          <div className="flex flex-col space-y-1">
            <Link
              to="/demo"
              onClick={() => closeMenu(false)}
              className="block w-full px-3 py-3 rounded-xl text-sm font-medium text-secondary-navy hover:bg-slate-100 active:bg-slate-200/70 transition-colors focus-ring"
            >
              Interactive Demo
            </Link>
            <Link
              to="/login"
              onClick={() => closeMenu(false)}
              className="block w-full px-3 py-3 rounded-xl text-sm font-semibold text-secondary-navy hover:bg-slate-100 active:bg-slate-200/70 transition-colors focus-ring"
            >
              Log in
            </Link>
            <Link
              to="/register"
              onClick={() => closeMenu(false)}
              className="mt-2 flex items-center justify-center w-full h-11 px-4 rounded-xl bg-primary-container text-white text-sm font-semibold hover:bg-primary-hover shadow-sm transition-all focus-ring"
            >
              Get Started
            </Link>
          </div>
        </nav>
      </header>

      {/* Main Outlet */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Public Footer */}
      <footer className="border-t border-border bg-surface py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-border">
            <Link to="/" className="flex items-center gap-3 focus-ring rounded-lg self-start">
              <div className="w-9 h-9 rounded-lg bg-primary-container flex items-center justify-center text-white shadow-sm">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <span className="font-headline font-bold text-base text-secondary-navy leading-none block">
                  ScopeSentry
                </span>
                <span className="text-[11px] text-slate-600">
                  Deterministic Construction Change Verification
                </span>
              </div>
            </Link>

            <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-medium text-slate-600" aria-label="Footer Navigation">
              <Link to="/demo" className="hover:text-primary transition-colors focus-ring rounded">
                Interactive Demo
              </Link>
              <Link to="/login" className="hover:text-primary transition-colors focus-ring rounded">
                Log in
              </Link>
              <Link to="/register" className="hover:text-primary transition-colors focus-ring rounded">
                Register
              </Link>
              <a href="#privacy" className="hover:text-primary transition-colors focus-ring rounded">
                Privacy
              </a>
              <a href="#terms" className="hover:text-primary transition-colors focus-ring rounded">
                Terms
              </a>
              <a href="#contact" className="hover:text-primary transition-colors focus-ring rounded">
                Contact
              </a>
            </nav>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-slate-600 text-center sm:text-left leading-relaxed">
              ScopeSentry highlights potential changes and estimates impacts to help project managers investigate.
              Estimates depend on supplied prices and extracted values and are not verified financial or legal conclusions.
            </p>
            <div className="text-xs text-slate-600 whitespace-nowrap">
              © {new Date().getFullYear()} ScopeSentry. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
