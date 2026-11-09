import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../context/useAuth';

interface RestrictedInDemoPageProps {
  moduleName?: string;
}

export const RestrictedInDemoPage: React.FC<RestrictedInDemoPageProps> = ({ moduleName }) => {
  const { user } = useAuth();
  const roleLabel = user?.role ? user.role.replace('_', ' ') : 'your current role';

  return (
    <div className="max-w-lg mx-auto my-12 bg-white border border-outline-variant rounded-xl p-8 shadow-sm text-center space-y-4">
      <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center mx-auto">
        <ShieldAlert className="w-6 h-6" />
      </div>

      <div className="space-y-1.5">
        <span className="inline-block px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[11px] font-semibold uppercase tracking-wider">
          Restricted in Demo
        </span>
        <h1 className="text-lg font-bold text-ink">
          {moduleName ? `${moduleName} is restricted for ${roleLabel}` : 'Module Restricted for Current Role'}
        </h1>
        <p className="text-xs text-ink-muted leading-relaxed">
          Your active session is signed in as <span className="font-semibold text-ink">{user?.name}</span> ({roleLabel}).
          CrewDesk enforces strict role-based access control on both the server and interface. Switch to an authorized
          role from the login screen or return to your command center.
        </p>
      </div>

      <div className="pt-2 flex items-center justify-center gap-3">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary-container hover:bg-primary-hover text-white text-xs font-semibold transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Return to Dashboard</span>
        </Link>
      </div>
    </div>
  );
};
