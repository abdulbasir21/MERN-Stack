import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import Sidebar from '../../components/Sidebar';
import Badge from '../../components/Badge';
import Button from '../../components/Button';
import EmptyState from '../../components/EmptyState';

function formatDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

const categoryIcons = {
  theft: 'lock_person',
  harassment: 'warning',
  missing_person: 'person_search',
  fraud: 'payments',
  other: 'more_horiz',
};

export default function CitizenDashboard() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/complaints/mine')
      .then(res => setComplaints(res.data.data || []))
      .catch(() => toast.error('Failed to load complaints'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col pt-14 lg:pt-0">
        {/* Header */}
        <header className="bg-surface-container-lowest border-b border-border-subtle h-16 flex items-center px-4 lg:px-gutter justify-between sticky top-14 lg:top-0 z-10">
          <h2 className="font-headline-md text-headline-md text-primary">My Complaints</h2>
          <Button onClick={() => navigate('/complaint/new')}>
            <span className="flex items-center gap-2">
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span>
              <span className="hidden sm:inline">File Complaint</span>
              <span className="sm:hidden">New</span>
            </span>
          </Button>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 lg:p-gutter">
          {loading ? (
            <div className="flex justify-center py-space-3xl">
              <span className="material-symbols-outlined animate-spin text-on-tertiary-container" style={{ fontSize: '36px' }}>progress_activity</span>
            </div>
          ) : complaints.length === 0 ? (
            <EmptyState
              icon="description"
              message="No complaints yet"
              ctaLabel="File your first complaint"
              onCta={() => navigate('/complaint/new')}
            />
          ) : (
            <div className="grid gap-space-md">
              {complaints.map(c => (
                <Link
                  key={c._id}
                  to={`/complaint/${c._id}`}
                  className="bg-surface-container-lowest border border-border-subtle rounded-xl p-4 lg:p-space-lg level-1-shadow hover:border-on-tertiary-container transition-all group block"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-tertiary-container flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-on-tertiary-container" style={{ fontSize: '20px' }}>
                          {categoryIcons[c.category] || 'report'}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-label-md text-label-md text-primary truncate group-hover:text-on-tertiary-container transition-colors">
                          {c.isAnonymous ? 'Anonymous complaint' : c.title}
                        </h3>
                        <p className="font-label-sm text-label-sm text-on-surface-variant mt-0.5 capitalize">
                          {c.category?.replace('_', ' ')} · {c.area}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <Badge variant={c.status} />
                      {c.priority !== 'normal' && <Badge variant={c.priority} type="priority" />}
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-4 text-on-surface-variant flex-wrap">
                    <span className="font-label-sm text-label-sm flex items-center gap-1">
                      <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>calendar_today</span>
                      {formatDate(c.createdAt)}
                    </span>
                    {c.assignedOfficer && (
                      <span className="font-label-sm text-label-sm flex items-center gap-1">
                        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>badge</span>
                        {c.assignedOfficer.name || 'Officer assigned'}
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
