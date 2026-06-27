"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  FaUserMd,
  FaCalendarAlt,
  FaClock,
  FaTimesCircle,
} from "react-icons/fa";

const STATUS_STYLES = {
  pending: "bg-yellow-100 text-yellow-700",
  confirmed: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

export default function UserAppointmentsPage() {
  const router = useRouter();

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null);

  useEffect(() => {
    const fetchAppointments = async () => {
      const userId = localStorage.getItem("userId");

      if (!userId) {
        router.push("/login/user");
        return;
      }

      try {
        const res = await fetch(
          `/api/appointments/user/${userId}`,
          { credentials: "include" }
        );

        const data = await res.json();

        if (res.ok) setAppointments(data.appointments);
        else alert(data.error || "Failed to fetch appointments");
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchAppointments();
  }, [router]);

  const handleCancel = async (appointmentId) => {
    if (!confirm("Cancel this appointment?")) return;

    setActionId(appointmentId);

    try {
      const res = await fetch(
        `/api/appointments/${appointmentId}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      const data = await res.json();

      if (res.ok) {
        setAppointments((prev) =>
          prev.map((a) =>
            a._id === appointmentId
              ? { ...a, status: "cancelled" }
              : a
          )
        );
      } else {
        alert(data.error || "Failed to cancel");
      }
    } finally {
      setActionId(null);
    }
  };

  /* LOADING SCREEN */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 via-cyan-900 to-slate-900">
        <div className="text-center">
          <div className="w-14 h-14 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto" />

          <p className="text-white mt-4 text-lg">
            Loading your appointments...
          </p>
        </div>
      </div>
    );
  }

  /* EMPTY STATE */
  if (!appointments.length) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 via-cyan-900 to-slate-900">
        <p className="text-white text-lg">
          No appointments yet.
        </p>
      </div>
    );
  }

  return (
    <section className="min-h-screen py-14 px-4 bg-gradient-to-br from-slate-100 via-blue-50 to-cyan-50">
      <div className="max-w-5xl mx-auto">

        {/* HEADER */}
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-extrabold pt-6 text-gray-900">
            My Appointments
          </h1>
          <p className="text-gray-500 mt-2">
            Track and manage your doctor visits easily
          </p>
        </div>

        {/* LIST */}
        <div className="space-y-6">
          {appointments.map((appt, index) => (
            <div
              key={appt._id}
              className="bg-white rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-300 p-5 flex flex-col md:flex-row items-center gap-5 border border-gray-100"
            >
              {/* Doctor Image */}
              <div className="relative w-20 h-20 rounded-2xl overflow-hidden shadow-md shrink-0">
                <Image
                  src={
                    appt.doctor?.image ||
                    "/placeholder-doctor.png"
                  }
                  alt={appt.doctor?.name}
                  fill
                  className="object-cover"
                />
              </div>

              {/* INFO */}
              <div className="flex-1">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <FaUserMd className="text-blue-500" />
                  Dr. {appt.doctor?.name}
                </h2>

                <p className="text-gray-500 text-sm mt-1">
                  {appt.doctor?.specialization}
                </p>

                <div className="flex flex-wrap gap-3 mt-3 text-sm">
                  <span className="flex items-center gap-2 bg-gray-100 px-3 py-1 rounded-full">
                    <FaCalendarAlt className="text-blue-500" />
                    {new Date(
                      appt.date
                    ).toLocaleDateString()}
                  </span>

                  <span className="flex items-center gap-2 bg-gray-100 px-3 py-1 rounded-full">
                    <FaClock className="text-cyan-500" />
                    {appt.time}
                  </span>
                </div>
              </div>

              {/* STATUS + ACTION */}
              <div className="flex flex-col items-end gap-3">
                <span
                  className={`text-xs px-3 py-1 rounded-full font-semibold capitalize ${STATUS_STYLES[appt.status]}`}
                >
                  {appt.status}
                </span>

                {["pending", "confirmed"].includes(
                  appt.status
                ) && (
                  <button
                    onClick={() =>
                      handleCancel(appt._id)
                    }
                    disabled={actionId === appt._id}
                    className="flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-xl text-sm hover:bg-red-600 transition disabled:opacity-50"
                  >
                    <FaTimesCircle />
                    {actionId === appt._id
                      ? "Cancelling..."
                      : "Cancel"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}