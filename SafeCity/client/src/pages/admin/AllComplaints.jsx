import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import Sidebar from '../../components/Sidebar';
import Badge from '../../components/Badge';

const CATEGORIES = ['', 'theft', 'harassment', 'missing_person', 'fraud', 'other'];
const STATUSES   = ['', 'submitted', 'under_review', 'assigned', 'investigating', 'resolved', 'closed'];
const PRIORITIES = ['', 'normal', 'high', 'urgent'];

export default function AllComplaints() {
  const navigate = useNavigate();
  const [complaints, setComplaints] = useState([]);
  const [count,      setCount]      = useState(0);
  const [officers,   setOfficers]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [assignMap,  setAssignMap]  = useState({});
  const [assigning,  setAssigning]  = useState(null);

  // Filters
  const [category,   setCategory]   = useState('');
  const [status,     setStatus]     = useState('');
  const [area,       setArea]       = useState('');
  const [priority,   setPriority]   = useState('');
  const [areaInput,  setAreaInput]  = useState('');

  // Fetch officers once
  useEffect(() => {
    api.get('/admin/officers')
      .then((res) => setOfficers((res.data.data || []).filter((o) => o.isActive)))
      .catch((err) => toast.error(err.response?.data?.message || 'Could not load officers'));
  }, []);

  // Fetch complaints on filter change
  const fetchComplaints = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (category) params.append('category', category);
      if (status)   params.append('status',   status);
      if (area)     params.append('area',     area);
      if (priority) params.append('priority', priority);
      const query = params.toString();
      const res = await api.get(`/admin/complaints${query ? `?${query}` : ''}`);
      setComplaints(res.data.data || []);
      setCount(res.data.count ?? res.data.data?.length ?? 0);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }, [category, status, area, priority]);

  useEffect(() => { fetchComplaints(); }, [fetchComplaints]);

  // Debounce area input
  useEffect(() => {
    const t = setTimeout(() => setArea(areaInput), 400);
    return () => clearTimeout(t);
  }, [areaInput]);

  const handleReassign = async (complaintId) => {
    const officerId = assignMap[complaintId];
    if (!officerId) return toast.error('Please select an officer first');
    setAssigning(complaintId);
    try {
      await api.patch(`/admin/complaints/${complaintId}/assign`, { officerId });
      toast.success('Officer reassigned successfully');
      fetchComplaints();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong');
    } finally {
      setAssigning(null);
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <header className="bg-surface-container-lowest border-b border-border-subtle h-16 flex items-center px-gutter sticky top-0 z-10">
          <h2 className="font-headline-md text-headline-md text-primary">All Complaints</h2>
        </header>

        <main className="flex-1 p-gutter flex flex-col gap-space-xl">
          <p className="font-body-sm text-body-sm text-on-surface-variant -mt-space-md">
            Filter, view, and reassign complaints across the city.
          </p>

          {/* Filter bar */}
          <div className="bg-surface-container-lowest border border-border-subtle rounded-xl level-1-shadow p-space-lg flex flex-wrap gap-space-md">
            <div className="flex flex-col gap-1 flex-1 min-w-[140px]">
              <label className="font-label-md text-label-md text-on-surface-variant">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-space-md py-space-sm border border-outline-variant rounded-lg bg-white text-on-surface focus:ring-2 focus:ring-on-tertiary-container outline-none font-body-sm text-body-sm"
              >
                <option value="">All categories</option>
                {CATEGORIES.filter(Boolean).map((c) => (
                  <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1 flex-1 min-w-[140px]">
              <label className="font-label-md text-label-md text-on-surface-variant">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-space-md py-space-sm border border-outline-variant rounded-lg bg-white text-on-surface focus:ring-2 focus:ring-on-tertiary-container outline-none font-body-sm text-body-sm"
              >
                <option value="">All statuses</option>
                {STATUSES.filter(Boolean).map((s) => (
                  <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1 flex-1 min-w-[140px]">
              <label className="font-label-md text-label-md text-on-surface-variant">Area</label>
              <input
                type="text"
                value={areaInput}
                onChange={(e) => setAreaInput(e.target.value)}
                placeholder="Search by area..."
                className="w-full px-space-md py-space-sm border border-outline-variant rounded-lg bg-white text-on-surface focus:ring-2 focus:ring-on-tertiary-container focus:border-on-tertiary-container transition-all outline-none font-body-sm text-body-sm"
              />
            </div>

            <div className="flex flex-col gap-1 flex-1 min-w-[140px]">
              <label className="font-label-md text-label-md text-on-surface-variant">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-space-md py-space-sm border border-outline-variant rounded-lg bg-white text-on-surface focus:ring-2 focus:ring-on-tertiary-container outline-none font-body-sm text-body-sm"
              >
                <option value="">All priorities</option>
                {PRIORITIES.filter(Boolean).map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Count */}
          <p className="font-label-md text-label-md text-on-surface-variant -mt-space-md">
            {loading ? 'Loading…' : `${count} complaint${count !== 1 ? 's' : ''} found`}
          </p>

          {/* Table */}
          <div className="bg-surface-container-lowest border border-border-subtle rounded-xl level-1-shadow overflow-x-auto">
            <table className="w-full text-left min-w-[900px]">
              <thead className="bg-surface-container-low">
                <tr>
                  {['Category', 'Title', 'Area', 'Status', 'Priority', 'Assigned Officer', 'Actions'].map((h) => (
                    <th key={h} className="px-space-md py-space-sm font-label-md text-label-md text-on-surface-variant">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-space-md py-space-xl text-center text-on-surface-variant">
                      <span className="material-symbols-outlined animate-spin text-on-tertiary-container" style={{ fontSize: 30 }}>
                        progress_activity
                      </span>
                    </td>
                  </tr>
                ) : complaints.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-space-md py-space-xl text-center text-on-surface-variant font-body-md text-body-md">
                      No complaints match the selected filters.
                    </td>
                  </tr>
                ) : (
                  complaints.map((c, i) => (
                    <tr key={c._id} className={i % 2 === 0 ? 'bg-white' : 'bg-surface-container-lowest'}>
                      <td className="px-space-md py-space-sm font-body-sm text-body-sm text-on-surface capitalize">
                        {c.category?.replace(/_/g, ' ')}
                      </td>
                      <td className="px-space-md py-space-sm font-body-sm text-body-sm text-on-surface max-w-[180px] truncate">
                        {c.title}
                      </td>
                      <td className="px-space-md py-space-sm font-body-sm text-body-sm text-on-surface-variant">
                        {c.area}
                      </td>
                      <td className="px-space-md py-space-sm">
                        <Badge variant={c.status} />
                      </td>
                      <td className="px-space-md py-space-sm">
                        <Badge variant={c.priority} type="priority" />
                      </td>
                      <td className="px-space-md py-space-sm font-body-sm text-body-sm text-on-surface-variant">
                        {c.assignedOfficer?.name || <span className="italic">Unassigned</span>}
                      </td>
                      <td className="px-space-md py-space-sm">
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            onClick={() => navigate(`/complaint/${c._id}`)}
                            className="border border-primary text-primary font-label-md text-label-md px-3 py-1 rounded-lg hover:bg-surface-container-low transition-all text-sm"
                          >
                            View
                          </button>
                          <select
                            value={assignMap[c._id] || ''}
                            onChange={(e) => setAssignMap((m) => ({ ...m, [c._id]: e.target.value }))}
                            className="px-2 py-1 border border-outline-variant rounded-lg bg-white text-on-surface text-body-sm outline-none focus:ring-2 focus:ring-on-tertiary-container"
                          >
                            <option value="">Officer…</option>
                            {officers.map((o) => (
                              <option key={o._id} value={o._id}>{o.name}</option>
                            ))}
                          </select>
                          <button
                            onClick={() => handleReassign(c._id)}
                            disabled={assigning === c._id}
                            className="bg-[#0d9488] hover:bg-[#0f766e] text-white font-label-md text-label-md px-3 py-1 rounded-lg text-sm transition-all disabled:opacity-60"
                          >
                            {assigning === c._id ? '…' : 'Reassign'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </main>
      </div>
    </div>
  );
}
