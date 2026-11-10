import { Outlet, Link } from 'react-router-dom';
import { Shield } from 'lucide-react';

export default function PublicLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-on-surface">
      {/* Public Header */}
      <header className="sticky top-0 z-40 bg-surface/90 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary-container flex items-center justify-center text-white shadow-sm">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <span className="font-headline font-bold text-lg text-secondary-navy leading-none block">
                ScopeSentry
              </span>
              <span className="text-[10px] uppercase font-mono tracking-wider text-secondary">
                Change Verification Engine
              </span>
            </div>
          </Link>

          <nav className="flex items-center gap-4 sm:gap-6">
            <Link to="/demo" className="text-sm font-medium text-secondary hover:text-on-surface transition-colors">
              Interactive Demo
            </Link>
            <Link to="/login" className="text-sm font-semibold text-secondary hover:text-primary transition-colors">
              Log in
            </Link>
            <Link
              to="/register"
              className="h-9 px-4 rounded-lg bg-primary-container text-white text-sm font-semibold hover:bg-primary-hover shadow-sm transition-all flex items-center justify-center"
            >
              Get Started
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Outlet */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Public Footer */}
      <footer className="border-t border-border bg-surface py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-secondary text-center sm:text-left">
            ScopeSentry highlights potential changes and estimates impacts to help project managers investigate.
            Estimates depend on supplied prices and extracted values and are not verified financial or legal conclusions.
          </p>
          <div className="text-xs text-secondary whitespace-nowrap">
            © {new Date().getFullYear()} ScopeSentry. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
