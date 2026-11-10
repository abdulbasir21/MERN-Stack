import { FolderGit2, SearchCode, Clock, FileSpreadsheet } from 'lucide-react';

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      {/* Page Title */}
      <div>
        <h1 className="font-headline font-bold text-2xl text-secondary-navy tracking-tight">
          Executive Dashboard
        </h1>
        <p className="text-sm text-secondary mt-1">
          Real-time telemetry across active projects and scope change investigations.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="p-5 rounded-xl bg-surface border border-border shadow-card">
          <div className="flex items-center justify-between text-secondary mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Projects</span>
            <FolderGit2 className="w-4 h-4 text-primary-container" />
          </div>
          <div className="font-headline font-bold text-3xl text-secondary-navy">0</div>
          <div className="text-xs text-secondary mt-1">0 total projects registered</div>
        </div>

        <div className="p-5 rounded-xl bg-surface border border-border shadow-card">
          <div className="flex items-center justify-between text-secondary mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Investigations</span>
            <SearchCode className="w-4 h-4 text-primary-container" />
          </div>
          <div className="font-headline font-bold text-3xl text-secondary-navy">0</div>
          <div className="text-xs text-secondary mt-1">0 completed runs</div>
        </div>

        <div className="p-5 rounded-xl bg-surface border border-border shadow-card">
          <div className="flex items-center justify-between text-secondary mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Awaiting Review</span>
            <Clock className="w-4 h-4 text-estimate" />
          </div>
          <div className="font-headline font-bold text-3xl text-estimate">0</div>
          <div className="text-xs text-secondary mt-1">Pending user review</div>
        </div>

        <div className="p-5 rounded-xl bg-surface border border-border shadow-card">
          <div className="flex items-center justify-between text-secondary mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Reports</span>
            <FileSpreadsheet className="w-4 h-4 text-confirmed" />
          </div>
          <div className="font-headline font-bold text-3xl text-secondary-navy">0</div>
          <div className="text-xs text-secondary mt-1">PDF packages generated</div>
        </div>
      </div>

      {/* Empty State Banner */}
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
          className="h-10 px-5 rounded-lg bg-primary-container text-white text-sm font-semibold hover:bg-primary-hover shadow-sm transition-all"
        >
          Create Project
        </button>
      </div>
    </div>
  );
}
