import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/useAuth';
import { Avatar } from '../components/shared/Avatar';
import {
  CheckSquare,
  Plus,
  Clock,
  AlertTriangle,
  MessageSquare,
  Send,
  X,
  AlertCircle,
} from 'lucide-react';
import { API_BASE } from '../lib/api';

export const TasksPage: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [activeTaskModal, setActiveTaskModal] = useState<any | null>(null);

  // New task form state
  const [projectId, setProjectId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('MEDIUM');
  const [dueDate, setDueDate] = useState(() => new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]);
  const [createError, setCreateError] = useState<string | null>(null);

  // Comment state
  const [commentText, setCommentText] = useState('');

  // 1. Fetch tasks
  const { data: tasksData, isLoading: isTasksLoading } = useQuery({
    queryKey: ['tasks', statusFilter, priorityFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (priorityFilter) params.append('priority', priorityFilter);

      const res = await fetch(`${API_BASE}/tasks?${params.toString()}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load tasks');
      return res.json();
    },
  });

  // 2. Fetch projects for creation dropdown
  const { data: projectsData } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/projects`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load projects');
      return res.json();
    },
    enabled: user?.role === 'OWNER' || user?.role === 'PROJECT_MANAGER',
  });

  // 3. Create Task Mutation
  const createTaskMutation = useMutation({
    mutationFn: async () => {
      setCreateError(null);
      const res = await fetch(`${API_BASE}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          projectId,
          title,
          description: description || undefined,
          assigneeId,
          priority,
          dueDate: new Date(dueDate).toISOString(),
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message || 'Failed to create task');
      return body;
    },
    onSuccess: () => {
      setIsCreateModalOpen(false);
      setTitle('');
      setDescription('');
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: (err: unknown) => {
      setCreateError(err instanceof Error ? err.message : 'Error creating task');
    },
  });

  // 4. Update Task Progress Mutation
  const updateProgressMutation = useMutation({
    mutationFn: async ({ taskId, progressPercent, status }: { taskId: string; progressPercent: number; status: string }) => {
      const res = await fetch(`${API_BASE}/tasks/${taskId}/progress`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ progressPercent, status }),
      });
      if (!res.ok) throw new Error('Failed to update progress');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      if (activeTaskModal) {
        queryClient.invalidateQueries({ queryKey: ['task', activeTaskModal.id] });
      }
    },
  });

  // 5. Add Comment Mutation
  const addCommentMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const res = await fetch(`${API_BASE}/tasks/${taskId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ content: commentText }),
      });
      if (!res.ok) throw new Error('Failed to add comment');
      return res.json();
    },
    onSuccess: (data) => {
      setCommentText('');
      if (activeTaskModal) {
        setActiveTaskModal({
          ...activeTaskModal,
          comments: [...(activeTaskModal.comments || []), data.data.comment],
        });
      }
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const canCreateTask = user?.role === 'OWNER' || user?.role === 'PROJECT_MANAGER';
  const tasks = tasksData?.data?.tasks || [];
  const selectedProject = projectsData?.data?.projects?.find((p: any) => p.id === projectId);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white border border-outline-variant rounded-lg p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-ink">Tasks &amp; Action Items</h1>
          <p className="text-xs text-ink-muted mt-0.5">
            Deliverable execution tracking, assigned milestones, progress updates, and activity comments.
          </p>
        </div>

        {canCreateTask && (
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded bg-primary-container hover:bg-primary-hover text-white text-xs font-semibold transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>+ Create Task</span>
          </button>
        )}
      </div>

      {/* Filter Strip */}
      <div className="bg-white border border-outline-variant rounded-lg p-4 shadow-sm flex items-center gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-8 px-2.5 rounded border border-outline-variant text-xs text-ink bg-white focus:outline-none focus:border-primary"
        >
          <option value="">All Statuses</option>
          <option value="TODO">To Do</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="DONE">Completed</option>
        </select>

        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="h-8 px-2.5 rounded border border-outline-variant text-xs text-ink bg-white focus:outline-none focus:border-primary"
        >
          <option value="">All Priorities</option>
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
          <option value="URGENT">Urgent</option>
        </select>
      </div>

      {/* Tasks List */}
      {isTasksLoading ? (
        <div className="text-center py-12 text-xs text-ink-muted">Loading assigned tasks...</div>
      ) : tasks.length === 0 ? (
        <div className="bg-white border border-outline-variant rounded-lg p-12 text-center shadow-sm">
          <CheckSquare className="w-10 h-10 text-primary mx-auto mb-3 opacity-60" />
          <h3 className="text-sm font-semibold text-ink">No tasks found</h3>
          <p className="text-xs text-ink-muted mt-1 max-w-sm mx-auto">
            {user?.role === 'EMPLOYEE'
              ? 'You have completed all active assignments!'
              : 'Create tasks on your active projects to assign team members.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tasks.map((t: any) => {
            const isAssignedToMe = t.assignee.id === user?.id;
            const isOverdue = new Date(t.dueDate) < new Date() && t.status !== 'DONE';

            return (
              <div
                key={t.id}
                onClick={() => setActiveTaskModal(t)}
                className={`bg-white border rounded-lg p-4 shadow-sm hover:border-primary cursor-pointer transition-all flex flex-col justify-between ${
                  isOverdue ? 'border-red-300' : 'border-outline-variant'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] font-semibold text-primary uppercase truncate max-w-[150px]">
                      {t.project.name}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                        t.priority === 'URGENT'
                          ? 'bg-red-50 text-red-700'
                          : t.priority === 'HIGH'
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-surface-low text-ink-muted'
                      }`}
                    >
                      {t.priority}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-ink line-clamp-1">{t.title}</h3>
                  {t.description && (
                    <p className="text-xs text-ink-muted mt-1 line-clamp-2">{t.description}</p>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-outline-variant">
                  {/* Progress Bar */}
                  <div className="mb-2">
                    <div className="flex justify-between text-[11px] text-ink-muted mb-1">
                      <span>Progress</span>
                      <span className="font-semibold text-ink tabular-nums">{t.progressPercent}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-surface-high rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary-container rounded-full"
                        style={{ width: `${t.progressPercent}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <div className="flex items-center gap-1.5">
                      <Avatar name={t.assignee.name} avatarUrl={t.assignee.avatarUrl} size="sm" />
                      <span className="text-[11px] text-ink-muted truncate max-w-[90px]">
                        {isAssignedToMe ? 'Assigned to you' : t.assignee.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-ink-muted text-[11px]">
                      <span className="flex items-center gap-0.5">
                        <MessageSquare className="w-3 h-3" />
                        {t._count.comments}
                      </span>
                      <span className={`flex items-center gap-0.5 ${isOverdue ? 'text-red-600 font-semibold' : ''}`}>
                        {isOverdue && <AlertTriangle className="w-3 h-3" />}
                        <Clock className="w-3 h-3" />
                        {new Date(t.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Task Details & Discussion Thread Modal */}
      {activeTaskModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-lg shadow-xl border border-outline-variant p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between pb-3 border-b border-outline-variant">
              <div>
                <span className="text-[11px] font-semibold text-primary uppercase">
                  {activeTaskModal.project.name}
                </span>
                <h2 className="text-base font-bold text-ink mt-0.5">{activeTaskModal.title}</h2>
              </div>
              <button onClick={() => setActiveTaskModal(null)} className="text-ink-muted hover:text-ink">
                <X className="w-5 h-5" />
              </button>
            </div>

            {activeTaskModal.description && (
              <p className="text-xs text-ink-muted">{activeTaskModal.description}</p>
            )}

            {/* Quick Status and Progress controls for Assignee */}
            {activeTaskModal.assignee.id === user?.id && (
              <div className="p-3 rounded bg-[#F8F8F5] border border-outline-variant space-y-2">
                <span className="text-xs font-semibold text-ink">Update My Progress</span>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="10"
                    value={activeTaskModal.progressPercent}
                    onChange={(e) => {
                      const p = parseInt(e.target.value, 10);
                      setActiveTaskModal({
                        ...activeTaskModal,
                        progressPercent: p,
                        status: p === 100 ? 'DONE' : p > 0 ? 'IN_PROGRESS' : 'TODO',
                      });
                      updateProgressMutation.mutate({
                        taskId: activeTaskModal.id,
                        progressPercent: p,
                        status: p === 100 ? 'DONE' : p > 0 ? 'IN_PROGRESS' : 'TODO',
                      });
                    }}
                    className="flex-1 accent-primary"
                  />
                  <span className="text-xs font-bold text-primary tabular-nums">
                    {activeTaskModal.progressPercent}%
                  </span>
                </div>
              </div>
            )}

            {/* Comments Thread */}
            <div className="pt-2 border-t border-outline-variant space-y-3">
              <h4 className="text-xs font-bold text-ink">Discussion &amp; Work Updates</h4>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {activeTaskModal.comments?.map((c: any) => (
                  <div key={c.id} className="p-2.5 rounded bg-[#F8F8F5] text-xs space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-ink-muted">
                      <span className="font-semibold text-ink">{c.author.name}</span>
                      <span>{new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="text-ink">{c.content}</p>
                  </div>
                ))}
              </div>

              {/* Add comment */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  placeholder="Post comment or link commit..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="flex-1 h-8 px-2.5 rounded border border-outline-variant text-xs text-ink focus:outline-none focus:border-primary"
                />
                <button
                  type="button"
                  disabled={!commentText}
                  onClick={() => addCommentMutation.mutate(activeTaskModal.id)}
                  className="h-8 px-3 rounded bg-primary-container text-white text-xs font-semibold hover:bg-primary-hover disabled:opacity-40 flex items-center gap-1"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create Task */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-lg shadow-xl border border-outline-variant p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant">
              <h2 className="text-base font-bold text-ink">Create Project Task</h2>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-ink-muted hover:text-ink">
                <X className="w-5 h-5" />
              </button>
            </div>

            {createError && (
              <div className="p-3 rounded bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createTaskMutation.mutate();
              }}
              className="space-y-3"
            >
              <div>
                <label className="block text-xs font-medium text-ink-muted mb-1">Project</label>
                <select
                  required
                  value={projectId}
                  onChange={(e) => {
                    setProjectId(e.target.value);
                    setAssigneeId('');
                  }}
                  className="w-full h-8 px-2.5 rounded border border-outline-variant text-xs text-ink focus:outline-none focus:border-primary"
                >
                  <option value="">Select Project</option>
                  {projectsData?.data?.projects?.map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-ink-muted mb-1">Task Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Build Payment Gateway Webhook"
                  className="w-full h-8 px-2.5 rounded border border-outline-variant text-xs text-ink focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-ink-muted mb-1">Assignee (Team Member)</label>
                  <select
                    required
                    disabled={!selectedProject}
                    value={assigneeId}
                    onChange={(e) => setAssigneeId(e.target.value)}
                    className="w-full h-8 px-2.5 rounded border border-outline-variant text-xs text-ink focus:outline-none focus:border-primary disabled:opacity-50"
                  >
                    <option value="">Select Member</option>
                    {selectedProject?.members?.map((m: any) => (
                      <option key={m.user.id} value={m.user.id}>
                        {m.user.name} ({m.role || 'Member'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-ink-muted mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full h-8 px-2.5 rounded border border-outline-variant text-xs text-ink focus:outline-none focus:border-primary"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-ink-muted mb-1">Due Date</label>
                <input
                  type="date"
                  required
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full h-8 px-2.5 rounded border border-outline-variant text-xs text-ink focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-ink-muted mb-1">Description / Spec</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-2 rounded border border-outline-variant text-xs text-ink focus:outline-none focus:border-primary"
                />
              </div>

              <div className="pt-3 border-t border-outline-variant flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-3 py-1.5 rounded border border-outline-variant text-xs font-medium text-ink hover:bg-[#F8F8F5]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createTaskMutation.isPending}
                  className="px-4 py-1.5 rounded bg-primary-container hover:bg-primary-hover text-white text-xs font-semibold disabled:opacity-50"
                >
                  {createTaskMutation.isPending ? 'Assigning...' : 'Assign Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
