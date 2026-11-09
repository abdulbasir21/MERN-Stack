import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/useAuth';
import {
  AlertTriangle,
  UserCheck,
  Users,
  FolderKanban,
  CheckCircle2,
  ListTodo,
  Clock,
  Receipt,
  CircleDollarSign,
  Hourglass,
  CreditCard,
  Laptop,
  Boxes,
  Calendar,
  HeartPulse,
  Coffee,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { StatCard } from '../components/common/StatCard';
import { formatCurrency } from '../lib/utils';
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

const CASHFLOW_COLORS = ['#2563EB', '#059669', '#E11D48', '#0D9488'];
const DEPT_COLORS = ['#0F766E', '#0284C7', '#6366F1', '#EC4899', '#8B5CF6'];
const EXPENSE_COLORS = ['#E11D48', '#F59E0B', '#8B5CF6', '#0284C7', '#10B981', '#64748B'];

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', 'stats', user?.id, user?.role],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/dashboard/stats`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load dashboard stats');
      return res.json();
    },
    enabled: !!user,
  });

  if (!user) return null;
  const stats = data?.data;
  const isStatsReady = Boolean(stats && stats.role === user.role);

  const departmentName =
    typeof user.department === 'object' && user.department !== null
      ? user.department.name
      : typeof user.department === 'string'
      ? user.department
      : 'Executive Operations';

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Welcome back, {user.name}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Signed in as <strong className="text-slate-900 dark:text-white font-semibold">{user.role.replace('_', ' ')}</strong> • Department: {departmentName}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            System Live
          </span>
        </div>
      </div>

      {isLoading || !isStatsReady ? (
        <div className="p-12 text-center text-sm text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
          Loading executive command center analytics...
        </div>
      ) : !stats ? (
        <div className="p-8 text-center text-sm text-slate-400">No dashboard metrics available.</div>
      ) : (
        <>
          {/* ==========================================
              1. OWNER EXECUTIVE COMMAND CENTER
              ========================================== */}
          {user.role === 'OWNER' && (
            <div className="space-y-6">
              {/* Executive Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {(() => {
                  const collected = parseFloat(stats.metrics.totalCollected) || 0;
                  const invoiced = parseFloat(stats.metrics.totalInvoiced) || 1;
                  const collectionRate = Math.min(100, Math.round((collected / Math.max(invoiced, 1)) * 100));
                  return (
                    <StatCard
                      index={0}
                      label="Total Collected"
                      value={formatCurrency(collected)}
                      subtext={`Invoiced: ${formatCurrency(invoiced)}`}
                      icon={CircleDollarSign}
                      ringPercentage={collectionRate}
                      tone="default"
                    />
                  );
                })()}

                <StatCard
                  index={1}
                  label="Active Portfolio"
                  value={stats.metrics.activeProjects ?? 0}
                  subtext={`Across ${stats.metrics.activeClients ?? 0} active clients`}
                  icon={FolderKanban}
                  tone="default"
                />

                <StatCard
                  index={2}
                  label="Total Headcount"
                  value={stats.metrics.headcount ?? 0}
                  subtext="Active personnel"
                  icon={Users}
                  tone="default"
                />

                {(() => {
                  const pending = stats.metrics.pendingApprovals || 0;
                  return (
                    <StatCard
                      index={3}
                      label="Pending Approvals"
                      value={pending}
                      action={{ label: "Review leave queue →", href: "/leave" }}
                      icon={Clock}
                      tone={pending > 0 ? 'attention' : 'default'}
                    />
                  );
                })()}
              </div>

              {/* Chart & Recent Audit Strip */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">Cashflow Overview</h3>
                      <p className="text-[11px] text-slate-400 mt-0.5">Real-time revenue, collections, and net agency margin</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[11px]">
                      <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-blue-600 inline-block"></span> Invoiced</span>
                      <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-600 inline-block"></span> Collected</span>
                      <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-rose-600 inline-block"></span> Expenses</span>
                      <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-teal-600 inline-block"></span> Net Margin</span>
                    </div>
                  </div>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={[
                          { name: 'Invoiced', amount: parseFloat(stats.metrics.totalInvoiced) },
                          { name: 'Collected', amount: parseFloat(stats.metrics.totalCollected) },
                          { name: 'Expenses', amount: parseFloat(stats.metrics.totalExpenses) },
                          { name: 'Net Margin', amount: parseFloat(stats.metrics.netRevenue) },
                        ]}
                        margin={{ top: 10, right: 10, left: 15, bottom: 20 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} dy={5} />
                        <YAxis
                          stroke="#64748b"
                          fontSize={11}
                          tickLine={false}
                          axisLine={{ stroke: '#e2e8f0' }}
                          tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#ffffff',
                            borderRadius: '8px',
                            border: '1px solid #e2e8f0',
                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                            fontSize: '12px',
                          }}
                          formatter={(value: any) => [`$${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 'Amount']}
                        />
                        <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                          {[
                            { name: 'Invoiced' },
                            { name: 'Collected' },
                            { name: 'Expenses' },
                            { name: 'Net Margin' },
                          ].map((_, index) => (
                            <Cell key={`cashflow-cell-${index}`} fill={CASHFLOW_COLORS[index]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Recent Compliance Audit Log</h3>
                    <Link to="/audit" className="text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline">
                      View all &rarr;
                    </Link>
                  </div>
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {(stats.recentAudit || []).map((log: any) => (
                      <div key={log.id} className="py-2.5 text-xs flex items-center justify-between">
                        <div>
                          <span className="font-mono font-semibold text-slate-900 dark:text-white">{log.action}</span>
                          <span className="text-slate-400 ml-2">by {log.actor?.name || 'System'}</span>
                        </div>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ==========================================
              2. HR MANAGER DASHBOARD
              ========================================== */}
          {user.role === 'HR_MANAGER' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <StatCard
                  index={0}
                  label="Headcount"
                  value={stats.metrics.totalHeadcount ?? 0}
                  subtext="Active personnel"
                  icon={Users}
                  tone="default"
                />

                {(() => {
                  const total = stats.metrics.totalHeadcount || 1;
                  const present = stats.metrics.todayPresent || 0;
                  const presentRate = Math.min(100, Math.round((present / Math.max(total, 1)) * 100));
                  return (
                    <StatCard
                      index={1}
                      label="Present Today"
                      value={present}
                      subtext="On-site & remote shifts"
                      icon={UserCheck}
                      ringPercentage={presentRate}
                      tone="default"
                    />
                  );
                })()}

                {(() => {
                  const late = stats.metrics.todayLate || 0;
                  return (
                    <StatCard
                      index={2}
                      label="Late Arrivals"
                      value={late}
                      subtext="Past grace threshold"
                      icon={AlertTriangle}
                      tone={late > 0 ? 'danger' : 'default'}
                    />
                  );
                })()}

                {(() => {
                  const pendingLeaves = stats.metrics.pendingLeaveRequests || 0;
                  return (
                    <StatCard
                      index={3}
                      label="Pending Leaves"
                      value={pendingLeaves}
                      action={{ label: "Action requests →", href: "/leave" }}
                      icon={Calendar}
                      tone={pendingLeaves > 0 ? 'attention' : 'default'}
                    />
                  );
                })()}
              </div>

              {/* Department breakdown chart */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 shadow-sm">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">Department Headcount</h3>
                <div className="h-60">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.departments} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} dy={5} />
                      <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#ffffff',
                          borderRadius: '8px',
                          border: '1px solid #e2e8f0',
                          fontSize: '12px',
                        }}
                      />
                      <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                        {(stats.departments || []).map((_: any, index: number) => (
                          <Cell key={`dept-cell-${index}`} fill={DEPT_COLORS[index % DEPT_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* ==========================================
              3. PROJECT MANAGER DASHBOARD
              ========================================== */}
          {user.role === 'PROJECT_MANAGER' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <StatCard
                  index={0}
                  label="Projects Managed"
                  value={stats.metrics.managedProjectsCount ?? 0}
                  subtext="Under active management"
                  icon={FolderKanban}
                  tone="default"
                />

                {(() => {
                  const done = stats.metrics.completedTasks ?? 0;
                  const total = stats.metrics.totalTasks ?? 0;
                  const rate = stats.metrics.completionRate ?? (total > 0 ? Math.round((done / total) * 100) : 0);
                  return (
                    <StatCard
                      index={1}
                      label="Task Completion"
                      value={`${done} / ${total}`}
                      subtext="Sprint deliverable velocity"
                      icon={CheckCircle2}
                      ringPercentage={rate}
                      tone="default"
                    />
                  );
                })()}

                <StatCard
                  index={2}
                  label="Total Tasks"
                  value={stats.metrics.totalTasks ?? 0}
                  subtext="Assigned & tracked items"
                  icon={ListTodo}
                  tone="default"
                />

                {(() => {
                  const overdue = stats.metrics.overdueTasks || 0;
                  return (
                    <StatCard
                      index={3}
                      label="Overdue Tasks"
                      value={overdue}
                      subtext="Require immediate action"
                      icon={AlertTriangle}
                      tone={overdue > 0 ? 'danger' : 'default'}
                    />
                  );
                })()}
              </div>

              {/* Projects List */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Active Projects Portfolio</h3>
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {(stats.projects || []).map((proj: any) => (
                    <div key={proj.id} className="py-3 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-slate-900 dark:text-white text-sm">{proj.name}</span>
                        <div className="text-slate-400 mt-0.5">Client: {proj.client}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-semibold">{proj.progress}%</span>
                        <div className="w-24 bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                          <div className="bg-slate-900 dark:bg-white h-full" style={{ width: `${proj.progress}%` }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ==========================================
              4. FINANCE MANAGER DASHBOARD
              ========================================== */}
          {user.role === 'FINANCE_MANAGER' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {(() => {
                  const totalInvoiced = parseFloat(stats.metrics.totalInvoiced) || 0;
                  const totalCollected = parseFloat(stats.metrics.totalCollected) || 0;
                  const finCollectedRate = Math.min(100, Math.round((totalCollected / Math.max(totalInvoiced, 1)) * 100));
                  const totalOutstanding = parseFloat(stats.metrics.totalOutstanding) || 0;
                  const totalExpenses = parseFloat(stats.metrics.totalExpenses) || 0;

                  return (
                    <>
                      <StatCard
                        index={0}
                        label="Total Invoiced"
                        value={formatCurrency(totalInvoiced)}
                        subtext="Cumulative issued billings"
                        icon={Receipt}
                        tone="default"
                      />

                      <StatCard
                        index={1}
                        label="Collected"
                        value={formatCurrency(totalCollected)}
                        subtext="Cash deposited in bank"
                        icon={CircleDollarSign}
                        ringPercentage={finCollectedRate}
                        tone="default"
                      />

                      <StatCard
                        index={2}
                        label="Outstanding"
                        value={formatCurrency(totalOutstanding)}
                        subtext="Awaiting client settlement"
                        icon={Hourglass}
                        tone={totalOutstanding > 0 ? 'attention' : 'default'}
                      />

                      <StatCard
                        index={3}
                        label="Expenses"
                        value={formatCurrency(totalExpenses)}
                        subtext="Operational disbursements"
                        icon={CreditCard}
                        tone="default"
                      />
                    </>
                  );
                })()}
              </div>

              {/* Expense Category Breakdown Chart */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 shadow-sm">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">Expense Distribution by Category</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.expenseBreakdown} margin={{ top: 10, right: 10, left: 15, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="category" stroke="#64748b" fontSize={11} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} dy={5} />
                      <YAxis
                        stroke="#64748b"
                        fontSize={11}
                        tickLine={false}
                        axisLine={{ stroke: '#e2e8f0' }}
                        tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#ffffff',
                          borderRadius: '8px',
                          border: '1px solid #e2e8f0',
                          fontSize: '12px',
                        }}
                        formatter={(value: any) => [`$${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 'Expense Total']}
                      />
                      <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                        {(stats.expenseBreakdown || []).map((_: any, index: number) => (
                          <Cell key={`expense-cell-${index}`} fill={EXPENSE_COLORS[index % EXPENSE_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* ==========================================
              5. INVENTORY MANAGER DASHBOARD
              ========================================== */}
          {user.role === 'INVENTORY_MANAGER' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <StatCard
                  index={0}
                  label="Total Hardware"
                  value={stats.metrics.totalHardwareAssets ?? 0}
                  subtext="Physical fleet assets"
                  icon={Laptop}
                  tone="default"
                />

                <StatCard
                  index={1}
                  label="Available"
                  value={stats.metrics.availableAssets ?? 0}
                  subtext="Ready for deployment"
                  icon={CheckCircle2}
                  tone="default"
                />

                {(() => {
                  const total = stats.metrics.totalHardwareAssets || 1;
                  const assigned = stats.metrics.assignedAssets || 0;
                  const assignedRate = Math.min(100, Math.round((assigned / Math.max(total, 1)) * 100));
                  return (
                    <StatCard
                      index={2}
                      label="Assigned"
                      value={assigned}
                      subtext="In custody of personnel"
                      icon={UserCheck}
                      ringPercentage={assignedRate}
                      tone="default"
                    />
                  );
                })()}

                {(() => {
                  const lowStock = stats.metrics.lowStockAlerts || 0;
                  return (
                    <StatCard
                      index={3}
                      label="Low Stock SKUs"
                      value={lowStock}
                      subtext="Require replenishment"
                      icon={Boxes}
                      tone={lowStock > 0 ? 'danger' : 'default'}
                    />
                  );
                })()}
              </div>

              {stats.lowStockItems?.length > 0 && (
                <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 rounded-xl p-4 sm:p-5">
                  <h3 className="text-sm font-bold text-rose-800 dark:text-rose-400 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" /> Consumable Stock Replenishment Warnings
                  </h3>
                  <div className="mt-3 divide-y divide-rose-200/60 dark:divide-rose-900/40 text-xs">
                    {(stats.lowStockItems || []).map((item: any) => (
                      <div key={item.id} className="py-2 flex items-center justify-between">
                        <span className="font-semibold text-rose-900 dark:text-rose-300">{item.name}</span>
                        <span className="font-mono text-rose-700 dark:text-rose-400 font-bold">
                          {item.inStock} left (Min: {item.min})
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ==========================================
              6. EMPLOYEE PORTAL
              ========================================== */}
          {user.role === 'EMPLOYEE' && (
            <div className="space-y-6">
              {/* Daily Shift & Punch Status */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-teal-50 dark:bg-teal-950/40 border border-teal-100 dark:border-teal-800/40 text-teal-600 dark:text-teal-400 shrink-0">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs uppercase tracking-wider font-semibold text-slate-400">Today's Attendance</span>
                    <div className="text-sm sm:text-base font-bold text-slate-900 dark:text-white mt-1">
                      {stats.todayAttendance.checkedIn ? (
                        stats.todayAttendance.checkOutTime ? (
                          <span className="text-emerald-600 dark:text-emerald-400">
                            Shift Completed ({stats.todayAttendance.workingHours} hrs logged)
                          </span>
                        ) : (
                          <span className="text-amber-600 dark:text-amber-400">
                            Checked In & Working (Started at {new Date(stats.todayAttendance.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                          </span>
                        )
                      ) : (
                        <span className="text-slate-500">Not checked in yet today</span>
                      )}
                    </div>
                  </div>
                </div>

                <Link
                  to="/attendance"
                  className="w-full sm:w-auto text-center px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition-colors"
                >
                  Go to Punch Card &rarr;
                </Link>
              </div>

              {/* Leave Balances Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                {(stats.leaves || []).map((l: any, idx: number) => {
                  const getLeaveIcon = (type: string) => {
                    const lower = (type || '').toLowerCase();
                    if (lower.includes('sick')) return HeartPulse;
                    if (lower.includes('annual')) return Calendar;
                    return Coffee;
                  };
                  const Icon = getLeaveIcon(l.type);
                  const allowance = Math.max(l.allowance || 1, 1);
                  const remaining = Math.max(l.remaining || 0, 0);
                  const remainingRate = Math.min(100, Math.round((remaining / allowance) * 100));

                  return (
                    <StatCard
                      key={l.type}
                      index={idx}
                      label={`${l.type} Leave`}
                      value={`${remaining}d`}
                      subtext={`${l.used} used of ${l.allowance} allowance`}
                      icon={Icon}
                      ringPercentage={remainingRate}
                      tone="default"
                    />
                  );
                })}
              </div>

              {/* Assigned Tasks Due Soon */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Active Deliverables Due</h3>
                  <Link to="/tasks" className="text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline">
                    View all tasks &rarr;
                  </Link>
                </div>

                {(!stats.activeTasks || stats.activeTasks.length === 0) ? (
                  <div className="p-4 text-center text-xs text-slate-400">No pending tasks assigned to you right now.</div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {(stats.activeTasks || []).map((t: any) => (
                      <div key={t.id} className="py-2.5 flex items-center justify-between text-xs">
                        <div>
                          <span className="font-semibold text-slate-900 dark:text-white">{t.title}</span>
                          <span className="text-slate-400 ml-2">({t.projectName})</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-slate-400 font-mono">
                            Due: {new Date(t.dueDate).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
