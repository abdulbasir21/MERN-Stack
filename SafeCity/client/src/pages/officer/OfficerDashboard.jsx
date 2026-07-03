import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import Sidebar from '../../components/Sidebar';
import Badge from '../../components/Badge';
import EmptyState from '../../components/EmptyState';

const FILTER_TABS = [
  { label: 'All',           key: 'all'          },
  { label: 'Pending',       key: 'pending'       },
  { label: 'Investigating', key: 'investigating' },
  { label: 'Resolved',      key: 'resolved'      },
];

const PENDING_STATUSES = new Set(['submitted', 'under_review', 'assigned']);

const CATEGORY_ICONS = {
  theft:          'lock_person',
  harassment:     'warning',
  missing_person: 'person_search',
  fraud:          'payments',
  other:          'more_horiz',
};

const PRIORITY_COLORS = {
  urgent: 'bg-red-50 border-red-200 text-red-700',
  high:   'bg-amber-50 border-amber-200 text-amber-700',
  normal: '',
};

export default function OfficerDashboard() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [activeTab, setActiveTab]   = useState('all');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAssigned = async () => {
      try {
        const res = await api.get('/complaints/assigned');
        setComplaints(res.data.data || []);
      } catch (err) {
        toast.error(err.response?.data?.message || 'Something went wrong');
      } finally {
        setLoading(false);
      }
    };
    fetchAssigned();
  }, []);

  const filtered = complaints.filter((c) => {
    if (activeTab === 'all')     return true;
    if (activeTab === 'pending') return PENDING_STATUSES.has(c.status);
    return c.status === activeTab;
  });

  // Summary counts
  const counts = {
    all: complaints.length,
    pending: complaints.filter(c => PENDING_STATUSES.has(c.status)).length,
    investigating: complaints.filter(c => c.status === 'investigating').length,
    resolved: complaints.filter(c => c.status === 'resolved').length,
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col pt-14 lg:pt-0">
        {/* Page header */}
        <header className="bg-surface-container-lowest border-b border-border-subtle h-16 flex items-center px-4 lg:px-gutter sticky top-14 lg:top-0 z-10">
          <h2 className="font-headline-md text-headline-md text-primary">Assigned Complaints</h2>
        </header>

        <main className="flex-1 p-4 lg:p-gutter flex flex-col gap-6">
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {FILTER_TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`rounded-xl border p-4 text-left transition-all ${
                  activeTab === tab.key
                    ? 'bg-on-tertiary-container border-on-tertiary-container text-white'
                    : 'bg-surface-container-lowest border-border-subtle hover:border-on-tertiary-container'
                }`}
              >
                <p className={`font-headline-lg text-2xl font-semibold ${activeTab === tab.key ? 'text-white' : 'text-primary'}`}>
                  {counts[tab.key]}
                </p>
                <p className={`font-label-sm text-label-sm mt-1 ${activeTab === tab.key ? 'text-white/80' : 'text-on-surface-variant'}`}>
                  {tab.label}
                </p>
              </button>
            ))}
          </div>

          {/* Content */}
          {loading ? (
            <div className="flex justify-center items-center py-space-3xl">
              <span className="material-symbols-outlined animate-spin text-on-tertiary-container" style={{ fontSize: 36 }}>
                progress_activity
              </span>
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              message={
                activeTab === 'all'
                  ? 'No complaints have been assigned to you yet.'
                  : `No complaints in the "${FILTER_TABS.find((t) => t.key === activeTab)?.label}" category.`
              }
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((c) => (
                <div
                  key={c._id}
                  className={`bg-surface-container-lowest border rounded-xl level-1-shadow p-4 lg:p-space-lg flex flex-col gap-3 ${
                    c.priority === 'urgent' ? 'border-red-200' : c.priority === 'high' ? 'border-amber-200' : 'border-border-subtle'
                  }`}
                >
                  {/* Category + priority indicator */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-on-surface-variant">
                      <span className="material-symbols-outlined text-on-tertiary-container" style={{ fontSize: 20 }}>
                        {CATEGORY_ICONS[c.category] || 'more_horiz'}
                      </span>
                      <span className="font-label-sm text-label-sm uppercase tracking-wide">
                        {c.category?.replace('_', ' ')}
                      </span>
                    </div>
                    {c.priority !== 'normal' && <Badge variant={c.priority} type="priority" />}
                  </div>

                  {/* Title */}
                  <h3 className="font-headline-md text-headline-md text-primary leading-snug line-clamp-2">{c.title}</h3>

                  {/* Area + citizen */}
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1 text-on-surface-variant">
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>location_on</span>
                      <span className="font-body-sm text-body-sm">{c.area}</span>
                    </div>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      Reported by:{' '}
                      <span className={c.citizen ? 'text-on-surface font-medium' : 'italic'}>
                        {c.citizen?.name || 'Anonymous'}
                      </span>
                    </p>
                  </div>

                  {/* Status badge */}
                  <Badge variant={c.status} />

                  {/* Manage button */}
                  <button
                    onClick={() => navigate(`/complaint/${c._id}/manage`)}
                    className="mt-auto bg-[#0d9488] hover:bg-[#0f766e] text-white font-label-md text-label-md px-space-lg py-space-sm rounded-lg shadow-sm transition-all active:scale-[0.98] flex items-center gap-2 justify-center"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>open_in_new</span>
                    Manage
                  </button>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
