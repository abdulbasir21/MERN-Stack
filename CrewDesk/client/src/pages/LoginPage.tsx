import React, { useState } from 'react';
import { useAuth } from '../context/useAuth';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  Terminal,
  Lock,
  Mail,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Crown,
  Users,
  FolderKanban,
  Landmark,
  Boxes,
  Code2,
  Loader2,
  Eye,
  EyeOff,
} from 'lucide-react';
import { API_BASE } from '../lib/api';

export const LoginPage: React.FC = () => {
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeRole, setActiveRole] = useState<string | null>(null);

  const performLogin = async (loginEmail: string, loginPass: string, roleName?: string) => {
    setError(null);
    setIsSubmitting(true);
    if (roleName) setActiveRole(roleName);

    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: loginEmail, password: loginPass }),
      });

      const body = await res.json();

      if (!res.ok) {
        throw new Error(body.error?.message || 'Incorrect email or password.');
      }

      queryClient.clear();
      setUser(body.data.user);

      if (body.data.user.mustChangePassword) {
        navigate('/change-password');
      } else {
        navigate('/');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Incorrect email or password.');
    } finally {
      setIsSubmitting(false);
      setActiveRole(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await performLogin(email, password);
  };

  const demoAccounts = [
    {
      role: 'Owner',
      description: 'Full agency overview',
      email: 'owner@crewdesk.agency',
      icon: Crown,
    },
    {
      role: 'HR Manager',
      description: 'People and leave',
      email: 'hr@crewdesk.agency',
      icon: Users,
    },
    {
      role: 'Project Manager',
      description: 'Projects and tasks',
      email: 'pm@crewdesk.agency',
      icon: FolderKanban,
    },
    {
      role: 'Finance Manager',
      description: 'Invoices and expenses',
      email: 'finance@crewdesk.agency',
      icon: Landmark,
    },
    {
      role: 'Inventory Manager',
      description: 'Assets and stock',
      email: 'inventory@crewdesk.agency',
      icon: Boxes,
    },
    {
      role: 'Employee',
      description: 'My tasks and leave',
      email: 'employee@crewdesk.agency',
      icon: Code2,
    },
  ];

  const handleQuickDemo = (demoEmail: string, roleName: string) => {
    setEmail(demoEmail);
    setPassword('CrewDesk2026!');
    performLogin(demoEmail, 'CrewDesk2026!', roleName);
  };

  return (
    <div className="min-h-screen bg-[#F6F5F0] flex items-center justify-center p-3 sm:p-5 md:p-6">
      {/* 2-Column Split Container - Demo panel above on mobile/tablet, Left panel on desktop */}
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-xl border border-[#E2E8F0] overflow-hidden flex flex-col md:grid md:grid-cols-12 min-h-[500px]">
        
        {/* Left Hero / Demo Sandbox Column (5 cols on desktop, top on mobile) */}
        <div className="md:col-span-5 bg-gradient-to-br from-[#0B1716] via-[#0F2220] to-[#081211] text-white p-5 sm:p-6 md:p-7 flex flex-col justify-between border-b md:border-b-0 md:border-r border-[#1E3A36]">
          <div>
            {/* Brand Logo & Wordmark */}
            <div className="flex items-center gap-2.5 mb-3.5">
              <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center text-white shadow-md shadow-teal-950 shrink-0">
                <Terminal className="w-4 h-4" aria-hidden="true" />
              </div>
              <div>
                <h1 className="text-base font-bold text-white leading-tight">CrewDesk</h1>
                <span className="text-[10px] font-mono tracking-wider uppercase text-teal-400 block">
                  ENTERPRISE AGENCY ERP
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed mb-3.5">
              One place to run your agency: projects, people, finances, and assets.
            </p>

            {/* Try a demo account Section with Centered Robot Guide */}
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-teal-300 tracking-normal">
                <ShieldCheck className="w-3.5 h-3.5 text-teal-400 shrink-0" aria-hidden="true" />
                <span>Try a demo account</span>
              </div>

              {/* Centered Robot Guide directly in the middle above the Owner and HR Manager columns */}
              <div className="flex justify-center -mb-2 relative z-10">
                <img
                  src="/robot-guide.png"
                  alt="CrewDesk Robot pointing to demo roles"
                  className="w-16 h-16 sm:w-20 sm:h-20 object-contain select-none pointer-events-none drop-shadow-[0_4px_16px_rgba(20,184,166,0.35)]"
                />
              </div>

              {/* 6 Demo Role Buttons */}
              <div className="grid grid-cols-2 gap-2 pt-1 relative z-0">
                {demoAccounts.map((acc) => {
                  const IconComponent = acc.icon;
                  const isThisActive = activeRole === acc.role && isSubmitting;
                  return (
                    <button
                      key={acc.email}
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => handleQuickDemo(acc.email, acc.role)}
                      aria-label={`Sign in as ${acc.role} - ${acc.description}`}
                      className={`text-left p-2.5 rounded-xl border border-teal-800/40 bg-teal-950/35 hover:bg-teal-900/40 hover:border-teal-500/50 transition-all flex items-start gap-2 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B1716] disabled:opacity-50 disabled:cursor-not-allowed ${
                        isThisActive
                          ? 'ring-2 ring-teal-300 bg-teal-900/60 border-teal-400 motion-reduce:animate-none'
                          : ''
                      }`}
                    >
                      {/* Consistent Teal-Tinted Icon Badge */}
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border border-teal-500/30 bg-teal-900/60 text-teal-300 shadow-sm mt-0.5">
                        {isThisActive ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-200" aria-hidden="true" />
                        ) : (
                          <IconComponent className="w-3.5 h-3.5 text-teal-300" aria-hidden="true" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="font-semibold text-xs leading-snug text-white group-hover:text-teal-100 transition-colors block break-words">
                          {acc.role}
                        </span>
                        <span className="text-[10px] text-teal-200/75 leading-tight block mt-0.5 break-words">
                          {acc.description}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Bottom Left Panel Status */}
          <div className="pt-4 border-t border-teal-800/40 mt-5 flex items-center justify-between text-[11px] text-teal-200/80">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-teal-400 shrink-0" aria-hidden="true" />
              <span>Demo environment. Sample data resets daily.</span>
            </span>
          </div>
        </div>

        {/* Right Sign-in Form Column (7 cols on desktop, bottom on mobile) */}
        <div className="md:col-span-7 p-6 sm:p-8 md:p-10 flex flex-col justify-center bg-white">
          <div className="max-w-sm w-full mx-auto">
            <div className="mb-5">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">Sign in to your agency</h2>
              <p className="text-xs text-slate-500 mt-1 leading-normal">
                Enter your work email and password to continue.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-xs font-medium text-slate-700 mb-1.5">
                  Work Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" aria-hidden="true" />
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@agency.com"
                    className="w-full h-10 pl-9 pr-3 rounded-lg border border-slate-200 text-xs text-slate-900 bg-white placeholder:text-slate-400 focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="password" className="text-xs font-medium text-slate-700">
                    Password
                  </label>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" aria-hidden="true" />
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full h-10 pl-9 pr-10 rounded-lg border border-slate-200 text-xs text-slate-900 bg-white placeholder:text-slate-400 focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-2.5 p-0.5 text-slate-400 hover:text-slate-600 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" aria-hidden="true" />
                    ) : (
                      <Eye className="w-4 h-4" aria-hidden="true" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-1.5">
                  Forgot password? Contact your administrator.
                </p>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-10 rounded-lg bg-[#005c55] hover:bg-[#004d47] text-white text-xs font-semibold shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
              >
                {isSubmitting && !activeRole ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Sign in to Dashboard</span>
                    <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                  </>
                )}
              </button>

              {/* Error message under form with role="alert" */}
              {error && (
                <div
                  role="alert"
                  aria-live="assertive"
                  className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 mt-3"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" aria-hidden="true" />
                  <span>{error}</span>
                </div>
              )}
            </form>

            <div className="mt-7 pt-4 border-t border-slate-100 text-center">
              <p className="text-[11px] text-slate-400 leading-normal">
                Secure sign-in. Your session is protected.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
