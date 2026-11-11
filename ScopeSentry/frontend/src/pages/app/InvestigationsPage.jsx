import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../lib/api';
import {
  ArrowRight,
  Layers
} from 'lucide-react';

export default function InvestigationsPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProjects = async () => {
      setLoading(true);
      try {
        const res = await apiClient('/projects');
        setProjects(res?.data?.items || []);
      } catch {
        // Ignored
      } finally {
        setLoading(false);
      }
    };
    fetchProjects();
  }, []);

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-xl md:text-2xl font-headline font-bold text-primary">
          Scope Investigations
        </h1>
        <p className="text-xs text-secondary mt-1">
          Select an active project to view and launch deterministic scope investigations.
        </p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-surface rounded-xl border border-border animate-pulse" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="bg-surface rounded-xl border border-dashed border-border p-12 text-center max-w-md mx-auto space-y-4">
          <Layers className="w-10 h-10 text-secondary mx-auto" />
          <h3 className="font-headline font-bold text-base text-primary">No Projects Found</h3>
          <p className="text-xs text-secondary">
            Create a construction project first to upload contract documents and run AI change investigations.
          </p>
          <button
            onClick={() => navigate('/app/projects')}
            className="px-4 py-2 bg-primary-container text-white text-xs font-semibold rounded-lg"
          >
            Go to Projects
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((proj) => (
            <div
              key={proj.id}
              onClick={() => navigate(`/app/projects/${proj.id}`)}
              className="group bg-surface rounded-xl border border-border p-5 hover:border-primary-container/40 hover:shadow-sm transition-all cursor-pointer space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-secondary">
                  {proj.projectType?.replace('_', ' ')}
                </span>
                <span className="text-xs font-semibold text-primary-container group-hover:translate-x-1 transition-transform flex items-center gap-1">
                  <span>Open</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
              <h3 className="font-headline font-bold text-sm text-primary group-hover:text-primary-container transition-colors">
                {proj.name}
              </h3>
              <p className="text-xs text-secondary line-clamp-2">
                {proj.description || 'No description provided.'}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
