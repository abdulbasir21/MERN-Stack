import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/useAuth';
import { Avatar } from '../components/shared/Avatar';
import {
  FolderKanban,
  Plus,
  Calendar,
  DollarSign,
  Users,
  CheckCircle2,
  Clock,
  X,
  AlertCircle,
  Building2,
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const ProjectsPage: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  // New Project Form State
  const [projectName, setProjectName] = useState('');
  const [clientId, setClientId] = useState('');
  const [managerId, setManagerId] = useState('');
  const [budget, setBudget] = useState('50000');
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [deadline, setDeadline] = useState(
    () => new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [description, setDescription] = useState('');
  const [projectError, setProjectError] = useState<string | null>(null);

  // New Client Form State
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientCompany, setClientCompany] = useState('');
  const [clientError, setClientError] = useState<string | null>(null);

  // New Milestone Form State
  const [milestoneTitle, setMilestoneTitle] = useState('');
  const [milestoneDueDate, setMilestoneDueDate] = useState('');

  // 1. Fetch Projects
  const { data: projectsData, isLoading: isProjectsLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/projects`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load projects');
      return res.json();
    },
  });

  // 2. Fetch Clients
  const { data: clientsData } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/clients`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load clients');
      return res.json();
    },
    enabled: user?.role === 'OWNER' || user?.role === 'PROJECT_MANAGER' || user?.role === 'FINANCE_MANAGER',
  });

  // 3. Fetch Staff for Managers dropdown
  const { data: staffData } = useQuery({
    queryKey: ['staff-managers'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/users`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load staff');
      return res.json();
    },
    enabled: user?.role === 'OWNER' || user?.role === 'PROJECT_MANAGER',
  });

  // Create Client Mutation
  const createClientMutation = useMutation({
    mutationFn: async () => {
      setClientError(null);
      const res = await fetch(`${API_BASE}/clients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: clientName,
          email: clientEmail,
          company: clientCompany || undefined,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message || 'Failed to create client');
      return body;
    },
    onSuccess: () => {
      setIsClientModalOpen(false);
      setClientName('');
      setClientEmail('');
      setClientCompany('');
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
    onError: (err: unknown) => {
      setClientError(err instanceof Error ? err.message : 'Error creating client');
    },
  });

  // Create Project Mutation
  const createProjectMutation = useMutation({
    mutationFn: async () => {
      setProjectError(null);
      const res = await fetch(`${API_BASE}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: projectName,
          clientId,
          managerId,
          budget: parseFloat(budget),
          startDate: new Date(startDate).toISOString(),
          deadline: new Date(deadline).toISOString(),
          description: description || undefined,
          status: 'PLANNING',
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message || 'Failed to create project');
      return body;
    },
    onSuccess: () => {
      setIsProjectModalOpen(false);
      setProjectName('');
      setDescription('');
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
    onError: (err: unknown) => {
      setProjectError(err instanceof Error ? err.message : 'Error creating project');
    },
  });

  // Create Milestone Mutation
  const createMilestoneMutation = useMutation({
    mutationFn: async (pId: string) => {
      const res = await fetch(`${API_BASE}/projects/${pId}/milestones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: milestoneTitle,
          dueDate: new Date(milestoneDueDate).toISOString(),
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message || 'Failed to add milestone');
      return body;
    },
    onSuccess: () => {
      setMilestoneTitle('');
      setMilestoneDueDate('');
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  // Toggle Milestone Status Mutation
  const toggleMilestoneMutation = useMutation({
    mutationFn: async ({
      projectId,
      milestoneId,
      status,
    }: {
      projectId: string;
      milestoneId: string;
      status: 'PENDING' | 'DONE';
    }) => {
      const res = await fetch(`${API_BASE}/projects/${projectId}/milestones/${milestoneId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('Failed to update milestone');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  const canManageProjects = user?.role === 'OWNER' || user?.role === 'PROJECT_MANAGER';
  const projects = projectsData?.data?.projects || [];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white border border-outline-variant rounded-lg p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-ink">Project Portfolio &amp; Deliverables</h1>
          <p className="text-xs text-ink-muted mt-0.5">
            Active client initiatives, team allocations, milestones, and deliverable tracking.
          </p>
        </div>

        {canManageProjects && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsClientModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded border border-outline-variant hover:bg-[#F8F8F5] text-ink text-xs font-semibold transition-colors"
            >
              <Building2 className="w-4 h-4 text-primary" />
              <span>+ Add Client</span>
            </button>

            <button
              onClick={() => setIsProjectModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded bg-primary-container hover:bg-primary-hover text-white text-xs font-semibold transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>+ New Project</span>
            </button>
          </div>
        )}
      </div>

      {/* Projects Grid */}
      {isProjectsLoading ? (
        <div className="text-center py-12 text-xs text-ink-muted">Loading project portfolio...</div>
      ) : projects.length === 0 ? (
        <div className="bg-white border border-outline-variant rounded-lg p-12 text-center shadow-sm">
          <FolderKanban className="w-10 h-10 text-primary mx-auto mb-3 opacity-60" />
          <h3 className="text-sm font-semibold text-ink">No projects found</h3>
          <p className="text-xs text-ink-muted mt-1 max-w-sm mx-auto">
            {user?.role === 'EMPLOYEE'
              ? 'You are not currently assigned to any active project teams.'
              : 'Create a client and initialize your agency’s first project to get started.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {projects.map(
            (p: {
              id: string;
              name: string;
              description: string | null;
              budget: string;
              status: string;
              startDate: string;
              deadline: string;
              client: { name: string; company: string | null };
              manager: { id: string; name: string };
              members: Array<{ id: string; role: string | null; user: { id: string; name: string; avatarUrl: string | null } }>;
              milestones: Array<{ id: string; title: string; dueDate: string; status: 'PENDING' | 'DONE' }>;
            }) => {
              const isManagerOfProject = user?.role === 'OWNER' || p.manager.id === user?.id;
              const completedMilestones = p.milestones.filter((m) => m.status === 'DONE').length;
              const progressPercent =
                p.milestones.length > 0 ? Math.round((completedMilestones / p.milestones.length) * 100) : 0;

              return (
                <div
                  key={p.id}
                  className="bg-white border border-outline-variant rounded-lg p-5 shadow-sm flex flex-col justify-between"
                >
                  <div>
                    {/* Project Header */}
                    <div className="flex items-start justify-between gap-3 pb-3 border-b border-outline-variant">
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-base font-bold text-ink">{p.name}</h2>
                          <span className="px-2 py-0.5 rounded bg-surface-low text-primary text-[10px] font-semibold uppercase">
                            {p.status}
                          </span>
                        </div>
                        <p className="text-xs text-ink-muted mt-0.5">
                          Client: <strong className="text-ink">{p.client.company || p.client.name}</strong> • Manager: {p.manager.name}
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="text-sm font-bold text-ink tabular-nums flex items-center justify-end">
                          <DollarSign className="w-3.5 h-3.5 text-primary" />
                          {Number(p.budget).toLocaleString()}
                        </span>
                        <span className="text-[10px] text-ink-muted">Contract Budget</span>
                      </div>
                    </div>

                    {p.description && <p className="text-xs text-ink-muted my-3">{p.description}</p>}

                    {/* Progress Bar (Milestones derived) */}
                    <div className="my-3">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-[11px] font-medium text-ink-muted">Milestone Completion</span>
                        <span className="font-semibold text-primary tabular-nums">{progressPercent}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-surface-high rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary-container rounded-full transition-all"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    </div>

                    {/* Dates & Team Roster */}
                    <div className="grid grid-cols-2 gap-4 py-2 text-xs">
                      <div className="flex items-center gap-2 text-ink-muted">
                        <Calendar className="w-3.5 h-3.5 text-primary" />
                        <span>Due: {new Date(p.deadline).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-2 text-ink-muted">
                        <Users className="w-3.5 h-3.5 text-primary" />
                        <span>{p.members.length} Team Members</span>
                      </div>
                    </div>

                    {/* Team Member Avatars */}
                    <div className="flex items-center gap-1.5 py-2">
                      {p.members.slice(0, 5).map((m) => (
                        <div key={m.id} title={`${m.user.name} (${m.role || 'Member'})`}>
                          <Avatar name={m.user.name} avatarUrl={m.user.avatarUrl} size="sm" />
                        </div>
                      ))}
                      {p.members.length > 5 && (
                        <span className="text-[10px] text-ink-muted font-semibold ml-1">
                          +{p.members.length - 5}
                        </span>
                      )}
                    </div>

                    {/* Milestones Checklist */}
                    <div className="mt-3 pt-3 border-t border-outline-variant space-y-2">
                      <div className="flex items-center justify-between text-xs font-semibold text-ink">
                        <span>Milestones</span>
                        <span className="text-[11px] text-ink-muted font-normal">
                          {completedMilestones} of {p.milestones.length} Done
                        </span>
                      </div>

                      <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                        {p.milestones.map((m) => (
                          <div
                            key={m.id}
                            className="flex items-center justify-between p-2 rounded bg-[#F8F8F5] border border-outline-variant/60 text-xs"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <button
                                disabled={!isManagerOfProject}
                                onClick={() =>
                                  toggleMilestoneMutation.mutate({
                                    projectId: p.id,
                                    milestoneId: m.id,
                                    status: m.status === 'DONE' ? 'PENDING' : 'DONE',
                                  })
                                }
                                className={`shrink-0 ${
                                  isManagerOfProject ? 'cursor-pointer hover:opacity-80' : 'cursor-default'
                                }`}
                              >
                                {m.status === 'DONE' ? (
                                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                ) : (
                                  <Clock className="w-4 h-4 text-ink-muted" />
                                )}
                              </button>
                              <span
                                className={`truncate ${
                                  m.status === 'DONE' ? 'line-through text-ink-muted' : 'text-ink font-medium'
                                }`}
                              >
                                {m.title}
                              </span>
                            </div>
                            <span className="text-[10px] text-ink-muted shrink-0 tabular-nums">
                              {new Date(m.dueDate).toLocaleDateString()}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Add Milestone Form for Project Manager */}
                      {isManagerOfProject && (
                        <div className="pt-2 flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="New milestone..."
                            value={selectedProjectId === p.id ? milestoneTitle : ''}
                            onFocus={() => setSelectedProjectId(p.id)}
                            onChange={(e) => setMilestoneTitle(e.target.value)}
                            className="flex-1 h-7 px-2 rounded border border-outline-variant text-[11px] text-ink focus:outline-none focus:border-primary"
                          />
                          <input
                            type="date"
                            value={selectedProjectId === p.id ? milestoneDueDate : ''}
                            onFocus={() => setSelectedProjectId(p.id)}
                            onChange={(e) => setMilestoneDueDate(e.target.value)}
                            className="h-7 px-1.5 rounded border border-outline-variant text-[11px] text-ink focus:outline-none focus:border-primary"
                          />
                          <button
                            type="button"
                            disabled={!milestoneTitle || !milestoneDueDate}
                            onClick={() => createMilestoneMutation.mutate(p.id)}
                            className="h-7 px-2.5 rounded bg-primary-container text-white text-[11px] font-semibold hover:bg-primary-hover disabled:opacity-40"
                          >
                            Add
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            }
          )}
        </div>
      )}

      {/* Modal: Create Client */}
      {isClientModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-lg shadow-xl border border-outline-variant p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant">
              <h2 className="text-base font-bold text-ink">Add Agency Client</h2>
              <button onClick={() => setIsClientModalOpen(false)} className="text-ink-muted hover:text-ink">
                <X className="w-5 h-5" />
              </button>
            </div>

            {clientError && (
              <div className="p-3 rounded bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{clientError}</span>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createClientMutation.mutate();
              }}
              className="space-y-3"
            >
              <div>
                <label className="block text-xs font-medium text-ink-muted mb-1">Contact Name</label>
                <input
                  type="text"
                  required
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Sarah Jenkins"
                  className="w-full h-8 px-2.5 rounded border border-outline-variant text-xs text-ink focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-ink-muted mb-1">Billing Email</label>
                <input
                  type="email"
                  required
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  placeholder="sarah@client.corp"
                  className="w-full h-8 px-2.5 rounded border border-outline-variant text-xs text-ink focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-ink-muted mb-1">Company / Organization</label>
                <input
                  type="text"
                  value={clientCompany}
                  onChange={(e) => setClientCompany(e.target.value)}
                  placeholder="FinScale Technologies Ltd"
                  className="w-full h-8 px-2.5 rounded border border-outline-variant text-xs text-ink focus:outline-none focus:border-primary"
                />
              </div>

              <div className="pt-3 border-t border-outline-variant flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsClientModalOpen(false)}
                  className="px-3 py-1.5 rounded border border-outline-variant text-xs font-medium text-ink hover:bg-[#F8F8F5]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createClientMutation.isPending}
                  className="px-4 py-1.5 rounded bg-primary-container hover:bg-primary-hover text-white text-xs font-semibold disabled:opacity-50"
                >
                  {createClientMutation.isPending ? 'Saving...' : 'Save Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create Project */}
      {isProjectModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-lg shadow-xl border border-outline-variant p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant">
              <h2 className="text-base font-bold text-ink">Initialize New Agency Project</h2>
              <button onClick={() => setIsProjectModalOpen(false)} className="text-ink-muted hover:text-ink">
                <X className="w-5 h-5" />
              </button>
            </div>

            {projectError && (
              <div className="p-3 rounded bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{projectError}</span>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createProjectMutation.mutate();
              }}
              className="space-y-3"
            >
              <div>
                <label className="block text-xs font-medium text-ink-muted mb-1">Project Name</label>
                <input
                  type="text"
                  required
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="FinScale Banking Dashboard v2"
                  className="w-full h-8 px-2.5 rounded border border-outline-variant text-xs text-ink focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-ink-muted mb-1">Client</label>
                  <select
                    required
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    className="w-full h-8 px-2.5 rounded border border-outline-variant text-xs text-ink focus:outline-none focus:border-primary"
                  >
                    <option value="">Select Client</option>
                    {clientsData?.data?.clients?.map((c: { id: string; name: string; company: string | null }) => (
                      <option key={c.id} value={c.id}>
                        {c.company ? `${c.company} (${c.name})` : c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-ink-muted mb-1">Assigned Manager</label>
                  <select
                    required
                    value={managerId}
                    onChange={(e) => setManagerId(e.target.value)}
                    className="w-full h-8 px-2.5 rounded border border-outline-variant text-xs text-ink focus:outline-none focus:border-primary"
                  >
                    <option value="">Select Project Manager</option>
                    {staffData?.data
                      ?.filter((u: { role: string }) => u.role === 'PROJECT_MANAGER' || u.role === 'OWNER')
                      ?.map((u: { id: string; name: string; role: string }) => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.role.replace('_', ' ')})
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-ink-muted mb-1">Budget ($)</label>
                  <input
                    type="number"
                    required
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    className="w-full h-8 px-2.5 rounded border border-outline-variant text-xs text-ink focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-ink-muted mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full h-8 px-2 rounded border border-outline-variant text-xs text-ink focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-ink-muted mb-1">Deadline</label>
                  <input
                    type="date"
                    required
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full h-8 px-2 rounded border border-outline-variant text-xs text-ink focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-ink-muted mb-1">Description / Scope Summary</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Key deliverables, tech constraints, and architectural milestones..."
                  className="w-full p-2 rounded border border-outline-variant text-xs text-ink focus:outline-none focus:border-primary"
                />
              </div>

              <div className="pt-3 border-t border-outline-variant flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsProjectModalOpen(false)}
                  className="px-3 py-1.5 rounded border border-outline-variant text-xs font-medium text-ink hover:bg-[#F8F8F5]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createProjectMutation.isPending}
                  className="px-4 py-1.5 rounded bg-primary-container hover:bg-primary-hover text-white text-xs font-semibold disabled:opacity-50"
                >
                  {createProjectMutation.isPending ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
