import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import Sidebar from '../../components/Sidebar';

export default function ManageOfficers() {
  const [officers,    setOfficers]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [showModal,   setShowModal]   = useState(false);
  const [toggling,    setToggling]    = useState(null);
  const [submitting,  setSubmitting]  = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const fetchOfficers = async () => {
    try {
      const res = await api.get('/admin/officers');
      setOfficers(res.data.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOfficers(); }, []);

  const onAddOfficer = async (formData) => {
    setSubmitting(true);
    try {
      await api.post('/admin/officers', formData);
      toast.success('Officer added successfully');
      reset();
      setShowModal(false);
      fetchOfficers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (officer) => {
    setToggling(officer._id);
    try {
      await api.patch(`/admin/officers/${officer._id}/deactivate`);
      toast.success(officer.isActive ? 'Officer deactivated' : 'Officer activated');
      fetchOfficers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong');
    } finally {
      setToggling(null);
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <header className="bg-surface-container-lowest border-b border-border-subtle h-16 flex items-center px-gutter justify-between sticky top-0 z-10">
          <h2 className="font-headline-md text-headline-md text-primary">Manage Officers</h2>
          <button
            onClick={() => { reset(); setShowModal(true); }}
            className="bg-[#0d9488] hover:bg-[#0f766e] text-white font-label-md text-label-md px-space-lg py-space-sm rounded-lg shadow-sm transition-all active:scale-[0.98] flex items-center gap-2"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span>
            Add Officer
          </button>
        </header>

        <main className="flex-1 p-gutter flex flex-col gap-space-xl">
          <p className="font-body-sm text-body-sm text-on-surface-variant -mt-space-md">
            Add, activate, or deactivate officer accounts.
          </p>

          {/* Summary stats */}
          <div className="flex gap-space-md flex-wrap">
            <div className="bg-surface-container-lowest border border-border-subtle rounded-xl level-1-shadow p-space-lg flex items-center gap-space-md">
              <span className="material-symbols-outlined text-on-tertiary-container" style={{ fontSize: 28 }}>badge</span>
              <div>
                <p className="font-headline-md text-headline-md text-primary">{officers.length}</p>
                <p className="font-label-md text-label-md text-on-surface-variant">Total Officers</p>
              </div>
            </div>
            <div className="bg-surface-container-lowest border border-border-subtle rounded-xl level-1-shadow p-space-lg flex items-center gap-space-md">
              <span className="material-symbols-outlined text-status-green" style={{ fontSize: 28 }}>check_circle</span>
              <div>
                <p className="font-headline-md text-headline-md text-primary">{officers.filter(o => o.isActive).length}</p>
                <p className="font-label-md text-label-md text-on-surface-variant">Active</p>
              </div>
            </div>
          </div>

          {/* Officer cards */}
          {loading ? (
            <div className="flex justify-center items-center py-space-3xl">
              <span className="material-symbols-outlined animate-spin text-on-tertiary-container" style={{ fontSize: 40 }}>
                progress_activity
              </span>
            </div>
          ) : officers.length === 0 ? (
            <div className="text-center py-space-3xl text-on-surface-variant font-body-md text-body-md">
              No officers yet. Add one to get started.
            </div>
          ) : (
            <div className="grid gap-space-md sm:grid-cols-2 xl:grid-cols-3">
              {officers.map((o) => (
                <div
                  key={o._id}
                  className="bg-surface-container-lowest border border-border-subtle rounded-xl level-1-shadow p-space-lg flex flex-col gap-space-md"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-on-secondary-container" style={{ fontSize: 22 }}>person</span>
                      </div>
                      <div className="min-w-0">
                        <p className="font-label-md text-label-md text-on-surface truncate">{o.name}</p>
                        <p className="font-body-sm text-body-sm text-on-surface-variant truncate">{o.email}</p>
                      </div>
                    </div>
                    {/* Status indicator */}
                    <div className="flex items-center gap-1.5 shrink-0 mt-1">
                      <div className={`w-2 h-2 rounded-full ${o.isActive ? 'bg-status-green' : 'bg-status-red'}`} />
                      <span className={`font-label-sm text-label-sm ${o.isActive ? 'text-status-green' : 'text-status-red'}`}>
                        {o.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex gap-space-md border-t border-border-subtle pt-space-md">
                    <div className="flex-1 text-center">
                      <p className="font-headline-md text-headline-md text-primary">{o.stats?.assigned ?? 0}</p>
                      <p className="font-label-sm text-label-sm text-on-surface-variant">Assigned</p>
                    </div>
                    <div className="w-px bg-border-subtle" />
                    <div className="flex-1 text-center">
                      <p className="font-headline-md text-headline-md text-primary">{o.stats?.resolved ?? 0}</p>
                      <p className="font-label-sm text-label-sm text-on-surface-variant">Resolved</p>
                    </div>
                  </div>

                  {/* Joined date */}
                  <p className="font-label-sm text-label-sm text-on-surface-variant">
                    Joined {new Date(o.createdAt).toLocaleDateString('en-GB', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })}
                  </p>

                  {/* Toggle button */}
                  <button
                    onClick={() => handleToggleActive(o)}
                    disabled={toggling === o._id}
                    className={`w-full font-label-md text-label-md px-space-lg py-space-sm rounded-lg transition-all disabled:opacity-60 flex items-center gap-2 justify-center ${
                      o.isActive
                        ? 'border border-status-red text-status-red hover:bg-red-50'
                        : 'border border-status-green text-status-green hover:bg-green-50'
                    }`}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                      {o.isActive ? 'block' : 'check_circle'}
                    </span>
                    {toggling === o._id ? 'Updating…' : o.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Add Officer Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-space-md">
          <div className="bg-surface-container-lowest rounded-xl level-2-shadow w-full max-w-md p-space-xl flex flex-col gap-space-lg">
            <div className="flex items-center justify-between">
              <h2 className="font-headline-md text-headline-md text-primary">Add New Officer</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-on-surface-variant hover:text-on-surface transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmit(onAddOfficer)} className="flex flex-col gap-space-md">
              <div className="flex flex-col gap-1">
                <label className="font-label-md text-label-md text-on-surface-variant">Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Sarah Ahmed"
                  {...register('name', { required: 'Name is required' })}
                  className="w-full px-space-md py-space-sm border border-outline-variant rounded-lg bg-white text-on-surface focus:ring-2 focus:ring-on-tertiary-container focus:border-on-tertiary-container transition-all outline-none font-body-sm text-body-sm"
                />
                {errors.name && <p className="font-label-sm text-label-sm text-status-red">{errors.name.message}</p>}
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-label-md text-label-md text-on-surface-variant">Email</label>
                <input
                  type="email"
                  placeholder="officer@safecity.gov"
                  {...register('email', { required: 'Email is required' })}
                  className="w-full px-space-md py-space-sm border border-outline-variant rounded-lg bg-white text-on-surface focus:ring-2 focus:ring-on-tertiary-container focus:border-on-tertiary-container transition-all outline-none font-body-sm text-body-sm"
                />
                {errors.email && <p className="font-label-sm text-label-sm text-status-red">{errors.email.message}</p>}
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-label-md text-label-md text-on-surface-variant">Password</label>
                <input
                  type="password"
                  placeholder="Temporary password (min. 6 chars)"
                  {...register('password', {
                    required: 'Password is required',
                    minLength: { value: 6, message: 'Minimum 6 characters' },
                  })}
                  className="w-full px-space-md py-space-sm border border-outline-variant rounded-lg bg-white text-on-surface focus:ring-2 focus:ring-on-tertiary-container focus:border-on-tertiary-container transition-all outline-none font-body-sm text-body-sm"
                />
                {errors.password && <p className="font-label-sm text-label-sm text-status-red">{errors.password.message}</p>}
              </div>

              <div className="flex gap-space-md pt-space-sm">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 border border-primary text-primary font-label-md text-label-md px-space-lg py-space-sm rounded-lg hover:bg-surface-container-low transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-[#0d9488] hover:bg-[#0f766e] text-white font-label-md text-label-md px-space-lg py-space-sm rounded-lg shadow-sm transition-all active:scale-[0.98] disabled:opacity-60"
                >
                  {submitting ? 'Adding…' : 'Add Officer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
