"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

// Circular progress ring
function RingProgress({ percent, color, size = 80, stroke = 7, label, value }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (percent / 100) * circ;
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size}>
          <circle cx={size/2} cy={size/2} r={r} fill="none"
            stroke="rgba(255,255,255,0.07)" strokeWidth={stroke} />
          <circle cx={size/2} cy={size/2} r={r} fill="none"
            stroke={color} strokeWidth={stroke}
            strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
            transform={`rotate(-90 ${size/2} ${size/2})`}
            style={{ filter: `drop-shadow(0 0 6px ${color})` }} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-white font-bold text-sm">{value}</span>
        </div>
      </div>
      <span className="text-white/40 text-[10px] uppercase tracking-widest">{label}</span>
    </div>
  );
}

function PulseDot({ color }) {
  return (
    <span className="relative flex h-2.5 w-2.5">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60"
        style={{ background: color }} />
      <span className="relative inline-flex rounded-full h-2.5 w-2.5"
        style={{ background: color }} />
    </span>
  );
}

export default function DoctorDashboard() {
  const [doctor, setDoctor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState([]);
  const [apptLoading, setApptLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/auth/doctor", { credentials: "include" })
      .then(res => {
        if (res.status === 401 || res.status === 403) { router.push("/login"); return null; }
        return res.json();
      })
      .then(data => { if (data) setDoctor(data); })
      .catch(() => router.push("/login"))
      .finally(() => setLoading(false));
  }, [router]);

  // Fetch appointments once doctor is loaded and approved
  useEffect(() => {
    if (!doctor?.isApproved) return;
    const doctorId = localStorage.getItem("doctorId");
    if (!doctorId) return;
    setApptLoading(true);
    fetch(`/api/appointments/doctor/${doctorId}`, { credentials: "include" })
      .then(res => res.json())
      .then(data => { if (data?.appointments) setAppointments(data.appointments); })
      .catch(() => {})
      .finally(() => setApptLoading(false));
  }, [doctor]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    localStorage.clear();
    router.push("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#00072D] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full" />
          <p className="text-white/40 text-xs tracking-widest uppercase">Loading Dashboard</p>
        </div>
      </div>
    );
  }

  if (!doctor) return null;

  const isPending = !doctor.isApproved && !doctor.isRejected;
  const isApproved = doctor.isApproved;
  const isRejected = doctor.isRejected;

  // Real appointment counts from API
  const total     = appointments.length;
  const pending   = appointments.filter(a => a.status === "pending").length;
  const confirmed = appointments.filter(a => a.status === "confirmed").length;
  const completed = appointments.filter(a => a.status === "completed").length;
  const cancelled = appointments.filter(a => a.status === "cancelled").length;

  const statusStats = [
    { label: "Pending",   count: pending,   color: "#f59e0b", bg: "rgba(245,158,11,0.12)",  border: "rgba(245,158,11,0.25)" },
    { label: "Confirmed", count: confirmed, color: "#3b82f6", bg: "rgba(59,130,246,0.12)",  border: "rgba(59,130,246,0.25)" },
    { label: "Completed", count: completed, color: "#22c55e", bg: "rgba(34,197,94,0.12)",   border: "rgba(34,197,94,0.25)"  },
    { label: "Cancelled", count: cancelled, color: "#ef4444", bg: "rgba(239,68,68,0.12)",   border: "rgba(239,68,68,0.25)"  },
  ];

  return (
    <div className="min-h-screen bg-[#00072D] text-white relative overflow-hidden"
      style={{ fontFamily: "'DM Sans', sans-serif" }}>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Syne:wght@700;800&display=swap');
        .dash-heading { font-family: 'Syne', sans-serif; }
        .glow-bg-blue {
          background: radial-gradient(circle at 15% 15%, rgba(37,99,235,0.18) 0%, transparent 55%),
                      radial-gradient(circle at 85% 85%, rgba(37,99,235,0.10) 0%, transparent 50%);
        }
        .card-glass {
          background: linear-gradient(135deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.02) 100%);
          backdrop-filter: blur(24px);
          border: 1px solid rgba(255,255,255,0.09);
          box-shadow: 0 20px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.07);
        }
        .card-glass-yellow {
          background: linear-gradient(135deg, rgba(250,204,21,0.07) 0%, rgba(255,255,255,0.02) 100%);
          backdrop-filter: blur(24px);
          border: 1px solid rgba(250,204,21,0.15);
          box-shadow: 0 20px 60px rgba(0,0,0,0.5), 0 0 60px rgba(250,204,21,0.05);
        }
        .card-glass-red {
          background: linear-gradient(135deg, rgba(239,68,68,0.07) 0%, rgba(255,255,255,0.02) 100%);
          backdrop-filter: blur(24px);
          border: 1px solid rgba(239,68,68,0.15);
          box-shadow: 0 20px 60px rgba(0,0,0,0.5), 0 0 60px rgba(239,68,68,0.05);
        }
        .action-card {
          background: linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255,255,255,0.08);
          transition: all 0.3s ease;
        }
        .action-card:hover {
          border-color: rgba(37,99,235,0.4);
          box-shadow: 0 0 30px rgba(37,99,235,0.15), 0 8px 32px rgba(0,0,0,0.4);
          transform: translateY(-2px);
        }
        .action-card.green:hover {
          border-color: rgba(34,197,94,0.4);
          box-shadow: 0 0 30px rgba(34,197,94,0.12), 0 8px 32px rgba(0,0,0,0.4);
        }
        .divider {
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(37,99,235,0.4), transparent);
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .fade-up   { animation: fadeUp 0.5s ease forwards; }
        .fade-up-1 { opacity: 0; animation: fadeUp 0.5s ease 0.1s forwards; }
        .fade-up-2 { opacity: 0; animation: fadeUp 0.5s ease 0.2s forwards; }
        .fade-up-3 { opacity: 0; animation: fadeUp 0.5s ease 0.3s forwards; }
        .fade-up-4 { opacity: 0; animation: fadeUp 0.5s ease 0.4s forwards; }
        .nav-blur {
          background: rgba(0,7,45,0.7);
          backdrop-filter: blur(28px);
          border-bottom: 1px solid rgba(255,255,255,0.07);
        }
        .pending-lock-card {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          transition: background 0.2s;
        }
        .pending-lock-card:hover { background: rgba(37,99,235,0.08); }
        .status-bar-track {
          background: rgba(255,255,255,0.06);
          border-radius: 99px;
          overflow: hidden;
          height: 4px;
        }
      `}</style>

      {/* Background */}
      <div className="absolute inset-0 glow-bg-blue pointer-events-none" />
      <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(37,99,235,0.07) 0%, transparent 70%)" }} />

      {/* ── NAVBAR ── */}
     

      <div className="max-w-6xl mx-auto px-6 py-10 relative z-10">

        {/* ══════════ PENDING ══════════ */}
        {isPending && (
          <div className="space-y-5">
            <div className="card-glass-yellow rounded-[32px] p-10 text-center fade-up">
              <div className="flex justify-center mb-7">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full flex items-center justify-center"
                    style={{ background: "rgba(250,204,21,0.12)", border: "1px solid rgba(250,204,21,0.2)", boxShadow: "0 0 40px rgba(250,204,21,0.15)" }}>
                    <svg className="w-12 h-12 text-yellow-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-yellow-400 flex items-center justify-center text-[9px] text-black font-bold">!</span>
                </div>
              </div>
              <h2 className="dash-heading text-3xl text-yellow-200 mb-3">Pending Approval</h2>
              <p className="text-white/50 max-w-md mx-auto text-sm leading-relaxed">
                Your application is under review by the admin team. Full dashboard access unlocks once approved — typically within 1–2 business days.
              </p>
              <div className="mt-8 max-w-xs mx-auto">
                <div className="flex justify-between text-[10px] text-white/30 mb-2 uppercase tracking-wider">
                  <span>Submitted</span><span>Under Review</span><span>Approved</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full w-1/2 rounded-full"
                    style={{ background: "linear-gradient(90deg, #f59e0b, #fde68a)", boxShadow: "0 0 10px rgba(245,158,11,0.5)" }} />
                </div>
              </div>
              <div className="mt-10 grid grid-cols-3 gap-4 opacity-40 pointer-events-none select-none">
                {[
                  { label: "View Appointments", icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
                  { label: "Manage Schedule",   icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
                  { label: "Patient Requests",  icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0" },
                ].map(item => (
                  <div key={item.label} className="pending-lock-card rounded-2xl p-5">
                    <div className="w-9 h-9 rounded-xl bg-blue-600/20 mx-auto mb-3 flex items-center justify-center">
                      <svg className="w-4 h-4 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                      </svg>
                    </div>
                    <p className="text-xs text-white/60 text-center">{item.label}</p>
                  </div>
                ))}
              </div>
              <p className="text-white/20 text-[10px] mt-4 uppercase tracking-widest">Unlocked after approval</p>
            </div>

            <div className="card-glass rounded-[28px] p-7 fade-up-1">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-1 h-5 rounded-full bg-blue-500" />
                <h3 className="font-semibold text-white">Application Details</h3>
              </div>
              <div className="divider mb-6" />
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "Full Name",      value: doctor.name,             icon: "👤" },
                  { label: "Email",          value: doctor.email,            icon: "✉️" },
                  { label: "Specialization", value: doctor.specialization,   icon: "🩺" },
                  { label: "Experience",     value: `${doctor.experience} years`, icon: "📅" },
                ].map(item => (
                  <div key={item.label} className="flex items-start gap-3 p-4 rounded-2xl"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <span className="text-base mt-0.5">{item.icon}</span>
                    <div>
                      <p className="text-[10px] text-white/30 uppercase tracking-widest mb-1">{item.label}</p>
                      <p className="text-sm text-white font-medium">{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ══════════ APPROVED ══════════ */}
        {isApproved && (
          <div>

            {/* Welcome */}
            <div className="fade-up mb-8 flex items-start justify-between">
              <div>
                <p className="text-blue-400/70 text-xs uppercase tracking-widest mb-1">Dashboard</p>
                <h1 className="dash-heading text-4xl text-white leading-tight">
                  Welcome back,<br />
                  <span style={{ color: "#60a5fa" }}>Dr. {doctor.name}</span>
                </h1>
                <p className="text-white/40 text-sm mt-2">Your account is active and verified</p>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-2xl"
                style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)" }}>
                <PulseDot color="#22c55e" />
                <span className="text-green-300 text-xs font-medium">Online</span>
              </div>
            </div>

            <div className="divider mb-8" />

            {/* ── Stats row: Experience + Status + Total Appointments ── */}
            <div className="grid grid-cols-3 gap-5 mb-8 fade-up-1">

              <div className="card-glass rounded-[28px] p-6 flex flex-col items-center justify-center gap-3">
                <RingProgress
                  percent={Math.min((doctor.experience / 20) * 100, 100)}
                  color="#3b82f6" size={90} stroke={8}
                  label="Experience" value={`${doctor.experience}y`} />
                <p className="text-white/50 text-xs text-center">{doctor.specialization}</p>
              </div>

              <div className="card-glass rounded-[28px] p-6 flex flex-col items-center justify-center gap-3">
                <RingProgress
                  percent={100}
                  color="#22c55e" size={90} stroke={8}
                  label="Status" value="✓" />
                <p className="text-white/50 text-xs text-center">Verified Doctor</p>
              </div>

              {/* Total appointments — real data */}
              <div className="card-glass rounded-[28px] p-6 flex flex-col justify-center items-center gap-2">
                {apptLoading ? (
                  <div className="animate-spin h-7 w-7 border-2 border-blue-400 border-t-transparent rounded-full" />
                ) : (
                  <>
                    <p className="dash-heading text-5xl text-white" style={{ lineHeight: 1 }}>{total}</p>
                    <p className="text-white/40 text-xs uppercase tracking-widest mt-1">Total Appointments</p>
                    {total > 0 && (
                      <div className="w-full mt-3 status-bar-track">
                        <div className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${Math.round((completed / total) * 100)}%`,
                            background: "linear-gradient(90deg, #3b82f6, #22c55e)",
                            boxShadow: "0 0 8px rgba(34,197,94,0.4)",
                          }} />
                      </div>
                    )}
                    {total > 0 && (
                      <p className="text-white/25 text-[10px]">
                        {Math.round((completed / total) * 100)}% completed
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* ── Appointments by Status — real data ── */}
            <div className="card-glass rounded-[28px] p-6 mb-8 fade-up-2">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-5 rounded-full bg-blue-500" />
                  <h3 className="font-semibold text-white text-sm">Appointments by Status</h3>
                </div>
                <Link href="/doctor-dashboard/home"
                  className="text-[10px] text-blue-400 hover:text-blue-300 transition-colors uppercase tracking-wider">
                  View All →
                </Link>
              </div>

              {apptLoading ? (
                <div className="flex justify-center py-6">
                  <div className="animate-spin h-6 w-6 border-2 border-blue-400 border-t-transparent rounded-full" />
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-3">
                  {statusStats.map(s => (
                    <div key={s.label} className="rounded-2xl p-4 flex flex-col items-center gap-2"
                      style={{ background: s.bg, border: `1px solid ${s.border}` }}>
                      <p className="dash-heading text-3xl font-bold" style={{ color: s.color }}>{s.count}</p>
                      <p className="text-[10px] uppercase tracking-widest" style={{ color: s.color, opacity: 0.8 }}>{s.label}</p>
                      {/* Mini progress bar vs total */}
                      <div className="w-full status-bar-track mt-1">
                        <div className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: total > 0 ? `${Math.round((s.count / total) * 100)}%` : "0%",
                            background: s.color,
                            boxShadow: `0 0 6px ${s.color}`,
                          }} />
                      </div>
                      <p className="text-[9px]" style={{ color: s.color, opacity: 0.5 }}>
                        {total > 0 ? Math.round((s.count / total) * 100) : 0}%
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── Quick Actions ── */}
            <p className="text-white/30 text-[10px] uppercase tracking-widest mb-4 fade-up-3">Quick Actions</p>

            <div className="grid grid-cols-2 gap-5 fade-up-4">

              <Link href="/doctor-dashboard/home"
                className="action-card rounded-[28px] p-6 group">
                <div className="flex items-start justify-between mb-5">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                    style={{ background: "rgba(37,99,235,0.2)" }}>
                    <svg className="w-6 h-6 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <svg className="w-4 h-4 text-white/20 group-hover:text-blue-400 transition-colors mt-1"
                    fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
                <h3 className="font-semibold text-white text-base mb-1">Appointments</h3>
                <p className="text-white/40 text-xs leading-relaxed">Manage patient bookings & schedules</p>
                {/* Real pending badge */}
                {pending > 0 && (
                  <div className="mt-4 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium"
                    style={{ background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.3)", color: "#fde68a" }}>
                    <PulseDot color="#f59e0b" />
                    {pending} pending action{pending > 1 ? "s" : ""}
                  </div>
                )}
              </Link>

              <Link href="/doctor-dashboard/availability"
                className="action-card green rounded-[28px] p-6 group">
                <div className="flex items-start justify-between mb-5">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                    style={{ background: "rgba(34,197,94,0.2)" }}>
                    <svg className="w-6 h-6 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <svg className="w-4 h-4 text-white/20 group-hover:text-green-400 transition-colors mt-1"
                    fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
                <h3 className="font-semibold text-white text-base mb-1">Availability</h3>
                <p className="text-white/40 text-xs leading-relaxed">Set and update your working hours</p>
                <div className="flex gap-1.5 mt-4 flex-wrap">
                  {["9AM","10AM","11AM","2PM","3PM"].map((t,i) => (
                    <span key={t} className="text-[9px] px-2 py-0.5 rounded-full"
                      style={{
                        background:   i % 2 === 0 ? "rgba(34,197,94,0.2)"    : "rgba(255,255,255,0.05)",
                        color:        i % 2 === 0 ? "#86efac"                : "rgba(255,255,255,0.3)",
                        border: `1px solid ${i % 2 === 0 ? "rgba(34,197,94,0.3)" : "rgba(255,255,255,0.08)"}`,
                      }}>{t}</span>
                  ))}
                </div>
              </Link>

              <Link href="/doctor-dashboard/profile/"
                className="action-card rounded-[28px] p-6 group">
                <div className="flex items-start justify-between mb-5">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                    style={{ background: "rgba(37,99,235,0.2)" }}>
                    <svg className="w-6 h-6 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <svg className="w-4 h-4 text-white/20 group-hover:text-blue-400 transition-colors mt-1"
                    fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
                <h3 className="font-semibold text-white text-base mb-1">My Profile</h3>
                <p className="text-white/40 text-xs leading-relaxed">View and manage your profile details</p>
                <div className="flex gap-2 mt-4">
                  <span className="text-[9px] px-2 py-0.5 rounded-full"
                    style={{ background: "rgba(37,99,235,0.15)", color: "#93c5fd", border: "1px solid rgba(37,99,235,0.25)" }}>
                    {doctor.specialization}
                  </span>
                  <span className="text-[9px] px-2 py-0.5 rounded-full"
                    style={{ background: "rgba(37,99,235,0.1)", color: "rgba(255,255,255,0.4)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    {doctor.experience}y exp
                  </span>
                </div>
              </Link>

              <div className="rounded-[28px] p-6 opacity-50 cursor-not-allowed relative overflow-hidden"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="text-[10px] uppercase tracking-widest text-white/20 font-semibold rotate-[-30deg]">Coming Soon</span>
                </div>
                <div className="flex items-start justify-between mb-5">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-white/5">
                    <svg className="w-6 h-6 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                </div>
                <h3 className="font-semibold text-white/40 text-base mb-1">Analytics</h3>
                <p className="text-white/20 text-xs">Performance insights coming soon</p>
              </div>
            </div>
          </div>
        )}

        {/* ══════════ REJECTED ══════════ */}
        {isRejected && (
          <div className="card-glass-red rounded-[32px] p-12 text-center fade-up max-w-xl mx-auto mt-8">
            <div className="flex justify-center mb-7">
              <div className="w-24 h-24 rounded-full flex items-center justify-center"
                style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.2)", boxShadow: "0 0 40px rgba(239,68,68,0.1)" }}>
                <svg className="w-12 h-12 text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <h2 className="dash-heading text-3xl text-red-200 mb-3">Application Rejected</h2>
            <div className="divider my-5"
              style={{ background: "linear-gradient(90deg, transparent, rgba(239,68,68,0.4), transparent)" }} />
            <p className="text-white/50 max-w-sm mx-auto text-sm leading-relaxed">
              Unfortunately your application was not approved at this time. Please reach out to the admin team for details or to appeal the decision.
            </p>
            <a href="mailto:admin@medlink.com"
              className="inline-flex items-center gap-2 mt-8 px-6 py-3 rounded-2xl text-sm font-medium text-red-200 transition-all duration-200"
              style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)" }}
              onMouseOver={e => e.currentTarget.style.background = "rgba(239,68,68,0.22)"}
              onMouseOut={e  => e.currentTarget.style.background = "rgba(239,68,68,0.12)"}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Contact Admin
            </a>
          </div>
        )}

      </div>
    </div>
  );
}