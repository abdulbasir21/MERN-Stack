"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  LayoutDashboard,
  Clock,
  CheckCircle,
  Stethoscope,
  Users,
  LogOut,
  ChevronRight,
  Calendar,
  Activity,
  Shield,
  Heart,
  Check,
  X,
} from "lucide-react";

// ─── Donut Chart from real appointmentsByStatus ──────────────────
function AppointmentDonut({ data, size = 130, thickness = 20 }) {
  const segments = [
    { label: "Pending",   value: data.pending   || 0, color: "#F59E0B" },
    { label: "Confirmed", value: data.confirmed || 0, color: "#4A90D9" },
    { label: "Completed", value: data.completed || 0, color: "#10B981" },
    { label: "Cancelled", value: data.cancelled || 0, color: "#EF4444" },
  ];
  const total = segments.reduce((a, s) => a + s.value, 0);

  useEffect(() => {
    const canvas = document.getElementById("appt-donut");
    if (!canvas || total === 0) return;
    const ctx = canvas.getContext("2d");
    const cx = size / 2, cy = size / 2, r = (size - thickness) / 2;
    ctx.clearRect(0, 0, size, size);
    let start = -Math.PI / 2;
    segments.forEach(({ value, color }) => {
      if (value === 0) return;
      const angle = (value / total) * 2 * Math.PI;
      ctx.beginPath();
      ctx.arc(cx, cy, r, start, start + angle);
      ctx.lineWidth = thickness;
      ctx.strokeStyle = color;
      ctx.lineCap = "butt";
      ctx.stroke();
      start += angle + 0.02;
    });
  }, [data, size, thickness, total, segments]);

  return (
    <div className="flex items-center gap-5">
      <div className="relative flex-shrink-0">
        <canvas id="appt-donut" width={size} height={size} />
        {/* Centre label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-xl font-bold text-white">{total}</span>
          <span className="text-[10px] text-white/40">Total</span>
        </div>
      </div>
      {/* Legend */}
      <div className="flex flex-col gap-2.5 flex-1">
        {segments.map(s => {
          const pct = total > 0 ? Math.round((s.value / total) * 100) : 0;
          return (
            <div key={s.label} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: s.color }} />
                <span className="text-xs text-white/55">{s.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold" style={{ color: s.color }}>{s.value}</span>
                <span className="text-[10px] text-white/30">{pct}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Horizontal Bar Chart from real appointmentsByStatus ─────────
function AppointmentBars({ data }) {
  const segments = [
    { label: "Completed", value: data.completed || 0, color: "#10B981", bg: "bg-emerald-500/10 border-emerald-500/20", text: "text-emerald-400" },
    { label: "Confirmed", value: data.confirmed || 0, color: "#4A90D9", bg: "bg-blue-500/10 border-blue-500/20",    text: "text-blue-400"    },
    { label: "Pending",   value: data.pending   || 0, color: "#F59E0B", bg: "bg-amber-500/10 border-amber-500/20",  text: "text-amber-400"  },
    { label: "Cancelled", value: data.cancelled || 0, color: "#EF4444", bg: "bg-red-500/10 border-red-500/20",      text: "text-red-400"    },
  ];
  const max = Math.max(...segments.map(s => s.value), 1);

  return (
    <div className="flex flex-col gap-3">
      {segments.map(s => (
        <div key={s.label}>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-white/55">{s.label}</span>
            <span className={`text-xs font-bold ${s.text}`}>{s.value}</span>
          </div>
          <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${(s.value / max) * 100}%`, background: s.color }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Doctors vs Patients ratio visual ───────────────────────────
function StaffRatioBar({ doctors, patients }) {
  const total = (doctors || 0) + (patients || 0);
  const docPct = total > 0 ? Math.round((doctors / total) * 100) : 0;
  const patPct = total > 0 ? 100 - docPct : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-blue-500" />
          <span className="text-xs text-white/55">Doctors</span>
          <span className="text-xs font-bold text-blue-400 ml-1">{doctors || 0}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-emerald-400 mr-1">{patients || 0}</span>
          <span className="text-xs text-white/55">Patients</span>
          <div className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
        </div>
      </div>
      <div className="h-3 w-full rounded-full overflow-hidden flex">
        <div className="h-full bg-blue-500 transition-all duration-700" style={{ width: `${docPct}%` }} />
        <div className="h-full bg-emerald-500 transition-all duration-700" style={{ width: `${patPct}%` }} />
      </div>
      <div className="flex justify-between mt-1.5">
        <span className="text-[10px] text-white/30">{docPct}% of platform</span>
        <span className="text-[10px] text-white/30">{patPct}% of platform</span>
      </div>
    </div>
  );
}

// ─── Approval rate radial (SVG arc) ─────────────────────────────
function ApprovalGauge({ approved, pending }) {
  const total = (approved || 0) + (pending || 0);
  const pct = total > 0 ? Math.round((approved / total) * 100) : 0;
  const R = 44, cx = 56, cy = 56, stroke = 10;
  const circumference = 2 * Math.PI * R;
  const dash = (pct / 100) * circumference;

  return (
    <div className="flex items-center gap-5">
      <div className="relative flex-shrink-0">
        <svg width={112} height={112} viewBox="0 0 112 112">
          <circle cx={cx} cy={cy} r={R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
          <circle cx={cx} cy={cy} r={R} fill="none" stroke="#10B981" strokeWidth={stroke}
            strokeDasharray={`${dash} ${circumference}`}
            strokeLinecap="round"
            transform={`rotate(-90 ${cx} ${cy})`} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-xl font-bold text-white">{pct}%</span>
          <span className="text-[9px] text-white/40 text-center leading-tight">Approval<br />Rate</span>
        </div>
      </div>
      <div className="flex flex-col gap-3 flex-1">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-sm bg-emerald-500" />
            <span className="text-xs text-white/55">Approved</span>
          </div>
          <span className="text-2xl font-bold text-emerald-400">{approved || 0}</span>
        </div>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-sm bg-amber-500" />
            <span className="text-xs text-white/55">Pending</span>
          </div>
          <span className="text-2xl font-bold text-amber-400">{pending || 0}</span>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
export default function AdminDashboard() {
  const [tab, setTab] = useState("overview");
  const [analytics, setAnalytics] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/admin/analytics", { credentials: "include" })
      .then(res => {
        if (res.status === 401 || res.status === 403) { router.push("/login"); return null; }
        return res.json();
      })
      .then(data => { if (data) setAnalytics(data.analytics); })
      .finally(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    if (tab === "overview") return;
    if (tab === "patients") {
      fetch("/api/admin/patients", { credentials: "include" })
        .then(r => r.json())
        .then(d => setPatients(d.patients || []));
      return;
    }
    const approvedParam = tab === "pending" ? "false" : tab === "approved" ? "true" : "";
    fetch(`/api/admin/doctors?approved=${approvedParam}`, { credentials: "include" })
      .then(r => r.json())
      .then(d => setDoctors(d.doctors || []));
  }, [tab]);

  const handleAction = async (id, approve) => {
    setActionId(id);
    try {
      const res = await fetch(`/api/admin/doctors/${id}/approve`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approve }),
      });
      if (res.ok) {
        setDoctors(prev => prev.filter(d => d._id !== id));
        fetch("/api/admin/analytics", { credentials: "include" })
          .then(r => r.json())
          .then(d => { if (d) setAnalytics(d.analytics); });
      }
    } finally {
      setActionId(null);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    localStorage.clear();
    router.push("/");
  };

  if (loading) return (
    <div className="min-h-screen bg-[#00072D] flex items-center justify-center">
      <div className="animate-spin h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full" />
    </div>
  );

  const statCards = analytics ? [
    { label: "Total Patients",     value: analytics.totalUsers,        icon: Users,       color: "from-blue-700 to-blue-600",    glow: "shadow-blue-500/30"    },
    { label: "Approved Doctors",   value: analytics.totalDoctors,      icon: Stethoscope, color: "from-emerald-700 to-emerald-600", glow: "shadow-emerald-500/30" },
    { label: "Pending Approvals",  value: analytics.pendingDoctors,    icon: Clock,       color: "from-amber-600 to-amber-500",   glow: "shadow-amber-500/30"   },
    { label: "Total Appointments", value: analytics.totalAppointments, icon: Calendar,    color: "from-purple-700 to-purple-600", glow: "shadow-purple-500/30"  },
  ] : [];

  const apptStats = analytics?.appointmentsByStatus ? [
    { label: "Pending",   value: analytics.appointmentsByStatus.pending,   color: "text-amber-400",   bg: "bg-amber-500/10 border-amber-500/20"    },
    { label: "Confirmed", value: analytics.appointmentsByStatus.confirmed, color: "text-blue-400",    bg: "bg-blue-500/10 border-blue-500/20"      },
    { label: "Completed", value: analytics.appointmentsByStatus.completed, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
    { label: "Cancelled", value: analytics.appointmentsByStatus.cancelled, color: "text-red-400",     bg: "bg-red-500/10 border-red-500/20"         },
  ] : [];

  const tabConfig = [
    { id: "overview",    label: "Overview",   icon: LayoutDashboard },
    { id: "pending",     label: "Pending",    icon: Clock,          badge: analytics?.pendingDoctors },
    { id: "approved",    label: "Approved",   icon: CheckCircle     },
    { id: "all-doctors", label: "All Doctors", icon: Stethoscope    },
    { id: "patients",    label: "Patients",   icon: Users           },
  ];

  return (
    <div className="min-h-screen bg-[#00072D] text-white">

      {/* ── Nav ── */}
      <nav className="bg-white/5 border-b border-white/10 backdrop-blur-md px-6 py-4 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Shield size={16} className="text-white" />
            </div>
            <div>
              <p className="font-bold text-sm">Admin Panel</p>
              <p className="text-white/40 text-xs">MedLink Control Center</p>
            </div>
          </div>
          <button onClick={handleLogout}
            className="flex items-center gap-2 text-white/60 hover:text-white text-sm transition-colors px-3 py-1.5 rounded-lg hover:bg-white/10">
            <LogOut size={14} />
            Logout
          </button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* ── Tabs ── */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-1">
          {tabConfig.map(t => {
            const Icon = t.icon;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                  tab === t.id
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30"
                    : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
                }`}>
                <Icon size={14} />
                {t.label}
                {t.badge > 0 && (
                  <span className="bg-amber-500 text-black text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {t.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ══ OVERVIEW ══ */}
        {tab === "overview" && (
          <div>
            <h1 className="text-2xl font-bold mb-6">Dashboard Overview</h1>

            {/* Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {statCards.map(card => {
                const Icon = card.icon;
                return (
                  <div key={card.label}
                    className={`bg-gradient-to-br ${card.color} rounded-2xl p-5 shadow-lg ${card.glow} relative overflow-hidden`}>
                    <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center mb-3">
                      <Icon size={18} className="text-white" />
                    </div>
                    <p className="text-4xl font-bold">{card.value?.toLocaleString() ?? 0}</p>
                    <p className="text-sm mt-1 opacity-80">{card.label}</p>
                    <div className="absolute -bottom-4 -right-4 w-20 h-20 rounded-full bg-white/10" />
                  </div>
                );
              })}
            </div>

            {/* ── Visualizations from real data ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">

              {/* Donut — appointmentsByStatus */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Activity size={15} className="text-blue-400" />
                  <h2 className="text-sm font-semibold">Appointments Breakdown</h2>
                </div>
                {analytics?.appointmentsByStatus ? (
                  <AppointmentDonut data={analytics.appointmentsByStatus} />
                ) : (
                  <p className="text-white/30 text-xs">No data</p>
                )}
              </div>

              {/* Horizontal bars — appointmentsByStatus */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Activity size={15} className="text-blue-400" />
                  <h2 className="text-sm font-semibold">Appointments by Status</h2>
                </div>
                {analytics?.appointmentsByStatus ? (
                  <AppointmentBars data={analytics.appointmentsByStatus} />
                ) : (
                  <p className="text-white/30 text-xs">No data</p>
                )}
              </div>

              {/* Approval gauge — totalDoctors + pendingDoctors */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle size={15} className="text-blue-400" />
                  <h2 className="text-sm font-semibold">Doctor Approval Rate</h2>
                </div>
                {analytics ? (
                  <ApprovalGauge
                    approved={analytics.totalDoctors}
                    pending={analytics.pendingDoctors}
                  />
                ) : (
                  <p className="text-white/30 text-xs">No data</p>
                )}
              </div>
            </div>

            {/* ── Second row ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

              {/* Doctors vs Patients ratio */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Users size={15} className="text-blue-400" />
                  <h2 className="text-sm font-semibold">Doctors vs Patients</h2>
                </div>
                {analytics ? (
                  <StaffRatioBar
                    doctors={analytics.totalDoctors}
                    patients={analytics.totalUsers}
                  />
                ) : (
                  <p className="text-white/30 text-xs">No data</p>
                )}
              </div>

              {/* Quick Actions */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <ChevronRight size={15} className="text-blue-400" />
                  <h2 className="text-sm font-semibold">Quick Actions</h2>
                </div>
                <div className="flex flex-col gap-3">
                  <button onClick={() => setTab("pending")}
                    className="flex items-center justify-between bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 rounded-xl p-3.5 transition-all group">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center flex-shrink-0">
                        <Clock size={14} className="text-amber-400" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-medium">Review Pending Doctors</p>
                        <p className="text-xs text-white/40">{analytics?.pendingDoctors || 0} awaiting approval</p>
                      </div>
                    </div>
                    <ChevronRight size={14} className="text-white/30 group-hover:text-white/60 transition-colors" />
                  </button>
                  <button onClick={() => setTab("patients")}
                    className="flex items-center justify-between bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-xl p-3.5 transition-all group">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center flex-shrink-0">
                        <Users size={14} className="text-blue-400" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-medium">View All Patients</p>
                        <p className="text-xs text-white/40">{analytics?.totalUsers || 0} registered</p>
                      </div>
                    </div>
                    <ChevronRight size={14} className="text-white/30 group-hover:text-white/60 transition-colors" />
                  </button>
                  <button onClick={() => setTab("all-doctors")}
                    className="flex items-center justify-between bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-xl p-3.5 transition-all group">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
                        <Stethoscope size={14} className="text-emerald-400" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-medium">Browse All Doctors</p>
                        <p className="text-xs text-white/40">{analytics?.totalDoctors || 0} approved</p>
                      </div>
                    </div>
                    <ChevronRight size={14} className="text-white/30 group-hover:text-white/60 transition-colors" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══ DOCTOR TABS ══ */}
        {["pending", "approved", "all-doctors"].includes(tab) && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">
                {tab === "pending" ? "Pending Applications" : tab === "approved" ? "Approved Doctors" : "All Doctors"}
              </h2>
              <span className="text-white/40 text-sm">{doctors.length} found</span>
            </div>
            {doctors.length === 0 ? (
              <div className="text-center py-20 text-white/40">
                <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
                  <Stethoscope size={28} className="text-white/20" />
                </div>
                <p className="text-lg">No doctors found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {doctors.map(doctor => (
                  <div key={doctor._id}
                    className="bg-white/5 hover:bg-white/[0.07] border border-white/10 rounded-2xl p-5 flex items-center gap-5 transition-all">
                    {/* Avatar */}
                    <div className="relative w-14 h-14 rounded-2xl overflow-hidden shrink-0 bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center text-xl font-bold shadow-lg">
                      {doctor.image ? (
                        <Image src={doctor.image} alt={doctor.name} fill className="object-cover" />
                      ) : (
                        <span>{doctor.name[0]}</span>
                      )}
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold">{doctor.name}</p>
                      <p className="text-sm text-white/60">{doctor.specialization} · {doctor.experience}y exp</p>
                      <p className="text-xs text-white/40 truncate">{doctor.email}</p>
                      {doctor.createdAt && (
                        <p className="text-xs text-white/25 mt-0.5">Applied {new Date(doctor.createdAt).toLocaleDateString()}</p>
                      )}
                    </div>
                    {/* Status Badge */}
                    <span className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-medium shrink-0 ${
                      doctor.isApproved
                        ? "bg-emerald-600/20 text-emerald-300 border border-emerald-500/30"
                        : "bg-amber-600/20 text-amber-300 border border-amber-500/30"
                    }`}>
                      {doctor.isApproved ? <><CheckCircle size={11} /> Approved</> : <><Clock size={11} /> Pending</>}
                    </span>
                    {/* Actions */}
                    <div className="flex gap-2 shrink-0">
                      {!doctor.isApproved && (
                        <button onClick={() => handleAction(doctor._id, true)}
                          disabled={actionId === doctor._id}
                          className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 px-4 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-50 shadow-lg shadow-emerald-500/20">
                          {actionId === doctor._id
                            ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            : <Check size={14} />}
                          Approve
                        </button>
                      )}
                      {doctor.isApproved && (
                        <button onClick={() => handleAction(doctor._id, false)}
                          disabled={actionId === doctor._id}
                          className="flex items-center gap-1.5 bg-red-600 hover:bg-red-500 px-4 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-50 shadow-lg shadow-red-500/20">
                          {actionId === doctor._id
                            ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            : <X size={14} />}
                          Reject
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══ PATIENTS TAB ══ */}
        {tab === "patients" && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Registered Patients</h2>
              <span className="text-white/40 text-sm">{patients.length} found</span>
            </div>
            {patients.length === 0 ? (
              <div className="text-center py-20 text-white/40">
                <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
                  <Users size={28} className="text-white/20" />
                </div>
                <p>No patients found</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {patients.map(patient => (
                  <div key={patient._id}
                    className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-emerald-600 flex items-center justify-center text-lg font-bold shrink-0">
                      {patient.name?.[0]?.toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{patient.name}</p>
                      <p className="text-sm text-white/50 truncate">{patient.email}</p>
                      {patient.createdAt && (
                        <p className="text-xs text-white/30 mt-0.5">Joined {new Date(patient.createdAt).toLocaleDateString()}</p>
                      )}
                    </div>
                    <div className="ml-auto shrink-0 flex items-center gap-1.5 text-xs bg-blue-600/20 text-blue-300 border border-blue-500/20 px-2.5 py-1 rounded-full">
                      <Heart size={10} />
                      Patient
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}