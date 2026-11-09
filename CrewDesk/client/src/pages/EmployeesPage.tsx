import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/useAuth';
import { Avatar } from '../components/shared/Avatar';
import {
  UserPlus,
  Shield,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  AlertCircle,
  X,
} from 'lucide-react';
import { API_BASE } from '../lib/api';

export const EmployeesPage: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'EMPLOYEE' | 'MANAGER'>('EMPLOYEE');

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [title, setTitle] = useState('');
  const [phone, setPhone] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [managerRole, setManagerRole] = useState<'HR_MANAGER' | 'PROJECT_MANAGER' | 'FINANCE_MANAGER' | 'INVENTORY_MANAGER'>('PROJECT_MANAGER');
  const [temporaryPassword, setTemporaryPassword] = useState('TempPass123!');
  const [formError, setFormError] = useState<string | null>(null);

  // 1. Fetch departments
  const { data: deptData } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/departments`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load departments');
      return res.json();
    },
  });

  // 2. Fetch users list
  const { data: usersData, isLoading } = useQuery({
    queryKey: ['users', search, roleFilter, departmentFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (roleFilter) params.append('role', roleFilter);
      if (departmentFilter) params.append('departmentId', departmentFilter);

      const res = await fetch(`${API_BASE}/users?${params.toString()}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load users');
      return res.json();
    },
  });

  // 3. Deactivate/Reactivate mutation
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: 'deactivate' | 'reactivate' }) => {
      const res = await fetch(`${API_BASE}/users/${id}/${action}`, {
        method: 'PATCH',
        credentials: 'include',
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error?.message || 'Action failed');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  // 4. Create user mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      setFormError(null);
      const endpoint = modalMode === 'EMPLOYEE' ? '/users/employee' : '/users/manager';
      const payload =
        modalMode === 'EMPLOYEE'
          ? { name, email, title, phone, departmentId, temporaryPassword }
          : { name, email, title, phone, departmentId, role: managerRole, temporaryPassword };

      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.error?.message || 'Creation failed');
      }
      return body;
    },
    onSuccess: () => {
      setIsModalOpen(false);
      setName('');
      setEmail('');
      setTitle('');
      setPhone('');
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err: unknown) => {
      setFormError(err instanceof Error ? err.message : 'Error creating account');
    },
  });

  const isOwner = user?.role === 'OWNER';
  const isHR = user?.role === 'HR_MANAGER' || isOwner;

  return (
    <div className="space-y-6">
      {/* Header with actions */}
      <div className="bg-white border border-outline-variant rounded-lg p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-ink">Employees &amp; Staff Directory</h1>
          <p className="text-xs text-ink-muted mt-0.5">
            Manage agency personnel, departments, role assignments, and account statuses.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isHR && (
            <button
              onClick={() => {
                setModalMode('EMPLOYEE');
                setIsModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded bg-primary-container hover:bg-primary-hover text-white text-xs font-semibold transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ Add Employee</span>
            </button>
          )}

          {isOwner && (
            <button
              onClick={() => {
                setModalMode('MANAGER');
                setIsModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded border border-outline-variant hover:bg-[#F8F8F5] text-ink text-xs font-semibold transition-colors"
            >
              <Shield className="w-4 h-4 text-primary" />
              <span>+ Create Manager</span>
            </button>
          )}
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white border border-outline-variant rounded-lg p-4 shadow-sm flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-ink-muted absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by name, email, or job title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 pl-9 pr-3 rounded border border-outline-variant text-xs text-ink bg-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="flex items-center gap-1 text-xs text-ink-muted">
            <Filter className="w-3.5 h-3.5" />
            <span>Role:</span>
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="h-9 px-2.5 rounded border border-outline-variant text-xs text-ink bg-white focus:outline-none focus:border-primary"
          >
            <option value="">All Roles</option>
            <option value="EMPLOYEE">Employee</option>
            <option value="HR_MANAGER">HR Manager</option>
            <option value="PROJECT_MANAGER">Project Manager</option>
            <option value="FINANCE_MANAGER">Finance Manager</option>
            <option value="INVENTORY_MANAGER">Inventory Manager</option>
            <option value="OWNER">Owner</option>
          </select>

          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="h-9 px-2.5 rounded border border-outline-variant text-xs text-ink bg-white focus:outline-none focus:border-primary"
          >
            <option value="">All Departments</option>
            {deptData?.data?.departments?.map((d: { id: string; name: string }) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Users Data Table */}
      <div className="bg-white border border-outline-variant rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8F8F5] text-ink-muted uppercase border-b border-outline-variant font-semibold">
              <tr>
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {isLoading && (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-ink-muted">
                    Loading personnel directory...
                  </td>
                </tr>
              )}

              {usersData?.data?.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-ink-muted">
                    No users found matching your filters.
                  </td>
                </tr>
              )}

              {usersData?.data?.map(
                (u: {
                  id: string;
                  name: string;
                  email: string;
                  role: string;
                  title: string | null;
                  avatarUrl: string | null;
                  isActive: boolean;
                  department: { name: string } | null;
                }) => (
                  <tr key={u.id} className="hover:bg-[#F8F8F5]/60 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={u.name} avatarUrl={u.avatarUrl} size="sm" />
                        <div>
                          <div className="font-semibold text-ink">{u.name}</div>
                          <div className="text-[11px] text-ink-muted">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded bg-surface-base text-ink font-medium text-[11px]">
                        {u.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-ink-muted">{u.department?.name || '—'}</td>
                    <td className="px-4 py-3 text-ink">{u.title || '—'}</td>
                    <td className="px-4 py-3">
                      {u.isActive ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Active</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-ink-muted font-medium">
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Deactivated</span>
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {isHR && u.role !== 'OWNER' && u.id !== user?.id && (
                        <button
                          onClick={() =>
                            toggleActiveMutation.mutate({
                              id: u.id,
                              action: u.isActive ? 'deactivate' : 'reactivate',
                            })
                          }
                          className={`text-xs font-medium hover:underline ${
                            u.isActive ? 'text-red-600' : 'text-emerald-700'
                          }`}
                        >
                          {u.isActive ? 'Deactivate' : 'Reactivate'}
                        </button>
                      )}
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Dialog for Employee or Manager Creation */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-lg shadow-xl border border-outline-variant p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant">
              <h2 className="text-base font-bold text-ink">
                {modalMode === 'EMPLOYEE' ? 'Create New Employee' : 'Create Manager Account'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-ink-muted hover:text-ink">
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate();
              }}
              className="space-y-3"
            >
              <div>
                <label className="block text-xs font-medium text-ink-muted mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jane Doe"
                  className="w-full h-8 px-2.5 rounded border border-outline-variant text-xs text-ink focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-ink-muted mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jane.doe@agency.com"
                  className="w-full h-8 px-2.5 rounded border border-outline-variant text-xs text-ink focus:outline-none focus:border-primary"
                />
              </div>

              {modalMode === 'MANAGER' && (
                <div>
                  <label className="block text-xs font-medium text-ink-muted mb-1">Manager Role</label>
                  <select
                    value={managerRole}
                    onChange={(e) =>
                      setManagerRole(
                        e.target.value as 'HR_MANAGER' | 'PROJECT_MANAGER' | 'FINANCE_MANAGER' | 'INVENTORY_MANAGER'
                      )
                    }
                    className="w-full h-8 px-2.5 rounded border border-outline-variant text-xs text-ink focus:outline-none focus:border-primary"
                  >
                    <option value="PROJECT_MANAGER">Project Manager</option>
                    <option value="HR_MANAGER">HR Manager</option>
                    <option value="FINANCE_MANAGER">Finance Manager</option>
                    <option value="INVENTORY_MANAGER">Inventory Manager</option>
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-ink-muted mb-1">Department</label>
                  <select
                    required
                    value={departmentId}
                    onChange={(e) => setDepartmentId(e.target.value)}
                    className="w-full h-8 px-2.5 rounded border border-outline-variant text-xs text-ink focus:outline-none focus:border-primary"
                  >
                    <option value="">Select Department</option>
                    {deptData?.data?.departments?.map((d: { id: string; name: string }) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-ink-muted mb-1">Job Title</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Senior Frontend Dev"
                    className="w-full h-8 px-2.5 rounded border border-outline-variant text-xs text-ink focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-ink-muted mb-1">Temporary Password</label>
                <input
                  type="password"
                  required
                  value={temporaryPassword}
                  onChange={(e) => setTemporaryPassword(e.target.value)}
                  className="w-full h-8 px-2.5 rounded border border-outline-variant text-xs text-ink focus:outline-none focus:border-primary"
                />
              </div>

              <div className="pt-3 border-t border-outline-variant flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 rounded border border-outline-variant text-xs font-medium text-ink hover:bg-[#F8F8F5]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="px-4 py-1.5 rounded bg-primary-container hover:bg-primary-hover text-white text-xs font-semibold disabled:opacity-50"
                >
                  {createMutation.isPending ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
