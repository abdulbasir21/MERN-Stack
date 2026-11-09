import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/useAuth';
import {
  TrendingUp,
  Plus,
  FileText,
  X,
  Receipt,
  CircleDollarSign,
  Hourglass,
  CreditCard,
} from 'lucide-react';
import { API_BASE } from '../lib/api';

export const FinancePage: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const isFinanceOrOwner = user?.role === 'FINANCE_MANAGER' || user?.role === 'OWNER';

  const [activeTab, setActiveTab] = useState<'invoices' | 'expenses' | 'profitability'>('invoices');

  // Modal States
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [paymentModalInvoice, setPaymentModalInvoice] = useState<any | null>(null);

  // New Invoice Form
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [clientId, setClientId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [subtotal, setSubtotal] = useState('');
  const [tax, setTax] = useState('0.00');
  const [total, setTotal] = useState('');
  const [issueDate, setIssueDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(() => new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]);
  const [invoiceNotes, setInvoiceNotes] = useState('');
  const [invoiceError, setInvoiceError] = useState<string | null>(null);

  // New Expense Form
  const [expenseProjectId, setExpenseProjectId] = useState('');
  const [category, setCategory] = useState('SOFTWARE');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseDesc, setExpenseDesc] = useState('');
  const [expenseDate, setExpenseDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [expenseError, setExpenseError] = useState<string | null>(null);

  // Record Payment Form
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState('BANK_TRANSFER');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // 1. Fetch Summary
  const { data: summaryData } = useQuery({
    queryKey: ['finance', 'summary'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/finance/reports/summary`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load financial summary');
      return res.json();
    },
    enabled: isFinanceOrOwner,
  });

  // 2. Fetch Invoices
  const { data: invoicesData, isLoading: isInvoicesLoading } = useQuery({
    queryKey: ['finance', 'invoices'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/finance/invoices`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load invoices');
      return res.json();
    },
    enabled: isFinanceOrOwner,
  });

  // 3. Fetch Expenses
  const { data: expensesData, isLoading: isExpensesLoading } = useQuery({
    queryKey: ['finance', 'expenses'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/finance/expenses`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load expenses');
      return res.json();
    },
    enabled: isFinanceOrOwner,
  });

  // 4. Fetch Clients & Projects for dropdowns
  const { data: clientsData } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/clients`, { credentials: 'include' });
      if (!res.ok) return { data: [] };
      return res.json();
    },
    enabled: isFinanceOrOwner,
  });

  const { data: projectsData } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/projects`, { credentials: 'include' });
      if (!res.ok) return { data: [] };
      return res.json();
    },
  });

  // Create Invoice Mutation
  const createInvoiceMutation = useMutation({
    mutationFn: async () => {
      setInvoiceError(null);
      const res = await fetch(`${API_BASE}/finance/invoices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          invoiceNumber,
          clientId,
          projectId: projectId || undefined,
          subtotal,
          tax: tax || '0.00',
          total: total || subtotal,
          issueDate,
          dueDate,
          notes: invoiceNotes || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Failed to create invoice');
      return data;
    },
    onSuccess: () => {
      setIsInvoiceModalOpen(false);
      setInvoiceNumber('');
      setSubtotal('');
      setTax('0.00');
      setTotal('');
      setInvoiceNotes('');
      queryClient.invalidateQueries({ queryKey: ['finance'] });
    },
    onError: (err: any) => {
      setInvoiceError(err.message);
    },
  });

  // Create Expense Mutation
  const createExpenseMutation = useMutation({
    mutationFn: async () => {
      setExpenseError(null);
      const res = await fetch(`${API_BASE}/finance/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          projectId: expenseProjectId || undefined,
          category,
          amount: expenseAmount,
          description: expenseDesc,
          date: expenseDate,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Failed to create expense');
      return data;
    },
    onSuccess: () => {
      setIsExpenseModalOpen(false);
      setExpenseAmount('');
      setExpenseDesc('');
      queryClient.invalidateQueries({ queryKey: ['finance'] });
    },
    onError: (err: any) => {
      setExpenseError(err.message);
    },
  });

  // Update Status Mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch(`${API_BASE}/finance/invoices/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Status update failed');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance'] });
    },
  });

  // Record Payment Mutation
  const recordPaymentMutation = useMutation({
    mutationFn: async () => {
      setPaymentError(null);
      const res = await fetch(`${API_BASE}/finance/invoices/${paymentModalInvoice.id}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          amount: paymentAmount,
          date: paymentDate,
          method: paymentMethod,
          reference: paymentReference || undefined,
          notes: paymentNotes || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Failed to record payment');
      return data;
    },
    onSuccess: () => {
      setPaymentModalInvoice(null);
      setPaymentAmount('');
      setPaymentReference('');
      setPaymentNotes('');
      queryClient.invalidateQueries({ queryKey: ['finance'] });
    },
    onError: (err: any) => {
      setPaymentError(err.message);
    },
  });

  const summary = summaryData?.data || {
    totalInvoiced: '0.00',
    totalCollected: '0.00',
    totalOutstanding: '0.00',
    totalExpenses: '0.00',
    netRevenue: '0.00',
  };

  const invoices = invoicesData?.data || [];
  const expenses = expensesData?.data || [];
  const clients = clientsData?.data || [];
  const projects = projectsData?.data || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Financial Ledger</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Enterprise invoicing, payment collections, project expenses and real-time profitability.
          </p>
        </div>

        {isFinanceOrOwner && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsExpenseModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              <Receipt className="w-4 h-4" /> Record Expense
            </button>
            <button
              onClick={() => setIsInvoiceModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 rounded-lg shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" /> Create Invoice
            </button>
          </div>
        )}
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider uppercase text-slate-400">Total Invoiced</span>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-800/40 text-blue-600 dark:text-blue-400">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold font-mono text-slate-900 dark:text-white mt-2">
            ${parseFloat(summary.totalInvoiced).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-slate-400 block mt-2">All issued billings</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider uppercase text-emerald-600 dark:text-emerald-400">
              Collected
            </span>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-800/40 text-emerald-600 dark:text-emerald-400">
              <CircleDollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-2">
            ${parseFloat(summary.totalCollected).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-slate-400 block mt-2">Deposited in bank</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider uppercase text-amber-500">
              Outstanding
            </span>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-800/40 text-amber-600 dark:text-amber-400">
              <Hourglass className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold font-mono text-amber-500 mt-2">
            ${parseFloat(summary.totalOutstanding).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-slate-400 block mt-2">Awaiting client payment</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider uppercase text-rose-500">
              Total Expenses
            </span>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-800/40 text-rose-600 dark:text-rose-400">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold font-mono text-rose-500 mt-2">
            ${parseFloat(summary.totalExpenses).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-slate-400 block mt-2">Operations & purchases</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider uppercase text-slate-400">Net Margin</span>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-teal-50 dark:bg-teal-950/40 border border-teal-100 dark:border-teal-800/40 text-teal-600 dark:text-teal-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div
            className={`text-xl font-bold font-mono mt-2 ${
              parseFloat(summary.netRevenue) >= 0 ? 'text-teal-600 dark:text-teal-400' : 'text-rose-600'
            }`}
          >
            ${parseFloat(summary.netRevenue).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-slate-400 block mt-2">Collected minus expenses</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-800 flex items-center gap-6 text-sm font-semibold">
        <button
          onClick={() => setActiveTab('invoices')}
          className={`pb-3 transition-colors border-b-2 flex items-center gap-2 ${
            activeTab === 'invoices'
              ? 'border-slate-900 text-slate-900 dark:border-white dark:text-white'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <FileText className="w-4 h-4" /> Invoices ({invoices.length})
        </button>
        <button
          onClick={() => setActiveTab('expenses')}
          className={`pb-3 transition-colors border-b-2 flex items-center gap-2 ${
            activeTab === 'expenses'
              ? 'border-slate-900 text-slate-900 dark:border-white dark:text-white'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Receipt className="w-4 h-4" /> Expenses ({expenses.length})
        </button>
        <button
          onClick={() => setActiveTab('profitability')}
          className={`pb-3 transition-colors border-b-2 flex items-center gap-2 ${
            activeTab === 'profitability'
              ? 'border-slate-900 text-slate-900 dark:border-white dark:text-white'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <TrendingUp className="w-4 h-4" /> Project Profitability
        </button>
      </div>

      {/* INVOICES TAB */}
      {activeTab === 'invoices' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
          {isInvoicesLoading ? (
            <div className="p-8 text-center text-sm text-slate-500">Loading invoices...</div>
          ) : invoices.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">No invoices recorded yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-xs font-semibold text-slate-500 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Invoice #</th>
                    <th className="px-4 py-3">Client</th>
                    <th className="px-4 py-3">Project</th>
                    <th className="px-4 py-3">Due Date</th>
                    <th className="px-4 py-3">Total</th>
                    <th className="px-4 py-3">Paid</th>
                    <th className="px-4 py-3">Outstanding</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {invoices.map((inv: any) => (
                    <tr key={inv.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="px-4 py-3 font-mono font-bold text-slate-900 dark:text-white">{inv.invoiceNumber}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900 dark:text-white">{inv.client?.name}</div>
                        <div className="text-xs text-slate-400">{inv.client?.company || inv.client?.email}</div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">{inv.project?.name || '-'}</td>
                      <td className="px-4 py-3 text-xs">{new Date(inv.dueDate).toLocaleDateString()}</td>
                      <td className="px-4 py-3 font-mono font-semibold">${parseFloat(inv.total).toFixed(2)}</td>
                      <td className="px-4 py-3 font-mono text-emerald-600 dark:text-emerald-400">
                        ${parseFloat(inv.paidAmount).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 font-mono text-amber-600 dark:text-amber-400 font-semibold">
                        ${parseFloat(inv.outstanding).toFixed(2)}
                      </td>
                      <td className="px-4 py-3">
                        {inv.derivedStatus === 'PAID' && (
                          <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400">
                            Paid
                          </span>
                        )}
                        {inv.derivedStatus === 'PARTIALLY_PAID' && (
                          <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-400">
                            Partially Paid
                          </span>
                        )}
                        {inv.derivedStatus === 'SENT' && (
                          <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400">
                            Sent
                          </span>
                        )}
                        {inv.derivedStatus === 'OVERDUE' && (
                          <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-400">
                            Overdue
                          </span>
                        )}
                        {inv.derivedStatus === 'DRAFT' && (
                          <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                            Draft
                          </span>
                        )}
                        {inv.derivedStatus === 'CANCELLED' && (
                          <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                            Cancelled
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {inv.status === 'DRAFT' && (
                            <button
                              onClick={() => updateStatusMutation.mutate({ id: inv.id, status: 'SENT' })}
                              className="px-2 py-1 text-xs font-medium text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded transition-colors"
                            >
                              Send
                            </button>
                          )}
                          {inv.derivedStatus !== 'PAID' && inv.status !== 'CANCELLED' && (
                            <button
                              onClick={() => {
                                setPaymentModalInvoice(inv);
                                setPaymentAmount(inv.outstanding);
                                setPaymentError(null);
                              }}
                              className="px-2.5 py-1 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded transition-colors"
                            >
                              Pay
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* EXPENSES TAB */}
      {activeTab === 'expenses' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
          {isExpensesLoading ? (
            <div className="p-8 text-center text-sm text-slate-500">Loading expenses...</div>
          ) : expenses.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">No expenses recorded yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-xs font-semibold text-slate-500 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Description</th>
                    <th className="px-4 py-3">Project</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Recorded By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {expenses.map((exp: any) => (
                    <tr key={exp.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="px-4 py-3 text-xs">{new Date(exp.date).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 text-xs font-semibold rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {exp.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{exp.description}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">{exp.project?.name || 'General Agency'}</td>
                      <td className="px-4 py-3 font-mono font-bold text-rose-600 dark:text-rose-400">
                        ${parseFloat(exp.amount).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">{exp.recordedBy?.name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* PROFITABILITY TAB */}
      {activeTab === 'profitability' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((proj: any) => (
            <div
              key={proj.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4"
            >
              <div>
                <span className="text-xs font-semibold text-slate-400">{proj.client?.name || 'Client Project'}</span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">{proj.name}</h3>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs pt-3 border-t border-slate-100 dark:border-slate-800">
                <div>
                  <span className="text-slate-400 block">Total Budget</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white text-sm">
                    ${parseFloat(proj.budget).toFixed(2)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Status</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">{proj.status}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE INVOICE MODAL */}
      {isInvoiceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Create Client Invoice</h3>
              <button
                onClick={() => setIsInvoiceModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {invoiceError && (
              <div className="p-3 text-xs bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 rounded-lg">
                {invoiceError}
              </div>
            )}

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Invoice Number</label>
                  <input
                    type="text"
                    placeholder="INV-2026-001"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Client</label>
                  <select
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  >
                    <option value="">-- Select Client --</option>
                    {clients.map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.company ? `(${c.company})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Project (Optional)
                </label>
                <select
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                >
                  <option value="">-- General / Non-Project Invoicing --</option>
                  {projects.map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Subtotal ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={subtotal}
                    onChange={(e) => {
                      setSubtotal(e.target.value);
                      const sub = parseFloat(e.target.value) || 0;
                      const t = parseFloat(tax) || 0;
                      setTotal((sub + t).toFixed(2));
                    }}
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Tax ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={tax}
                    onChange={(e) => {
                      setTax(e.target.value);
                      const sub = parseFloat(subtotal) || 0;
                      const t = parseFloat(e.target.value) || 0;
                      setTotal((sub + t).toFixed(2));
                    }}
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Total ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={total}
                    onChange={(e) => setTotal(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Issue Date</label>
                  <input
                    type="date"
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setIsInvoiceModalOpen(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => createInvoiceMutation.mutate()}
                disabled={createInvoiceMutation.isPending || !invoiceNumber || !clientId || !total}
                className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 rounded-lg shadow-sm transition-colors disabled:opacity-50"
              >
                {createInvoiceMutation.isPending ? 'Creating...' : 'Save Draft Invoice'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RECORD PAYMENT MODAL */}
      {paymentModalInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Record Invoice Payment</h3>
              <button
                onClick={() => setPaymentModalInvoice(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {paymentError && (
              <div className="p-3 text-xs bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 rounded-lg">
                {paymentError}
              </div>
            )}

            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">Invoice:</span>
                <span className="font-mono font-semibold text-slate-900 dark:text-white">
                  {paymentModalInvoice.invoiceNumber}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Total:</span>
                <span className="font-mono">${parseFloat(paymentModalInvoice.total).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Outstanding:</span>
                <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                  ${parseFloat(paymentModalInvoice.outstanding).toFixed(2)}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Payment Amount ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  max={paymentModalInvoice.outstanding}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Date</label>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  >
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="CREDIT_CARD">Credit Card</option>
                    <option value="CHECK">Check</option>
                    <option value="CASH">Cash</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Reference / Transaction ID
                </label>
                <input
                  type="text"
                  placeholder="e.g. TXN-893274"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setPaymentModalInvoice(null)}
                className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => recordPaymentMutation.mutate()}
                disabled={recordPaymentMutation.isPending || !paymentAmount || parseFloat(paymentAmount) <= 0}
                className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors disabled:opacity-50"
              >
                {recordPaymentMutation.isPending ? 'Processing...' : 'Record Payment (1 Tx)'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RECORD EXPENSE MODAL */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Record Agency Expense</h3>
              <button
                onClick={() => setIsExpenseModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {expenseError && (
              <div className="p-3 text-xs bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 rounded-lg">
                {expenseError}
              </div>
            )}

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  >
                    <option value="SOFTWARE">Software</option>
                    <option value="HARDWARE">Hardware</option>
                    <option value="CONTRACTOR">Contractor</option>
                    <option value="OFFICE">Office</option>
                    <option value="TRAVEL">Travel</option>
                    <option value="MARKETING">Marketing</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Amount ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={expenseAmount}
                    onChange={(e) => setExpenseAmount(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Project (Optional)
                </label>
                <select
                  value={expenseProjectId}
                  onChange={(e) => setExpenseProjectId(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                >
                  <option value="">-- General Agency Overhead --</option>
                  {projects.map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Description</label>
                <input
                  type="text"
                  placeholder="e.g. Figma team licenses, Cloud servers"
                  value={expenseDesc}
                  onChange={(e) => setExpenseDesc(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Date</label>
                <input
                  type="date"
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setIsExpenseModalOpen(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => createExpenseMutation.mutate()}
                disabled={createExpenseMutation.isPending || !expenseAmount || !expenseDesc}
                className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 rounded-lg shadow-sm transition-colors disabled:opacity-50"
              >
                {createExpenseMutation.isPending ? 'Saving...' : 'Record Expense'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
