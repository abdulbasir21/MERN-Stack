import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../../lib/api';
import {
  FolderGit2,
  Plus,
  Search,
  Building2,
  Home,
  Briefcase,
  Layers,
  Calendar,
  DollarSign,
  MapPin,
  Archive,
  ArchiveRestore,
  Trash2,
  AlertCircle,
  X,
  ExternalLink
} from 'lucide-react';

const PROJECT_TYPE_LABELS = {
  commercial_building: { label: 'Commercial Building', icon: Building2 },
  residential_development: { label: 'Residential Development', icon: Home },
  office_renovation: { label: 'Office Renovation', icon: Briefcase },
  other: { label: 'Other Infrastructure', icon: Layers }
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('active'); // 'active' | 'archived' | 'all'
  const [searchQuery, setSearchQuery] = useState('');

  // Create Project Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    projectType: 'commercial_building',
    location: '',
    budget: '',
    currency: 'USD',
    startDate: '',
    expectedCompletionDate: ''
  });

  // Delete Confirmation Modal State
  const [projectToDelete, setProjectToDelete] = useState(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (activeTab !== 'all') {
        params.set('status', activeTab);
      }
      if (searchQuery.trim()) {
        params.set('search', searchQuery.trim());
      }
      const res = await apiClient(`/projects?${params.toString()}`);
      setProjects(res?.data?.projects || []);
    } catch (err) {
      setError(err.message || 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  }, [activeTab, searchQuery]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setCreateSubmitting(true);
    setCreateError(null);

    // Client-side BR-P2 date check
    if (formData.startDate && formData.expectedCompletionDate) {
      if (formData.expectedCompletionDate < formData.startDate) {
        setCreateError('Expected completion date must be on or after start date.');
        setCreateSubmitting(false);
        return;
      }
    }

    try {
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        projectType: formData.projectType,
        location: formData.location.trim(),
        budget: formData.budget !== '' ? parseFloat(formData.budget) : null,
        currency: (formData.currency || 'USD').toUpperCase().trim(),
        startDate: formData.startDate || null,
        expectedCompletionDate: formData.expectedCompletionDate || null
      };

      await apiClient('/projects', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      setIsCreateOpen(false);
      setFormData({
        name: '',
        description: '',
        projectType: 'commercial_building',
        location: '',
        budget: '',
        currency: 'USD',
        startDate: '',
        expectedCompletionDate: ''
      });
      fetchProjects();
    } catch (err) {
      setCreateError(err.message || 'Failed to create project');
    } finally {
      setCreateSubmitting(false);
    }
  };

  const handleToggleArchive = async (project) => {
    try {
      const endpoint = project.status === 'active'
        ? `/projects/${project.id}/archive`
        : `/projects/${project.id}/unarchive`;
      await apiClient(endpoint, { method: 'POST' });
      fetchProjects();
    } catch (err) {
      alert(`Action failed: ${err.message}`);
    }
  };

  const handleDeleteProject = async () => {
    if (!projectToDelete) return;
    setDeleteSubmitting(true);
    try {
      await apiClient(`/projects/${projectToDelete.id}`, { method: 'DELETE' });
      setProjectToDelete(null);
      fetchProjects();
    } catch (err) {
      alert(`Delete failed: ${err.message}`);
    } finally {
      setDeleteSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-headline text-primary tracking-tight">Project Portfolio</h1>
          <p className="text-sm text-secondary mt-1">
            Centrally audit contracts, specifications, and scope revisions across active sites.
          </p>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary-container text-white text-sm font-semibold hover:bg-primary-container/90 transition-all shadow-sm shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>New Project</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface p-4 rounded-xl border border-border">
        {/* Status Tabs */}
        <div className="flex items-center gap-1 bg-background p-1 rounded-lg border border-border">
          {[
            { id: 'active', label: 'Active Sites' },
            { id: 'archived', label: 'Archived' },
            { id: 'all', label: 'All Projects' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                activeTab === tab.id
                  ? 'bg-surface text-primary shadow-xs'
                  : 'text-secondary hover:text-primary'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-secondary" />
          <input
            type="text"
            placeholder="Search projects or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary-container/20 focus:border-primary-container"
          />
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-sm">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading Skeletons */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div key={n} className="bg-surface rounded-xl border border-border p-6 space-y-4 animate-pulse">
              <div className="h-5 bg-slate-200 rounded w-2/3"></div>
              <div className="h-4 bg-slate-100 rounded w-1/3"></div>
              <div className="h-16 bg-slate-50 rounded"></div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && projects.length === 0 && (
        <div className="bg-surface border border-dashed border-border rounded-xl p-12 text-center max-w-lg mx-auto">
          <div className="w-12 h-12 rounded-full bg-primary-container/10 text-primary-container mx-auto flex items-center justify-center mb-4">
            <FolderGit2 className="w-6 h-6" />
          </div>
          <h3 className="font-headline font-bold text-base text-primary">No Projects Found</h3>
          <p className="text-xs text-secondary mt-1 max-w-xs mx-auto">
            {searchQuery
              ? `No matching records found for "${searchQuery}". Try a different keyword.`
              : 'Create your first construction project to begin uploading specifications and detecting scope variances.'}
          </p>
          {!searchQuery && (
            <button
              onClick={() => setIsCreateOpen(true)}
              className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-container text-white text-xs font-semibold hover:bg-primary-container/90"
            >
              <Plus className="w-4 h-4" />
              <span>Create Project</span>
            </button>
          )}
        </div>
      )}

      {/* Project Grid */}
      {!loading && projects.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => {
            const typeConfig = PROJECT_TYPE_LABELS[project.projectType] || PROJECT_TYPE_LABELS.other;
            const TypeIcon = typeConfig.icon;

            return (
              <div
                key={project.id}
                className="bg-surface rounded-xl border border-border shadow-xs hover:border-primary-container/50 transition-all flex flex-col justify-between"
              >
                <div className="p-6 space-y-4">
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700">
                      <TypeIcon className="w-3 h-3 text-primary-container" />
                      <span>{typeConfig.label}</span>
                    </span>

                    {project.status === 'active' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        ACTIVE
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                        ARCHIVED
                      </span>
                    )}
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h3 className="font-headline font-bold text-base text-primary tracking-tight">
                      {project.name}
                    </h3>
                    <p className="text-xs text-secondary mt-1 line-clamp-2">
                      {project.description || 'No description provided.'}
                    </p>
                  </div>

                  {/* Metadata Specs */}
                  <div className="pt-3 border-t border-border space-y-2 text-xs text-secondary">
                    {project.location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{project.location}</span>
                      </div>
                    )}
                    {project.budget !== null && project.budget !== undefined && (
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="font-mono font-medium text-primary">
                          {Number(project.budget).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          })}{' '}
                          {project.currency}
                        </span>
                      </div>
                    )}
                    {(project.startDate || project.expectedCompletionDate) && (
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="font-mono text-[11px]">
                          {project.startDate || 'TBD'} → {project.expectedCompletionDate || 'TBD'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="px-6 py-3 bg-slate-50 border-t border-border rounded-b-xl flex items-center justify-between">
                  <Link
                    to={`/app/projects/${project.id}`}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-container hover:text-primary-container/80 transition-colors"
                  >
                    <span>Open Workspace</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleToggleArchive(project)}
                      title={project.status === 'active' ? 'Archive Project' : 'Unarchive Project'}
                      className="p-1.5 text-slate-400 hover:text-slate-600 rounded transition-colors"
                    >
                      {project.status === 'active' ? (
                        <Archive className="w-4 h-4" />
                      ) : (
                        <ArchiveRestore className="w-4 h-4 text-emerald-600" />
                      )}
                    </button>
                    <button
                      onClick={() => setProjectToDelete(project)}
                      title="Delete Project"
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Project Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-surface rounded-2xl border border-border shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <FolderGit2 className="w-5 h-5 text-primary-container" />
                <h2 className="font-headline font-bold text-base text-primary">New Construction Project</h2>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {createError && (
              <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-primary mb-1">
                  Project Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={120}
                  placeholder="e.g. Apex Bay Horizon Tower Phase 1"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary-container/20 focus:border-primary-container"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-primary mb-1">
                  Project Type <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.projectType}
                  onChange={(e) => setFormData({ ...formData, projectType: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary-container/20 focus:border-primary-container"
                >
                  <option value="commercial_building">Commercial Building</option>
                  <option value="residential_development">Residential Development</option>
                  <option value="office_renovation">Office Renovation</option>
                  <option value="other">Other Infrastructure</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-primary mb-1">Description</label>
                <textarea
                  rows={2}
                  maxLength={2000}
                  placeholder="Summary of construction scope and baseline contract..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary-container/20 focus:border-primary-container"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-primary mb-1">Location / Site</label>
                  <input
                    type="text"
                    maxLength={200}
                    placeholder="e.g. Austin, TX"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary-container/20 focus:border-primary-container"
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-primary mb-1">Budget</label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      placeholder="e.g. 5000000"
                      value={formData.budget}
                      onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary-container/20 focus:border-primary-container"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-primary mb-1">Curr.</label>
                    <input
                      type="text"
                      maxLength={3}
                      placeholder="USD"
                      value={formData.currency}
                      onChange={(e) => setFormData({ ...formData, currency: e.target.value.toUpperCase() })}
                      className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary-container/20 focus:border-primary-container text-center"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-primary mb-1">Start Date</label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary-container/20 focus:border-primary-container"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-primary mb-1">Expected Completion</label>
                  <input
                    type="date"
                    value={formData.expectedCompletionDate}
                    onChange={(e) => setFormData({ ...formData, expectedCompletionDate: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary-container/20 focus:border-primary-container"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-secondary hover:text-primary transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createSubmitting}
                  className="px-4 py-2 rounded-lg bg-primary-container text-white text-xs font-semibold hover:bg-primary-container/90 transition-all disabled:opacity-50"
                >
                  {createSubmitting ? 'Creating Project...' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal (BR-P5 Warning) */}
      {projectToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-surface rounded-2xl border border-rose-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="font-headline font-bold text-lg text-primary">Delete Project & Cascade Data?</h3>
              <p className="text-xs text-secondary">
                Are you sure you want to permanently delete{' '}
                <strong className="text-primary">{projectToDelete.name}</strong>?
              </p>
            </div>

            <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-xs text-rose-800 space-y-1">
              <p className="font-semibold">Irreversible Database Cascade:</p>
              <p>
                This operation will delete all uploaded documents, chunks, AI investigations,
                findings, review audits, and generated change reports associated with this project.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setProjectToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-secondary hover:text-primary"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteSubmitting}
                onClick={handleDeleteProject}
                className="px-4 py-2 rounded-lg bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 disabled:opacity-50"
              >
                {deleteSubmitting ? 'Deleting Cascade...' : 'Yes, Delete Project'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
