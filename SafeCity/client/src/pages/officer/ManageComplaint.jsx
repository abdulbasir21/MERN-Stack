import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import Sidebar from '../../components/Sidebar';
import Badge from '../../components/Badge';

const STATUS_OPTIONS = [
  'submitted',
  'under_review',
  'assigned',
  'investigating',
  'resolved',
  'closed',
];

const CATEGORY_ICONS = {
  theft:          'lock_person',
  harassment:     'warning',
  missing_person: 'person_search',
  fraud:          'payments',
  other:          'more_horiz',
};

export default function ManageComplaint() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [complaint,      setComplaint]      = useState(null);
  const [loading,        setLoading]        = useState(true);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [note,           setNote]           = useState('');
  const [updating,       setUpdating]       = useState(false);

  const fetchComplaint = async () => {
    try {
      const res = await api.get(`/complaints/${id}`);
      const data = res.data.data;
      setComplaint(data);
      setSelectedStatus(data.status);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchComplaint(); }, [id]);

  const handleUpdate = async (overrideStatus) => {
    const statusToSend = overrideStatus || selectedStatus;
    const body = { status: statusToSend };
    if (note.trim()) body.note = note.trim();

    setUpdating(true);
    try {
      await api.patch(`/complaints/${id}/status`, body);
      toast.success('Complaint updated successfully');
      setNote('');
      await fetchComplaint();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <header className="bg-surface-container-lowest border-b border-border-subtle h-16 flex items-center px-gutter sticky top-0 z-10">
          <button
            onClick={() => navigate(-1)}
            className="text-on-surface-variant hover:text-on-tertiary-container transition-colors mr-3"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h2 className="font-headline-md text-headline-md text-primary">Manage Complaint</h2>
        </header>

        <main className="flex-1 p-gutter">
          {loading ? (
            <div className="flex justify-center items-center min-h-[60vh]">
              <span className="material-symbols-outlined animate-spin text-on-tertiary-container" style={{ fontSize: 40 }}>
                progress_activity
              </span>
            </div>
          ) : !complaint ? (
            <div className="p-space-xl text-center text-on-surface-variant font-body-md text-body-md">
              Complaint not found.
            </div>
          ) : (
            <div className="max-w-3xl mx-auto flex flex-col gap-space-xl">

              {/* Info Card */}
              <div className="bg-surface-container-lowest border border-border-subtle rounded-xl level-1-shadow p-space-lg flex flex-col gap-space-md">
                <div className="flex items-center gap-2 text-on-surface-variant">
                  <span className="material-symbols-outlined text-on-tertiary-container" style={{ fontSize: 22 }}>
                    {CATEGORY_ICONS[complaint.category] || 'more_horiz'}
                  </span>
                  <span className="font-label-sm text-label-sm uppercase tracking-wide">
                    {complaint.category?.replace('_', ' ')}
                  </span>
                </div>

                <h2 className="font-headline-md text-headline-md text-primary">{complaint.title}</h2>

                <div className="flex items-center gap-1 text-on-surface-variant">
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>location_on</span>
                  <span className="font-body-sm text-body-sm">{complaint.area}</span>
                </div>

                <p className="font-body-md text-body-md text-on-surface leading-relaxed">{complaint.description}</p>

                <div className="flex gap-2 flex-wrap">
                  <Badge variant={complaint.priority} type="priority" />
                  <Badge variant={complaint.status} />
                </div>

                <div className="border-t border-border-subtle pt-space-md text-on-surface-variant font-body-sm text-body-sm">
                  Reported by:{' '}
                  <span className={complaint.isAnonymous || !complaint.citizen ? 'italic' : 'text-on-surface font-medium'}>
                    {complaint.isAnonymous || !complaint.citizen ? 'Anonymous' : complaint.citizen?.name}
                  </span>
                </div>
              </div>

              {/* Update Card */}
              <div className="bg-surface-container-lowest border border-border-subtle rounded-xl level-1-shadow p-space-lg flex flex-col gap-space-md">
                <h3 className="font-headline-md text-headline-md text-primary">Update Status</h3>

                <div className="flex flex-col gap-1">
                  <label className="font-label-md text-label-md text-on-surface-variant">Status</label>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="w-full px-space-md py-space-sm border border-outline-variant rounded-lg bg-white text-on-surface focus:ring-2 focus:ring-on-tertiary-container outline-none font-body-sm text-body-sm"
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s.replace('_', ' ').replace(/^\w/, (c) => c.toUpperCase())}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-label-md text-label-md text-on-surface-variant">
                    Note <span className="text-outline">(optional)</span>
                  </label>
                  <textarea
                    rows={3}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Add an internal note about the update..."
                    className="w-full px-space-md py-space-sm border border-outline-variant rounded-lg bg-white text-on-surface focus:ring-2 focus:ring-on-tertiary-container focus:border-on-tertiary-container transition-all outline-none font-body-sm text-body-sm resize-none"
                  />
                </div>

                <div className="flex gap-space-md flex-wrap">
                  <button
                    onClick={() => handleUpdate()}
                    disabled={updating}
                    className="bg-[#0d9488] hover:bg-[#0f766e] text-white font-label-md text-label-md px-space-lg py-space-sm rounded-lg shadow-sm transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>save</span>
                    {updating ? 'Updating…' : 'Add Note & Update Status'}
                  </button>

                  {complaint.status !== 'resolved' && (
                    <button
                      onClick={() => handleUpdate('resolved')}
                      disabled={updating}
                      className="border border-primary text-primary font-label-md text-label-md px-space-lg py-space-sm rounded-lg hover:bg-surface-container-low transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 18 }}>check_circle</span>
                      Mark as Resolved
                    </button>
                  )}
                </div>
              </div>

              {/* Notes History */}
              {complaint.notes?.length > 0 && (
                <div className="bg-surface-container-lowest border border-border-subtle rounded-xl level-1-shadow p-space-lg flex flex-col gap-space-md">
                  <h3 className="font-headline-md text-headline-md text-primary">Activity Notes</h3>
                  <div className="flex flex-col gap-space-md">
                    {complaint.notes.map((n, i) => (
                      <div key={i} className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-secondary-container flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-on-secondary-container" style={{ fontSize: 16 }}>person</span>
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-label-md text-label-md text-on-surface">{n.officer?.name || 'Officer'}</span>
                            <span className="font-label-sm text-label-sm text-on-surface-variant">
                              {new Date(n.date).toLocaleDateString('en-GB', {
                                day: 'numeric', month: 'short', year: 'numeric',
                              })}
                            </span>
                          </div>
                          <p className="font-body-sm text-body-sm text-on-surface">{n.note}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Citizen Feedback */}
              {complaint.feedback && (
                <div className="bg-surface-container-lowest border border-border-subtle rounded-xl level-1-shadow p-space-lg flex flex-col gap-space-sm">
                  <h3 className="font-headline-md text-headline-md text-primary">Citizen Feedback</h3>
                  <div className="flex gap-1 mb-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <span
                        key={s}
                        className="material-symbols-outlined"
                        style={{
                          fontSize: '22px',
                          fontVariationSettings: s <= complaint.feedback.rating ? "'FILL' 1" : "'FILL' 0",
                          color: s <= complaint.feedback.rating ? '#f59e0b' : '#c5c6cc',
                        }}
                      >star</span>
                    ))}
                  </div>
                  {complaint.feedback.comment && (
                    <p className="font-body-sm text-body-sm text-on-surface">{complaint.feedback.comment}</p>
                  )}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
