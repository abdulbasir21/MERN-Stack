import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { apiClient } from '../../lib/api';
import {
  FolderGit2,
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
  Edit3,
  ArrowLeft,
  AlertCircle,
  FileText,
  SearchCode,
  FileSpreadsheet,
  X,
  UploadCloud,
  Play
} from 'lucide-react';
import DocumentsManager from '../../features/documents/DocumentsManager';
import InvestigationsManager from '../../features/investigations/InvestigationsManager';
import ReportsManager from '../../features/reports/ReportsManager';

const PROJECT_TYPE_LABELS = {
  commercial_building: { label: 'Commercial Building', icon: Building2 },
  residential_development: { label: 'Residential Development', icon: Home },
  office_renovation: { label: 'Office Renovation', icon: Briefcase },
  other: { label: 'Other Infrastructure', icon: Layers }
};

export default function ProjectDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'documents' | 'investigations' | 'reports'

  // Edit Modal State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    description: '',
    projectType: 'commercial_building',
    location: '',
    budget: '',
    currency: 'USD',
    startDate: '',
    expectedCompletionDate: ''
  });

  // Delete State
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  const fetchProject = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient(`/projects/${id}`);
      const proj = res?.data?.project;
      setProject(proj);
      if (proj) {
        setEditFormData({
          name: proj.name || '',
          description: proj.description || '',
          projectType: proj.projectType || 'commercial_building',
          location: proj.location || '',
          budget: proj.budget !== null && proj.budget !== undefined ? proj.budget : '',
          currency: proj.currency || 'USD',
          startDate: proj.startDate || '',
          expectedCompletionDate: proj.expectedCompletionDate || ''
        });
      }
    } catch (err) {
      setError(err.message || 'Project not found or inaccessible');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditSubmitting(true);
    setEditError(null);

    if (editFormData.startDate && editFormData.expectedCompletionDate) {
      if (editFormData.expectedCompletionDate < editFormData.startDate) {
        setEditError('Expected completion date must be on or after start date.');
        setEditSubmitting(false);
        return;
      }
    }

    try {
      const payload = {
        name: editFormData.name.trim(),
        description: editFormData.description.trim(),
        projectType: editFormData.projectType,
        location: editFormData.location.trim(),
        budget: editFormData.budget !== '' ? parseFloat(editFormData.budget) : null,
        currency: (editFormData.currency || 'USD').toUpperCase().trim(),
        startDate: editFormData.startDate || null,
        expectedCompletionDate: editFormData.expectedCompletionDate || null
      };

      await apiClient(`/projects/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload)
      });

      setIsEditOpen(false);
      fetchProject();
    } catch (err) {
      setEditError(err.message || 'Failed to update project');
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleToggleArchive = async () => {
    if (!project) return;
    try {
      const endpoint = project.status === 'active'
        ? `/projects/${project.id}/archive`
        : `/projects/${project.id}/unarchive`;
      await apiClient(endpoint, { method: 'POST' });
      fetchProject();
    } catch (err) {
      alert(`Action failed: ${err.message}`);
    }
  };

  const handleDelete = async () => {
    setDeleteSubmitting(true);
    try {
      await apiClient(`/projects/${id}`, { method: 'DELETE' });
      navigate('/app/projects');
    } catch (err) {
      alert(`Delete failed: ${err.message}`);
    } finally {
      setDeleteSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-4 bg-slate-200 rounded w-48"></div>
        <div className="h-10 bg-slate-200 rounded w-1/3"></div>
        <div className="h-64 bg-surface rounded-xl border border-border"></div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="max-w-xl mx-auto my-12 bg-surface p-8 rounded-2xl border border-border text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="font-headline font-bold text-lg text-primary">Project Inaccessible</h2>
        <p className="text-xs text-secondary">{error || 'This project does not exist or belongs to another user.'}</p>
        <Link
          to="/app/projects"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-container text-white text-xs font-semibold hover:bg-primary-container/90"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Projects</span>
        </Link>
      </div>
    );
  }

  const typeConfig = PROJECT_TYPE_LABELS[project.projectType] || PROJECT_TYPE_LABELS.other;
  const TypeIcon = typeConfig.icon;

  return (
    <div className="space-y-8">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs text-secondary">
        <Link to="/app/projects" className="hover:text-primary transition-colors flex items-center gap-1">
          <FolderGit2 className="w-3.5 h-3.5 text-primary-container" />
          <span>Projects</span>
        </Link>
        <span>/</span>
        <span className="text-primary font-medium truncate max-w-xs">{project.name}</span>
      </div>

      {/* Project Header Banner */}
      <div className="bg-surface rounded-2xl border border-border p-6 md:p-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700">
                <TypeIcon className="w-3.5 h-3.5 text-primary-container" />
                <span>{typeConfig.label}</span>
              </span>

              {project.status === 'active' ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  ACTIVE WORKSPACE
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                  ARCHIVED (READ-ONLY)
                </span>
              )}
            </div>

            <h1 className="text-2xl md:text-3xl font-bold font-headline text-primary tracking-tight">
              {project.name}
            </h1>

            {project.description && (
              <p className="text-sm text-secondary max-w-2xl leading-relaxed">
                {project.description}
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setIsEditOpen(true)}
              disabled={project.status === 'archived'}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-background text-xs font-semibold text-primary hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Edit3 className="w-3.5 h-3.5 text-slate-500" />
              <span>Edit Details</span>
            </button>

            <button
              onClick={handleToggleArchive}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-background text-xs font-semibold text-primary hover:bg-slate-50 transition-colors"
            >
              {project.status === 'active' ? (
                <>
                  <Archive className="w-3.5 h-3.5 text-slate-500" />
                  <span>Archive</span>
                </>
              ) : (
                <>
                  <ArchiveRestore className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Unarchive</span>
                </>
              )}
            </button>

            <button
              onClick={() => setIsDeleteOpen(true)}
              className="p-2 rounded-lg border border-border bg-background text-slate-400 hover:text-rose-600 hover:border-rose-200 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Quick Spec Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6 border-t border-border text-xs">
          <div>
            <span className="text-secondary block mb-1">Contract Budget</span>
            <div className="flex items-center gap-1 font-mono font-bold text-sm text-primary">
              <DollarSign className="w-3.5 h-3.5 text-primary-container" />
              <span>
                {project.budget !== null && project.budget !== undefined
                  ? Number(project.budget).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })
                  : 'Undisclosed'}
              </span>
              <span className="text-secondary text-[10px]">{project.currency}</span>
            </div>
          </div>

          <div>
            <span className="text-secondary block mb-1">Site Location</span>
            <div className="flex items-center gap-1 font-semibold text-sm text-primary">
              <MapPin className="w-3.5 h-3.5 text-primary-container" />
              <span className="truncate">{project.location || 'Unspecified'}</span>
            </div>
          </div>

          <div>
            <span className="text-secondary block mb-1">Contract Start Date</span>
            <div className="flex items-center gap-1 font-mono text-sm text-primary">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>{project.startDate || 'Not Set'}</span>
            </div>
          </div>

          <div>
            <span className="text-secondary block mb-1">Target Completion</span>
            <div className="flex items-center gap-1 font-mono text-sm text-primary">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>{project.expectedCompletionDate || 'Not Set'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-border">
        <nav className="flex space-x-8">
          {[
            { id: 'overview', label: 'Overview', icon: FolderGit2 },
            { id: 'documents', label: 'Documents (Phase 4)', icon: FileText },
            { id: 'investigations', label: 'Investigations (Phase 6)', icon: SearchCode },
            { id: 'reports', label: 'Change Reports (Phase 7)', icon: FileSpreadsheet }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 pb-4 text-xs font-semibold border-b-2 transition-all ${
                  isActive
                    ? 'border-primary-container text-primary-container'
                    : 'border-transparent text-secondary hover:text-primary hover:border-slate-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Panes */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Quick Actions Card */}
            <div className="bg-surface rounded-xl border border-border p-6 space-y-4">
              <h3 className="font-headline font-bold text-base text-primary">Pipeline Readiness</h3>
              <p className="text-xs text-secondary leading-relaxed">
                To start an AI scope investigation, upload your baseline contract or original
                specification alongside the latest revised specification or contractor change request.
              </p>
              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  onClick={() => setActiveTab('documents')}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-primary-container text-white text-xs font-semibold hover:bg-primary-container/90 transition-all"
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>Upload Documents</span>
                </button>
                <button
                  onClick={() => setActiveTab('investigations')}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-border bg-background text-xs font-semibold text-primary hover:bg-slate-50 transition-colors"
                >
                  <Play className="w-3.5 h-3.5 text-primary-container" />
                  <span>Start Investigation</span>
                </button>
              </div>
            </div>

            {/* Contract Guidelines Card */}
            <div className="bg-surface rounded-xl border border-border p-6 space-y-3">
              <h3 className="font-headline font-bold text-base text-primary">Audit Governance</h3>
              <ul className="text-xs text-secondary space-y-2">
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary-container mt-1.5 shrink-0"></span>
                  <span>Calculations are strictly computed using backend high-precision decimals; AI never does authoritative math.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary-container mt-1.5 shrink-0"></span>
                  <span>Every detected quantity or material change is cited with verified text chunks from uploaded files.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary-container mt-1.5 shrink-0"></span>
                  <span>All executive review decisions are timestamped and preserved in an immutable audit ledger.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'documents' && (
        <DocumentsManager projectId={project.id} isArchived={project.status === 'archived'} />
      )}

      {activeTab === 'investigations' && (
        <InvestigationsManager projectId={project.id} isArchived={project.status === 'archived'} />
      )}

      {activeTab === 'reports' && (
        <ReportsManager projectId={project.id} />
      )}

      {/* Edit Project Modal */}
      {isEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-surface rounded-2xl border border-border shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-primary-container" />
                <h2 className="font-headline font-bold text-base text-primary">Edit Project Details</h2>
              </div>
              <button
                onClick={() => setIsEditOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editError && (
              <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-primary mb-1">
                  Project Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={120}
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary-container/20 focus:border-primary-container"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-primary mb-1">
                  Project Type <span className="text-rose-500">*</span>
                </label>
                <select
                  value={editFormData.projectType}
                  onChange={(e) => setEditFormData({ ...editFormData, projectType: e.target.value })}
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
                  value={editFormData.description}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary-container/20 focus:border-primary-container"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-primary mb-1">Location</label>
                  <input
                    type="text"
                    maxLength={200}
                    value={editFormData.location}
                    onChange={(e) => setEditFormData({ ...editFormData, location: e.target.value })}
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
                      value={editFormData.budget}
                      onChange={(e) => setEditFormData({ ...editFormData, budget: e.target.value })}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary-container/20 focus:border-primary-container"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-primary mb-1">Curr.</label>
                    <input
                      type="text"
                      maxLength={3}
                      value={editFormData.currency}
                      onChange={(e) => setEditFormData({ ...editFormData, currency: e.target.value.toUpperCase() })}
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
                    value={editFormData.startDate}
                    onChange={(e) => setEditFormData({ ...editFormData, startDate: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary-container/20 focus:border-primary-container"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-primary mb-1">Expected Completion</label>
                  <input
                    type="date"
                    value={editFormData.expectedCompletionDate}
                    onChange={(e) => setEditFormData({ ...editFormData, expectedCompletionDate: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary-container/20 focus:border-primary-container"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-secondary hover:text-primary transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="px-4 py-2 rounded-lg bg-primary-container text-white text-xs font-semibold hover:bg-primary-container/90 transition-all disabled:opacity-50"
                >
                  {editSubmitting ? 'Saving Changes...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal (BR-P5) */}
      {isDeleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-surface rounded-2xl border border-rose-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="font-headline font-bold text-lg text-primary">Delete Project & Cascade Data?</h3>
              <p className="text-xs text-secondary">
                Are you sure you want to permanently delete{' '}
                <strong className="text-primary">{project.name}</strong>?
              </p>
            </div>

            <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-xs text-rose-800 space-y-1">
              <p className="font-semibold">Irreversible Database Cascade:</p>
              <p>
                All documents, chunks, AI investigations, findings, review records, and change reports
                will be permanently deleted.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsDeleteOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-secondary hover:text-primary"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteSubmitting}
                onClick={handleDelete}
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
