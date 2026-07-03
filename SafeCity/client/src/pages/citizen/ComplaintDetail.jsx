import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import Sidebar from '../../components/Sidebar';
import Badge from '../../components/Badge';
import Button from '../../components/Button';

const STATUS_STEPS = [
  { key: 'submitted', label: 'Submitted' },
  { key: 'under_review', label: 'Under Review' },
  { key: 'assigned', label: 'Assigned' },
  { key: 'investigating', label: 'Investigating' },
  { key: 'resolved', label: 'Resolved' },
];

const STATUS_ORDER = ['submitted', 'under_review', 'assigned', 'investigating', 'resolved'];

function formatDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function StarRating({ value, onChange }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          className="transition-transform hover:scale-110"
        >
          <span
            className="material-symbols-outlined"
            style={{
              fontSize: '28px',
              fontVariationSettings: star <= value ? "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" : "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24",
              color: star <= value ? '#f59e0b' : '#c5c6cc',
            }}
          >
            star
          </span>
        </button>
      ))}
    </div>
  );
}

export default function ComplaintDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [complaint, setComplaint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [rating, setRating] = useState(0);
  const { register, handleSubmit, formState: { isSubmitting } } = useForm();

  function load() {
    setLoading(true);
    api.get(`/complaints/${id}`)
      .then(res => setComplaint(res.data.data))
      .catch(e => {
        if (e.response?.status === 403) setForbidden(true);
        else toast.error('Failed to load complaint');
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [id]);

  async function submitFeedback(data) {
    if (!rating) { toast.error('Please select a rating'); return; }
    try {
      await api.post(`/complaints/${id}/feedback`, { rating, comment: data.comment });
      toast.success('Feedback submitted. Thank you!');
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to submit feedback');
    }
  }

  const statusIndex = STATUS_ORDER.indexOf(complaint?.status);
  const isCitizenOwner = user?.role === 'citizen' && complaint?.citizen?._id === user?.id;
  const canFeedback = complaint?.status === 'resolved' && isCitizenOwner && !complaint?.feedback;

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
          <h2 className="font-headline-md text-headline-md text-primary">Complaint Details</h2>
        </header>

        <main className="flex-1 p-gutter">
          {loading ? (
            <div className="flex justify-center py-space-3xl">
              <span className="material-symbols-outlined animate-spin text-on-tertiary-container" style={{ fontSize: '36px' }}>progress_activity</span>
            </div>
          ) : forbidden ? (
            <div className="text-center py-space-3xl">
              <span className="material-symbols-outlined text-error mb-space-md" style={{ fontSize: '48px' }}>lock</span>
              <h3 className="font-headline-md text-headline-md text-primary">Not authorized</h3>
              <p className="font-body-md text-body-md text-on-surface-variant mt-2">You don't have permission to view this complaint.</p>
            </div>
          ) : complaint ? (
            <div className="max-w-2xl mx-auto space-y-space-lg">

              {/* Main info card */}
              <div className="bg-surface-container-lowest border border-border-subtle rounded-xl p-space-lg level-1-shadow">
                <div className="flex items-center justify-between gap-space-md mb-space-md flex-wrap">
                  <span className="font-label-sm text-label-sm text-on-surface-variant capitalize">
                    {complaint.category?.replace('_', ' ')}
                  </span>
                  <div className="flex gap-2 flex-wrap">
                    <Badge variant={complaint.status} />
                    {complaint.priority !== 'normal' && <Badge variant={complaint.priority} type="priority" />}
                  </div>
                </div>

                <h1 className="font-headline-md text-headline-md text-primary mb-space-sm">
                  {complaint.isAnonymous && complaint.citizen?._id !== user?.id
                    ? 'Anonymous complaint'
                    : complaint.title}
                </h1>
                <p className="font-body-md text-body-md text-on-surface mb-space-md">{complaint.description}</p>

                <div className="grid grid-cols-2 gap-space-sm pt-space-md border-t border-border-subtle">
                  <div>
                    <p className="font-label-sm text-label-sm text-on-surface-variant">Area</p>
                    <p className="font-label-md text-label-md text-on-surface mt-0.5">{complaint.area}</p>
                  </div>
                  <div>
                    <p className="font-label-sm text-label-sm text-on-surface-variant">Filed by</p>
                    <p className="font-label-md text-label-md text-on-surface mt-0.5">
                      {complaint.isAnonymous ? <span className="text-on-surface-variant">Anonymous</span> : complaint.citizen?.name || 'Unknown'}
                    </p>
                  </div>
                  <div>
                    <p className="font-label-sm text-label-sm text-on-surface-variant">Filed on</p>
                    <p className="font-label-md text-label-md text-on-surface mt-0.5">{formatDate(complaint.createdAt)}</p>
                  </div>
                  {complaint.assignedOfficer && (
                    <div>
                      <p className="font-label-sm text-label-sm text-on-surface-variant">Assigned officer</p>
                      <p className="font-label-md text-label-md text-on-surface mt-0.5">{complaint.assignedOfficer?.name}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Status timeline */}
              <div className="bg-surface-container-lowest border border-border-subtle rounded-xl p-space-lg level-1-shadow">
                <h2 className="font-headline-md text-headline-md text-primary mb-space-lg">Progress</h2>
                <div className="relative">
                  {STATUS_STEPS.map((step, i) => {
                    const isCompleted = i < statusIndex;
                    const isCurrent = i === statusIndex;
                    return (
                      <div key={step.key} className="flex items-start gap-4 pb-6 last:pb-0 relative">
                        {/* Connector line */}
                        {i < STATUS_STEPS.length - 1 && (
                          <div className={`absolute left-4 top-8 bottom-0 w-0.5 ${i < statusIndex ? 'bg-on-tertiary-container' : 'bg-outline-variant'}`} />
                        )}
                        {/* Step indicator */}
                        {isCompleted ? (
                          <div className="w-8 h-8 rounded-full bg-on-tertiary-container flex items-center justify-center shrink-0 z-10">
                            <span className="material-symbols-outlined text-white" style={{ fontSize: '16px' }}>check</span>
                          </div>
                        ) : isCurrent ? (
                          <div className="w-8 h-8 rounded-full border-2 border-on-tertiary-container flex items-center justify-center shrink-0 z-10 bg-white">
                            <div className="w-3 h-3 rounded-full bg-on-tertiary-container" />
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-full border-2 border-outline-variant shrink-0 z-10 bg-white" />
                        )}
                        <div className="pt-0.5">
                          <p className={`font-label-md text-label-md ${isCurrent ? 'text-on-tertiary-container' : isCompleted ? 'text-on-surface' : 'text-on-surface-variant'}`}>
                            {step.label}
                          </p>
                          {isCurrent && (
                            <p className="font-label-sm text-label-sm text-on-surface-variant mt-0.5">Current status</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Officer notes */}
              {complaint.notes?.length > 0 && (
                <div className="bg-surface-container-lowest border border-border-subtle rounded-xl p-space-lg level-1-shadow">
                  <h2 className="font-headline-md text-headline-md text-primary mb-space-md">Officer Notes</h2>
                  <div className="space-y-space-md">
                    {complaint.notes.map((note, i) => (
                      <div key={i} className="border-l-2 border-on-tertiary-container pl-4">
                        <p className="font-body-sm text-body-sm text-on-surface">{note.note}</p>
                        <p className="font-label-sm text-label-sm text-on-surface-variant mt-1">
                          {note.officer?.name || 'Officer'} · {formatDate(note.date)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Existing feedback */}
              {complaint.feedback && (
                <div className="bg-surface-container-lowest border border-border-subtle rounded-xl p-space-lg level-1-shadow">
                  <h2 className="font-headline-md text-headline-md text-primary mb-space-md">Your Feedback</h2>
                  <div className="flex gap-1 mb-2">
                    {[1, 2, 3, 4, 5].map(s => (
                      <span
                        key={s}
                        className="material-symbols-outlined"
                        style={{
                          fontSize: '24px',
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

              {/* Feedback form */}
              {canFeedback && (
                <div className="bg-surface-container-lowest border border-on-tertiary-container rounded-xl p-space-lg level-1-shadow">
                  <h2 className="font-headline-md text-headline-md text-primary mb-1">Share your feedback</h2>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mb-space-md">
                    How satisfied are you with how this complaint was handled?
                  </p>
                  <form onSubmit={handleSubmit(submitFeedback)} className="space-y-space-md">
                    <div>
                      <label className="block font-label-md text-label-md text-on-surface-variant mb-2">Rating</label>
                      <StarRating value={rating} onChange={setRating} />
                    </div>
                    <div>
                      <label className="block font-label-md text-label-md text-on-surface-variant mb-1">Comment (optional)</label>
                      <textarea
                        rows={3}
                        {...register('comment')}
                        className="w-full px-space-md py-space-sm border border-outline-variant rounded-lg bg-white text-on-surface focus:ring-2 focus:ring-on-tertiary-container focus:border-on-tertiary-container transition-all outline-none font-body-sm text-body-sm resize-none"
                        placeholder="Tell us about your experience…"
                      />
                    </div>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? 'Submitting…' : 'Submit feedback'}
                    </Button>
                  </form>
                </div>
              )}
            </div>
          ) : null}
        </main>
      </div>
    </div>
  );
}
