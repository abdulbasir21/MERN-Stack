import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiClient } from '../../lib/api';
import {
  FolderGit2,
  SearchCode,
  Clock,
  FileSpreadsheet,
  ArrowRight,
  Plus
} from 'lucide-react';

export default function DashboardPage() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      setLoading(true);
      try {
        const res = await apiClient('/dashboard');
        setData(res?.data || null);
      } catch {
        // Fallback on empty
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  const metrics = data?.metrics || {
    totalProjects: 0,
    activeProjects: 0,
    totalInvestigations: 0,
    changesAwaitingReview: 0,
    reportsGenerated: 0
  };

  const recentProjects = data?.recentProjects || [];
  const recentInvestigations = data?.recentInvestigations || [];

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-headline font-bold text-2xl text-secondary-navy tracking-tight">
            Executive Dashboard
          </h1>
          <p className="text-sm text-secondary mt-1">
            Real-time telemetry across active projects and scope change investigations.
          </p>
        </div>
        <Link
          to="/app/projects"
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary-container text-white text-xs font-semibold rounded-lg shadow-sm hover:opacity-95 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Project</span>
        </Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 rounded-xl bg-surface border border-border animate-pulse" />
          ))}
        </div>
      ) : (
        /* KPI Cards */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="p-5 rounded-xl bg-surface border border-border shadow-card">
            <div className="flex items-center justify-between text-secondary mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider">Active Projects</span>
              <FolderGit2 className="w-4 h-4 text-primary-container" />
            </div>
            <div className="font-headline font-bold text-3xl text-secondary-navy">
              {metrics.activeProjects}
            </div>
            <div className="text-xs text-secondary mt-1">
              {metrics.totalProjects} total projects registered
            </div>
          </div>

          <div className="p-5 rounded-xl bg-surface border border-border shadow-card">
            <div className="flex items-center justify-between text-secondary mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider">Investigations</span>
              <SearchCode className="w-4 h-4 text-primary-container" />
            </div>
            <div className="font-headline font-bold text-3xl text-secondary-navy">
              {metrics.totalInvestigations}
            </div>
            <div className="text-xs text-secondary mt-1">Multi-stage audit workflows</div>
          </div>

          <div className="p-5 rounded-xl bg-surface border border-border shadow-card">
            <div className="flex items-center justify-between text-secondary mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider">Awaiting Review</span>
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <div className="font-headline font-bold text-3xl text-amber-600">
              {metrics.changesAwaitingReview}
            </div>
            <div className="text-xs text-secondary mt-1">Pending PM review actions</div>
          </div>

          <div className="p-5 rounded-xl bg-surface border border-border shadow-card">
            <div className="flex items-center justify-between text-secondary mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider">Reports</span>
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="font-headline font-bold text-3xl text-secondary-navy">
              {metrics.reportsGenerated}
            </div>
            <div className="text-xs text-secondary mt-1">12-section PDF audit packages</div>
          </div>
        </div>
      )}

      {/* Recents Grid */}
      {!loading && metrics.totalProjects > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Projects */}
          <div className="bg-surface rounded-xl border border-border p-5 space-y-4 shadow-card">
            <div className="flex items-center justify-between">
              <h2 className="font-headline font-bold text-base text-primary">Recent Projects</h2>
              <Link to="/app/projects" className="text-xs font-semibold text-primary-container hover:underline">
                View all
              </Link>
            </div>
            <div className="divide-y divide-border">
              {recentProjects.map((p) => (
                <div
                  key={p.id || p._id}
                  onClick={() => navigate(`/app/projects/${p.id || p._id}`)}
                  className="py-3 flex items-center justify-between cursor-pointer hover:bg-muted/30 px-2 rounded-lg transition-colors"
                >
                  <div className="space-y-0.5">
                    <p className="font-medium text-xs text-primary">{p.name}</p>
                    <span className="text-[11px] text-secondary capitalize">
                      {p.projectType?.replace('_', ' ')} • {p.currency || 'USD'}
                    </span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-secondary" />
                </div>
              ))}
            </div>
          </div>

          {/* Recent Investigations */}
          <div className="bg-surface rounded-xl border border-border p-5 space-y-4 shadow-card">
            <div className="flex items-center justify-between">
              <h2 className="font-headline font-bold text-base text-primary">Recent Investigations</h2>
              <Link to="/app/investigations" className="text-xs font-semibold text-primary-container hover:underline">
                View all
              </Link>
            </div>
            {recentInvestigations.length === 0 ? (
              <div className="py-8 text-center text-xs text-secondary italic">
                No investigations launched yet.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {recentInvestigations.map((inv) => (
                  <div
                    key={inv.id || inv._id}
                    onClick={() => navigate(`/app/investigations/${inv.id || inv._id}`)}
                    className="py-3 flex items-center justify-between cursor-pointer hover:bg-muted/30 px-2 rounded-lg transition-colors"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-xs text-primary truncate max-w-xs">
                          {inv.projectId?.name || 'Project Investigation'}
                        </span>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.2 rounded-full ${
                            inv.status === 'completed'
                              ? 'bg-emerald-500/10 text-emerald-700'
                              : inv.status === 'running'
                              ? 'bg-sky-500/10 text-sky-700'
                              : 'bg-muted text-secondary'
                          }`}
                        >
                          {inv.status}
                        </span>
                      </div>
                      <span className="text-[11px] text-secondary font-mono">
                        {new Date(inv.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-secondary" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : !loading ? (
        /* Empty State Banner */
        <div className="p-12 text-center rounded-xl bg-surface border border-border shadow-card">
          <div className="w-12 h-12 rounded-xl bg-surface-subtle mx-auto flex items-center justify-center text-secondary mb-4">
            <FolderGit2 className="w-6 h-6" />
          </div>
          <h3 className="font-headline font-bold text-lg text-secondary-navy mb-1">No Projects Found</h3>
          <p className="text-sm text-secondary max-w-sm mx-auto mb-6">
            Create your first construction project to upload specifications and start cross-document change investigations.
          </p>
          <button
            type="button"
            onClick={() => navigate('/app/projects')}
            className="h-10 px-5 rounded-lg bg-primary-container text-white text-sm font-semibold hover:bg-primary-hover shadow-sm transition-all"
          >
            Create Project
          </button>
        </div>
      ) : null}
    </div>
  );
}
