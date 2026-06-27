"use client";
import { useRouter } from "next/navigation";
import axios from "axios";

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

export default function DoctorNavbar({ name, image, specialization, isApproved, isRejected }) {
  const router = useRouter();

  const logout = async () => {
    try {
      await axios.post("/api/auth/logout", { withCredentials: true });
      localStorage.removeItem("doctorId");
      localStorage.removeItem("role");
      router.push("/");
    } catch (err) {
      console.error("Logout failed:", err);
      alert("Failed to logout. Try again.");
    }
  };

  return (
    <nav
      className="sticky top-0 z-50 px-6 py-3.5"
      style={{
        background: "rgba(0,7,45,0.7)",
        backdropFilter: "blur(28px)",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
      }}>
      <div className="max-w-6xl mx-auto flex items-center justify-between">

        {/* ── Left: Avatar + Name + Specialization ── */}
        <div className="flex items-center gap-3">
          {image ? (
            <img
              src={image}
              alt={name}
              onClick={() => router.push("/doctor-dashboard/")}
              className="w-10 h-10 rounded-2xl object-cover cursor-pointer"
              style={{ boxShadow: "0 0 20px rgba(37,99,235,0.5)" }}
            />
          ) : (
            <div
              onClick={() => router.push("/doctor-dashboard/")}
              className="w-10 h-10 rounded-2xl bg-blue-600/90 flex items-center justify-center
                         font-bold text-white text-sm cursor-pointer"
              style={{ boxShadow: "0 0 20px rgba(37,99,235,0.5)" }}>
              {name?.[0]?.toUpperCase() ?? "?"}
            </div>
          )}
          <div
            onClick={() => router.push("/doctor-dashboard/")}
            className="cursor-pointer">
            <p className="font-semibold text-sm text-white leading-tight">Dr. {name}</p>
            {specialization && (
              <p className="text-white/40 text-xs">{specialization}</p>
            )}
          </div>
        </div>

        {/* ── Right: Status Badge + Logout ── */}
        <div className="flex items-center gap-3">
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium"
            style={{
              background:  isApproved ? "rgba(34,197,94,0.1)"  : isRejected ? "rgba(239,68,68,0.1)"  : "rgba(250,204,21,0.1)",
              borderColor: isApproved ? "rgba(34,197,94,0.25)" : isRejected ? "rgba(239,68,68,0.25)" : "rgba(250,204,21,0.25)",
              color:       isApproved ? "#86efac"              : isRejected ? "#fca5a5"              : "#fde68a",
            }}>
            <PulseDot color={isApproved ? "#22c55e" : isRejected ? "#ef4444" : "#f59e0b"} />
            {isApproved ? "Approved" : isRejected ? "Rejected" : "Pending Review"}
          </div>

          <button
            onClick={logout}
            className="px-4 py-1.5 rounded-xl text-sm text-white/60 hover:text-white
                       border border-white/10 hover:border-red-500/30 hover:bg-red-500/10
                       transition-all duration-200">
            Logout
          </button>
        </div>

      </div>
    </nav>
  );
}