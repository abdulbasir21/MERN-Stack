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
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const LoginPage: React.FC = () => {
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
        throw new Error(body.error?.message || 'Login failed');
      }

      queryClient.clear();
      setUser(body.data.user);

      if (body.data.user.mustChangePassword) {
        navigate('/change-password');
      } else {
        navigate('/');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred during login');
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
      title: 'Command',
      email: 'owner@crewdesk.agency',
      icon: Crown,
      color: 'border-amber-500/30 hover:border-amber-400/60 bg-amber-950/20 text-amber-200',
      iconColor: 'text-amber-400 bg-amber-900/40',
    },
    {
      role: 'HR Manager',
      title: 'People & HR',
      email: 'hr@crewdesk.agency',
      icon: Users,
      color: 'border-sky-500/30 hover:border-sky-400/60 bg-sky-950/20 text-sky-200',
      iconColor: 'text-sky-400 bg-sky-900/40',
    },
    {
      role: 'Project Manager',
      title: 'Portfolio & PM',
      email: 'pm@crewdesk.agency',
      icon: FolderKanban,
      color: 'border-blue-500/30 hover:border-blue-400/60 bg-blue-950/20 text-blue-200',
      iconColor: 'text-blue-400 bg-blue-900/40',
    },
    {
      role: 'Finance Manager',
      title: 'Financial Ledger',
      email: 'finance@crewdesk.agency',
      icon: Landmark,
      color: 'border-emerald-500/30 hover:border-emerald-400/60 bg-emerald-950/20 text-emerald-200',
      iconColor: 'text-emerald-400 bg-emerald-900/40',
    },
    {
      role: 'Inventory Manager',
      title: 'Assets & Stock',
      email: 'inventory@crewdesk.agency',
      icon: Boxes,
      color: 'border-purple-500/30 hover:border-purple-400/60 bg-purple-950/20 text-purple-200',
      iconColor: 'text-purple-400 bg-purple-900/40',
    },
    {
      role: 'Employee',
      title: 'Staff Engineer',
      email: 'employee@crewdesk.agency',
      icon: Code2,
      color: 'border-teal-500/30 hover:border-teal-400/60 bg-teal-950/20 text-teal-200',
      iconColor: 'text-teal-400 bg-teal-900/40',
    },
  ];

  const handleQuickDemo = (demoEmail: string, roleName: string) => {
    setEmail(demoEmail);
    setPassword('CrewDesk2026!');
    performLogin(demoEmail, 'CrewDesk2026!', roleName);
  };

  return (
    <div className="min-h-screen bg-[#F6F5F0] flex items-center justify-center p-4 sm:p-6">
      {/* 2-Column Split Executive Container */}
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-xl border border-[#E2E8F0] overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[540px]">
        
        {/* Left Hero / Demo Sandbox Column (5 cols) */}
        <div className="md:col-span-5 bg-gradient-to-br from-[#0B1716] via-[#0F2220] to-[#081211] text-white p-7 flex flex-col justify-between border-b md:border-b-0 md:border-r border-[#1E3A36]">
          <div>
            {/* Brand Logo */}
            <div className="flex items-center gap-2.5 mb-6">
              <div className="w-9 h-9 rounded-lg bg-teal-600 flex items-center justify-center text-white shadow-md shadow-teal-950">
                <Terminal className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight text-white leading-tight">CrewDesk</h1>
                <span className="text-[10px] font-mono tracking-wider uppercase text-teal-400">Enterprise Agency ERP</span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed mb-6">
              Unified agency command center for project portfolios, workforce management, financial cashflow, and hardware assets.
            </p>

            {/* Quick Demo Login Buttons Section */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-teal-300 uppercase tracking-wider">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Quick Demo Login Buttons</span>
              </div>
              <p className="text-[11px] text-slate-400 pb-1">
                Click any role button below to sign in instantly:
              </p>

              <div className="grid grid-cols-2 gap-2.5 pt-1">
                {demoAccounts.map((acc) => {
                  const IconComponent = acc.icon;
                  const isThisActive = activeRole === acc.role && isSubmitting;
                  return (
                    <button
                      key={acc.email}
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => handleQuickDemo(acc.email, acc.role)}
                      className={`text-left p-2.5 rounded-xl border transition-all active:scale-[0.98] flex items-center gap-2.5 group ${acc.color} ${
                        isThisActive ? 'ring-2 ring-white animate-pulse' : ''
                      }`}
                    >
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border border-white/10 ${acc.iconColor}`}>
                        {isThisActive ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                        ) : (
                          <IconComponent className="w-3.5 h-3.5" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-xs leading-tight text-white group-hover:text-white transition-colors truncate">
                          {acc.title}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate mt-0.5">
                          {acc.role}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-white/10 mt-6 flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />
              Multi-Tenant RBAC Active
            </span>
            <span className="font-mono text-[10px] text-slate-400">v1.0 Production</span>
          </div>
        </div>

        {/* Right Sign-in Form Column (7 cols) */}
        <div className="md:col-span-7 p-8 sm:p-10 flex flex-col justify-center bg-white">
          <div className="max-w-sm w-full mx-auto">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">Sign in to your agency</h2>
              <p className="text-xs text-slate-500 mt-1">
                Enter your credentials or use the role switcher on the left.
              </p>
            </div>

            {error && (
              <div className="mb-5 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Work Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@agency.com"
                    className="w-full h-10 pl-9 pr-3 rounded-lg border border-slate-200 text-xs text-slate-900 bg-white placeholder:text-slate-400 focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600 transition-all"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-slate-700">Password</label>
                  <span className="text-[11px] text-slate-400 font-mono">Default: CrewDesk2026!</span>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full h-10 pl-9 pr-3 rounded-lg border border-slate-200 text-xs text-slate-900 bg-white placeholder:text-slate-400 focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600 transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-10 rounded-lg bg-[#005c55] hover:bg-[#004d47] text-white text-xs font-semibold shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
              >
                {isSubmitting ? (
                  <span>Authenticating...</span>
                ) : (
                  <>
                    <span>Sign in to Dashboard</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 pt-4 border-t border-slate-100 text-center">
              <p className="text-[11px] text-slate-400">
                CrewDesk Security • httpOnly cookie authentication • 256-bit encryption
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
