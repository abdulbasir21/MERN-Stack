'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { apiClient, ApiError } from '@/lib/api';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge, BadgeVariant } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { X } from 'lucide-react';

interface ApplicationItem {
  id: string;
  name: string;
  slug: string;
  city: string;
  mainCategory: string;
  status: 'pending' | 'approved' | 'rejected' | 'blocked';
  submittedAt: string;
  rejectionReason?: string;
  owner?: {
    id: string;
    name: string;
    email: string;
    phone?: string;
  };
}

export default function PlatformAdminCompaniesPage() {
  const { logout, user } = useAuth();
  const [applications, setApplications] = useState<ApplicationItem[]>([]);
  const [selectedApp, setSelectedApp] = useState<ApplicationItem | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchApplications = useCallback(async () => {
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (statusFilter !== 'all') queryParams.append('status', statusFilter);
      if (searchQuery.trim()) queryParams.append('q', searchQuery.trim());

      const res = await apiClient<ApplicationItem[]>(`/admin/companies?${queryParams.toString()}`);
      setApplications(res.data);
      if (selectedApp) {
        const updated = res.data.find((a) => a.id === selectedApp.id);
        if (updated) setSelectedApp(updated);
      }
    } catch (err: any) {
      setFeedbackMessage({ type: 'error', text: err.message || 'Failed to load applications' });
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, searchQuery, selectedApp]);

  useEffect(() => {
    fetchApplications();
  }, [statusFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchApplications();
  };

  const handleApprove = async (companyId: string) => {
    setActionLoading(true);
    setFeedbackMessage(null);
    try {
      await apiClient(`/admin/companies/${companyId}/approve`, { method: 'POST' });
      setFeedbackMessage({ type: 'success', text: 'Company approved successfully.' });
      fetchApplications();
    } catch (err: any) {
      setFeedbackMessage({ type: 'error', text: err.message || 'Failed to approve company.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedApp) return;
    if (rejectReason.trim().length < 10) {
      setFeedbackMessage({ type: 'error', text: 'Rejection reason must be at least 10 characters.' });
      return;
    }

    setActionLoading(true);
    setFeedbackMessage(null);
    try {
      await apiClient(`/admin/companies/${selectedApp.id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason: rejectReason.trim() }),
      });
      setShowRejectModal(false);
      setRejectReason('');
      setFeedbackMessage({ type: 'success', text: 'Company application rejected with reason.' });
      fetchApplications();
    } catch (err: any) {
      setFeedbackMessage({ type: 'error', text: err.message || 'Failed to reject company.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleBlock = async () => {
    if (!selectedApp) return;
    setActionLoading(true);
    setFeedbackMessage(null);
    try {
      await apiClient(`/admin/companies/${selectedApp.id}/block`, {
        method: 'POST',
        body: JSON.stringify({ reason: 'Blocked by administrator.' }),
      });
      setShowBlockModal(false);
      setFeedbackMessage({ type: 'success', text: 'Company and associated account permanently blocked.' });
      fetchApplications();
    } catch (err: any) {
      setFeedbackMessage({ type: 'error', text: err.message || 'Failed to block company.' });
    } finally {
      setActionLoading(false);
    }
  };

  const badgeMap: Record<string, BadgeVariant> = {
    pending: 'pending',
    approved: 'accepted',
    rejected: 'rejected',
    blocked: 'blocked',
  };

  return (
    <RoleGuard allowedRoles={['platform_admin']}>
      <div className="min-h-screen bg-paper-canvas text-ink-primary flex flex-col">
        {/* Top Header */}
        <header className="border-b border-paper-border bg-paper-surface sticky top-0 z-20">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="font-serif text-lg font-bold text-ink-primary">QuotePilot</span>
              <span className="text-xs px-2 py-0.5 rounded bg-brand-teal-tint text-brand-teal font-medium">
                Platform Admin Console
              </span>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-xs text-ink-secondary">{user?.email}</span>
              <Button variant="ghost" size="sm" onClick={logout}>
                Log Out
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-6 py-8 flex-1 w-full">
          {/* Page Heading & Filters */}
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="font-serif text-2xl font-semibold text-ink-primary">
                Company Applications
              </h1>
              <p className="text-xs text-ink-secondary mt-0.5">
                Review submitted provider registrations, verify credentials, and manage marketplace access.
              </p>
            </div>

            {/* Search Box */}
            <form onSubmit={handleSearch} className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Search by company or city..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 px-3 bg-paper-surface border border-paper-border rounded-control text-xs text-ink-primary placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-brand-teal"
              />
              <Button type="submit" variant="secondary" size="sm">
                Filter
              </Button>
            </form>
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-2 border-b border-paper-border pb-3 mb-6">
            {(['pending', 'approved', 'rejected', 'blocked', 'all'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                className={`px-3 py-1.5 rounded-control text-xs font-medium capitalize transition-colors ${
                  statusFilter === tab
                    ? 'bg-brand-teal text-white shadow-sm'
                    : 'text-ink-secondary hover:text-ink-primary hover:bg-paper-sunken'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {feedbackMessage && (
            <div
              className={`mb-6 p-3.5 rounded-control text-xs flex items-center justify-between ${
                feedbackMessage.type === 'success'
                  ? 'bg-semantic-success-tint border border-semantic-success/20 text-semantic-success'
                  : 'bg-semantic-error-tint border border-semantic-error/20 text-semantic-error'
              }`}
            >
              <span>{feedbackMessage.text}</span>
              <button
                onClick={() => setFeedbackMessage(null)}
                className="p-1 hover:opacity-80 transition-opacity ml-4"
                title="Dismiss message"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Two-Column Grid: List (7 cols) + Detail Panel (5 cols) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Table / List */}
            <div className="lg:col-span-7">
              <Card variant="surface" className="p-0 overflow-hidden shadow-paper">
                {isLoading ? (
                  <div className="p-12 text-center text-xs text-ink-muted">
                    Loading applications...
                  </div>
                ) : applications.length === 0 ? (
                  <div className="p-12 text-center text-xs text-ink-muted">
                    No company applications found under "{statusFilter}".
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-paper-sunken border-b border-paper-border text-ink-secondary font-semibold uppercase tracking-wider text-[10px]">
                        <tr>
                          <th className="py-3 px-4">Company</th>
                          <th className="py-3 px-4">Category</th>
                          <th className="py-3 px-4">Location</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-paper-border">
                        {applications.map((app) => (
                          <tr
                            key={app.id}
                            onClick={() => setSelectedApp(app)}
                            className={`hover:bg-paper-sunken/60 cursor-pointer transition-colors ${
                              selectedApp?.id === app.id ? 'bg-brand-teal-tint/40' : ''
                            }`}
                          >
                            <td className="py-3.5 px-4">
                              <div className="font-semibold text-ink-primary">{app.name}</div>
                              <div className="text-[11px] text-ink-muted">{app.owner?.name}</div>
                            </td>
                            <td className="py-3.5 px-4 text-ink-secondary">{app.mainCategory}</td>
                            <td className="py-3.5 px-4 text-ink-secondary">{app.city}</td>
                            <td className="py-3.5 px-4">
                              <Badge variant={badgeMap[app.status] || 'default'}>
                                {app.status}
                              </Badge>
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedApp(app);
                                }}
                                className="text-brand-teal font-semibold hover:underline"
                              >
                                Review
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </div>

            {/* Right Review Panel */}
            <div className="lg:col-span-5">
              {selectedApp ? (
                <Card variant="surface" className="p-6 shadow-paper space-y-6 sticky top-24">
                  <div className="border-b border-paper-border pb-4 flex items-center justify-between">
                    <div>
                      <Badge variant={badgeMap[selectedApp.status] || 'default'} className="mb-2">
                        {selectedApp.status}
                      </Badge>
                      <h2 className="font-serif text-xl font-semibold text-ink-primary">
                        {selectedApp.name}
                      </h2>
                    </div>
                    <span className="text-[11px] text-ink-muted">
                      {new Date(selectedApp.submittedAt).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Company & Owner Details */}
                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between py-1 border-b border-paper-border/60">
                      <span className="text-ink-secondary">Primary Category:</span>
                      <span className="font-medium text-ink-primary">{selectedApp.mainCategory}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-paper-border/60">
                      <span className="text-ink-secondary">Operating City:</span>
                      <span className="font-medium text-ink-primary">{selectedApp.city}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-paper-border/60">
                      <span className="text-ink-secondary">Owner Contact:</span>
                      <span className="font-medium text-ink-primary">{selectedApp.owner?.name}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-paper-border/60">
                      <span className="text-ink-secondary">Email:</span>
                      <span className="font-medium text-ink-primary">{selectedApp.owner?.email}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-paper-border/60">
                      <span className="text-ink-secondary">Phone:</span>
                      <span className="font-medium text-ink-primary">{selectedApp.owner?.phone || '—'}</span>
                    </div>

                    {selectedApp.rejectionReason && (
                      <div className="p-3 bg-semantic-error-tint border border-semantic-error/20 rounded-control mt-2">
                        <span className="font-semibold text-semantic-error block mb-0.5">
                          Prior Rejection Feedback:
                        </span>
                        <p className="text-ink-primary">{selectedApp.rejectionReason}</p>
                      </div>
                    )}
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-4 border-t border-paper-border space-y-2.5">
                    {selectedApp.status === 'pending' && (
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          variant="primary"
                          size="md"
                          isLoading={actionLoading}
                          onClick={() => handleApprove(selectedApp.id)}
                        >
                          Approve Company
                        </Button>
                        <Button
                          variant="secondary"
                          size="md"
                          disabled={actionLoading}
                          onClick={() => setShowRejectModal(true)}
                        >
                          Reject with Reason
                        </Button>
                      </div>
                    )}

                    {selectedApp.status !== 'blocked' && (
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={actionLoading}
                        onClick={() => setShowBlockModal(true)}
                        className="w-full mt-2"
                      >
                        Block Company Permanently
                      </Button>
                    )}
                  </div>
                </Card>
              ) : (
                <Card variant="sunken" className="p-8 text-center text-xs text-ink-muted">
                  Select a company application from the list to inspect credentials and take action.
                </Card>
              )}
            </div>
          </div>
        </main>

        {/* Modal: Reject with Reason */}
        {showRejectModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-primary/30 backdrop-blur-sm p-4">
            <Card variant="surface" className="max-w-md w-full p-6 shadow-modal">
              <h3 className="font-serif text-lg font-semibold text-ink-primary mb-2">
                Reject Application with Specific Reason
              </h3>
              <p className="text-xs text-ink-secondary mb-4">
                The company admin will see this reason in their status desk and be invited to edit and resubmit.
              </p>

              <textarea
                rows={4}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Explain what is missing (e.g. invalid phone number, unrecognized legal name, or needs trade license)..."
                className="w-full p-3 bg-paper-surface border border-paper-border rounded-control text-xs text-ink-primary focus:outline-none focus:ring-2 focus:ring-brand-teal mb-2"
              />
              <div className="flex justify-between text-[11px] text-ink-muted mb-4">
                <span>Min. 10 characters</span>
                <span>{rejectReason.length} / 500</span>
              </div>

              <div className="flex items-center justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowRejectModal(false);
                    setRejectReason('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  isLoading={actionLoading}
                  onClick={handleReject}
                >
                  Confirm Rejection
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* Modal: Block Permanently */}
        {showBlockModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-primary/30 backdrop-blur-sm p-4">
            <Card variant="surface" className="max-w-md w-full p-6 shadow-modal border-semantic-error">
              <h3 className="font-serif text-lg font-semibold text-semantic-error mb-2">
                Block Company Permanently
              </h3>
              <p className="text-xs text-ink-secondary mb-4 leading-relaxed">
                This action is irreversible. The company will be barred from receiving inquiries, the owner account will be suspended, and the email address cannot register again.
              </p>

              <div className="flex items-center justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => setShowBlockModal(false)}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  isLoading={actionLoading}
                  onClick={handleBlock}
                >
                  Block Permanently
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </RoleGuard>
  );
}
