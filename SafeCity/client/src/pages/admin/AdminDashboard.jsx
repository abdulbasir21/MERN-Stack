import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import api from '../../api/axios';
import Sidebar from '../../components/Sidebar';
import Badge from '../../components/Badge';

const PIE_COLORS = ['#525b90', '#0d9488', '#b54708', '#1d70b8', '#00703c', '#667085'];

const StatCard = ({ icon, value, label, color = 'text-primary' }) => (
  <div className="bg-surface-container-lowest p-4 lg:p-space-lg rounded-xl border border-border-subtle flex flex-col items-center text-center level-1-shadow">
    <span className="material-symbols-outlined text-on-tertiary-container mb-2" style={{ fontSize: 28 }}>{icon}</span>
    <h3 className={`font-headline-md text-headline-md ${color}`}>{value ?? '–'}</h3>
    <p className="font-label-sm text-label-sm text-on-surface-variant mt-0.5">{label}</p>
  </div>
);

export default function AdminDashboard() {
  const [analytics,  setAnalytics]  = useState(null);
  const [complaints, setComplaints] = useState([]);
  const [officers,   setOfficers]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [assignMap,  setAssignMap]  = useState({});
  const [assigning,  setAssigning]  = useState(null);

  const fetchAll = async () => {
    try {
      const [analyticsRes, complaintsRes, officersRes] = await Promise.all([
        api.get('/admin/analytics'),
        api.get('/admin/complaints'),
        api.get('/admin/officers'),
      ]);
      setAnalytics(analyticsRes.data.data);
      setComplaints(complaintsRes.data.data || []);
      setOfficers(officersRes.data.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const handleAssign = async (complaintId) => {
    const officerId = assignMap[complaintId];
    if (!officerId) return toast.error('Please select an officer first');
    setAssigning(complaintId);
    try {
      await api.patch(`/admin/complaints/${complaintId}/assign`, { officerId });
      toast.success('Officer assigned successfully');
      const res = await api.get('/admin/complaints');
      setComplaints(res.data.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong');
    } finally {
      setAssigning(null);
    }
  };

  const activeOfficers = officers.filter((o) => o.isActive);

  const categoryData = analytics
    ? Object.entries(analytics.byCategory).map(([name, count]) => ({
        name: name.replace(/_/g, ' '),
        count,
      }))
    : [];

  const statusData = analytics
    ? Object.entries(analytics.byStatus).map(([name, value]) => ({
        name: name.replace(/_/g, ' '),
        value,
      }))
    : [];

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col pt-14 lg:pt-0 min-w-0">
        <header className="bg-surface-container-lowest border-b border-border-subtle h-16 flex items-center px-4 lg:px-gutter sticky top-14 lg:top-0 z-10">
          <h2 className="font-headline-md text-headline-md text-primary">Admin Dashboard</h2>
        </header>

        <main className="flex-1 p-4 lg:p-gutter overflow-x-hidden">
          {loading ? (
            <div className="flex justify-center items-center min-h-[60vh]">
              <span className="material-symbols-outlined animate-spin text-on-tertiary-container" style={{ fontSize: 40 }}>
                progress_activity
              </span>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {/* Stat cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <StatCard icon="description"  value={analytics?.total}                                              label="Total Complaints" />
                <StatCard icon="check_circle" value={analytics?.resolvedCount}                                      label="Resolved"         color="text-green-700" />
                <StatCard icon="pending"      value={analytics ? analytics.total - analytics.resolvedCount : null}  label="Pending"          color="text-amber-700" />
                <StatCard icon="badge"        value={activeOfficers.length}                                         label="Active Officers"  />
              </div>

              {/* Charts */}
              <div className="grid lg:grid-cols-2 gap-6">
                <div className="bg-surface-container-lowest border border-border-subtle rounded-xl level-1-shadow p-4 lg:p-space-lg">
                  <h2 className="font-headline-md text-headline-md text-primary mb-4">By category</h2>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={categoryData} barCategoryGap="30%">
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#44474c' }} />
                      <YAxis tick={{ fontSize: 11, fill: '#44474c' }} allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#0d9488" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-surface-container-lowest border border-border-subtle rounded-xl level-1-shadow p-4 lg:p-space-lg">
                  <h2 className="font-headline-md text-headline-md text-primary mb-4">By status</h2>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={statusData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={3}
                      >
                        {statusData.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend iconType="circle" iconSize={9} wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Recent complaints — responsive cards on mobile, table on desktop */}
              <div className="bg-surface-container-lowest border border-border-subtle rounded-xl level-1-shadow">
                <div className="p-4 lg:p-space-lg border-b border-border-subtle">
                  <h2 className="font-headline-md text-headline-md text-primary">Recent complaints</h2>
                </div>

                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left min-w-[700px]">
                    <thead className="bg-surface-container-low">
                      <tr>
                        {['Category', 'Title', 'Area', 'Status', 'Priority', 'Officer', 'Assign'].map((h) => (
                          <th key={h} className="px-4 py-3 font-label-md text-label-md text-on-surface-variant">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {complaints.slice(0, 15).map((c, i) => (
                        <tr key={c._id} className={i % 2 === 0 ? 'bg-white' : 'bg-surface-container-lowest'}>
                          <td className="px-4 py-3 font-body-sm text-body-sm text-on-surface capitalize">
                            {c.category?.replace(/_/g, ' ')}
                          </td>
                          <td className="px-4 py-3 font-body-sm text-body-sm text-on-surface max-w-[180px] truncate">
                            {c.title}
                          </td>
                          <td className="px-4 py-3 font-body-sm text-body-sm text-on-surface-variant">{c.area}</td>
                          <td className="px-4 py-3"><Badge variant={c.status} /></td>
                          <td className="px-4 py-3"><Badge variant={c.priority} type="priority" /></td>
                          <td className="px-4 py-3 font-body-sm text-body-sm text-on-surface-variant">
                            {c.assignedOfficer?.name || <span className="italic">Unassigned</span>}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <select
                                value={assignMap[c._id] || ''}
                                onChange={(e) => setAssignMap((m) => ({ ...m, [c._id]: e.target.value }))}
                                className="px-2 py-1 border border-outline-variant rounded-lg bg-white text-on-surface text-body-sm outline-none focus:ring-2 focus:ring-on-tertiary-container text-xs"
                              >
                                <option value="">Select officer</option>
                                {activeOfficers.map((o) => (
                                  <option key={o._id} value={o._id}>{o.name}</option>
                                ))}
                              </select>
                              <button
                                onClick={() => handleAssign(c._id)}
                                disabled={assigning === c._id}
                                className="bg-[#0d9488] hover:bg-[#0f766e] text-white font-label-md text-label-md px-3 py-1 rounded-lg text-xs transition-all disabled:opacity-60"
                              >
                                {assigning === c._id ? '…' : 'Assign'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="md:hidden divide-y divide-border-subtle">
                  {complaints.slice(0, 15).map((c) => (
                    <div key={c._id} className="p-4 flex flex-col gap-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-label-md text-label-md text-primary line-clamp-2">{c.title}</p>
                          <p className="font-label-sm text-label-sm text-on-surface-variant mt-0.5 capitalize">
                            {c.category?.replace(/_/g, ' ')} · {c.area}
                          </p>
                        </div>
                        <Badge variant={c.status} />
                      </div>
                      <p className="font-body-sm text-body-sm text-on-surface-variant">
                        Officer: {c.assignedOfficer?.name || <span className="italic">Unassigned</span>}
                      </p>
                      <div className="flex gap-2">
                        <select
                          value={assignMap[c._id] || ''}
                          onChange={(e) => setAssignMap((m) => ({ ...m, [c._id]: e.target.value }))}
                          className="flex-1 px-2 py-1.5 border border-outline-variant rounded-lg bg-white text-on-surface text-xs outline-none"
                        >
                          <option value="">Select officer</option>
                          {activeOfficers.map((o) => (
                            <option key={o._id} value={o._id}>{o.name}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => handleAssign(c._id)}
                          disabled={assigning === c._id}
                          className="bg-[#0d9488] hover:bg-[#0f766e] text-white px-4 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-60"
                        >
                          {assigning === c._id ? '…' : 'Assign'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {complaints.length === 0 && (
                  <p className="p-space-xl text-center text-on-surface-variant font-body-md text-body-md">
                    No complaints found.
                  </p>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
