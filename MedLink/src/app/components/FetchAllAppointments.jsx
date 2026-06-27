"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import {
  Loader2,
  User,
  Mail,
  CalendarDays,
  Clock,
} from "lucide-react";

const STATUS_COLORS = {
  pending:
    "bg-yellow-500/10 text-yellow-300 border border-yellow-400/20",
  confirmed:
    "bg-blue-500/10 text-blue-300 border border-blue-400/20",
  completed:
    "bg-green-500/10 text-green-300 border border-green-400/20",
  cancelled:
    "bg-red-500/10 text-red-300 border border-red-400/20",
};

export default function DoctorAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null);
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    const fetchAppointments = async () => {
      const doctorId = localStorage.getItem("doctorId");
      if (!doctorId) return;

      try {
        setLoading(true);

        const params = statusFilter
          ? `?status=${statusFilter}`
          : "";

        const res = await axios.get(
          `/api/appointments/doctor/${doctorId}${params}`,
          { withCredentials: true }
        );

        setAppointments(res.data.appointments);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchAppointments();
  }, [statusFilter]);

  const updateStatus = async (id, newStatus) => {
    if (!confirm(`Mark as "${newStatus}"?`)) return;

    setActionId(id);

    try {
      const res = await axios.patch(
        `/api/appointments/${id}`,
        { status: newStatus },
        { withCredentials: true }
      );

      if (res.data.success) {
        setAppointments((prev) =>
          prev.map((a) =>
            a._id === id ? { ...a, status: newStatus } : a
          )
        );
      }
    } catch (err) {
      alert(err.response?.data?.error || "Failed");
    } finally {
      setActionId(null);
    }
  };

  /* LOADING */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#00072D] text-white">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin mx-auto text-cyan-300" />
          <p className="mt-4 text-lg font-medium">
            Loading appointments...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#00072D] px-4 py-10">

      <div className="max-w-5xl mx-auto">

        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">

          <h1 className="text-3xl font-bold text-white">
            Doctor Appointments
          </h1>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setLoading(true);
            }}
            className="bg-[#06122e] text-white border border-cyan-500/20 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {/* EMPTY */}
        {appointments.length === 0 ? (
          <div className="text-center text-cyan-200/60 py-20">
            No appointments found.
          </div>
        ) : (
          <div className="space-y-5">

            {appointments.map((appt) => (
              <div
                key={appt._id}
                className="bg-[#06122e]/70 backdrop-blur-xl border border-cyan-500/10 rounded-2xl p-5 flex flex-col md:flex-row justify-between gap-5 shadow-lg hover:border-cyan-400/30 transition"
              >

                {/* LEFT */}
                <div className="flex items-center gap-4">

                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                    {appt.user?.name?.[0]?.toUpperCase() || "U"}
                  </div>

                  <div className="text-white">

                    <h2 className="font-semibold flex items-center gap-2">
                      <User size={16} className="text-cyan-300" />
                      {appt.user?.name}
                    </h2>

                    <p className="text-cyan-200/70 text-sm flex items-center gap-2">
                      <Mail size={14} />
                      {appt.user?.email}
                    </p>

                    <p className="text-cyan-300/60 text-sm mt-1 flex items-center gap-2">
                      <CalendarDays size={14} />
                      {new Date(appt.date).toLocaleDateString()}
                      <Clock size={14} className="ml-2" />
                      {appt.time}
                    </p>
                  </div>
                </div>

                {/* RIGHT */}
                <div className="flex flex-col items-end gap-3">

                  <span
                    className={`text-xs px-3 py-1 rounded-full font-medium ${STATUS_COLORS[appt.status]}`}
                  >
                    {appt.status}
                  </span>

                  <div className="flex gap-2 flex-wrap justify-end">

                    {appt.status === "pending" && (
                      <button
                        onClick={() =>
                          updateStatus(appt._id, "confirmed")
                        }
                        disabled={actionId === appt._id}
                        className="bg-cyan-500/80 hover:bg-cyan-500 text-white px-3 py-1.5 rounded-lg text-xs transition"
                      >
                        Confirm
                      </button>
                    )}

                    {appt.status === "confirmed" && (
                      <button
                        onClick={() =>
                          updateStatus(appt._id, "completed")
                        }
                        disabled={actionId === appt._id}
                        className="bg-green-500/80 hover:bg-green-500 text-white px-3 py-1.5 rounded-lg text-xs transition"
                      >
                        Complete
                      </button>
                    )}

                    {["pending", "confirmed"].includes(
                      appt.status
                    ) && (
                      <button
                        onClick={() =>
                          updateStatus(appt._id, "cancelled")
                        }
                        disabled={actionId === appt._id}
                        className="bg-red-500/80 hover:bg-red-500 text-white px-3 py-1.5 rounded-lg text-xs transition"
                      >
                        Cancel
                      </button>
                    )}

                  </div>
                </div>

              </div>
            ))}

          </div>
        )}
      </div>
    </div>
  );
}