"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import {
  FaStethoscope,
  FaUserMd,
  FaStar,
  FaCalendarAlt,
} from "react-icons/fa";
import axios from "axios";
import { motion } from "framer-motion";

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export default function DoctorDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  const [doctor, setDoctor] = useState(null);
  const [allSlots, setAllSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!id) return;

    const fetchDoctor = async () => {
      try {
        setFetching(true);

        const docRes = await axios.get(`/api/doctors/${id}`, {
          withCredentials: true,
        });

        const doc = docRes.data.doctor;
        setDoctor(doc);

        const availability = doc?.availability || [];
        const slots = [];
        const today = new Date();

        for (let i = 0; i < 7; i++) {
          const d = new Date(today);
          d.setDate(today.getDate() + i);

          const dayName = DAY_NAMES[d.getDay()];
          const slot = availability.find((a) => a.day === dayName);

          if (!slot) continue;

          const dateStr = `${d.getFullYear()}-${String(
            d.getMonth() + 1
          ).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

          const dateLabel = d.toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
          });

          const [sh, sm] = slot.startTime.split(":").map(Number);
          const [eh, em] = slot.endTime.split(":").map(Number);

          let current = sh * 60 + sm;
          const end = eh * 60 + em;

          while (current < end) {
            const h = Math.floor(current / 60)
              .toString()
              .padStart(2, "0");

            const m = (current % 60).toString().padStart(2, "0");

            slots.push({
              label: `${dateLabel} — ${h}:${m}`,
              date: dateStr,
              time: `${h}:${m}`,
            });

            current += slot.slotDurationMinutes || 30;
          }
        }

        setAllSlots(slots);
      } catch (err) {
        console.log(
          "Doctor fetch failed:",
          err.response?.status,
          err.response?.data
        );

        alert("Doctor not found");
        router.push("/user-dashboard/user/home");
      } finally {
        setFetching(false);
      }
    };

    fetchDoctor();
  }, [id, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedSlot) {
      return alert("Please select a slot");
    }

    const { date, time } = JSON.parse(selectedSlot);

    setLoading(true);

    try {
      await axios.post(
        `/api/appointments/book/doctor/${id}`,
        { date, time },
        { withCredentials: true }
      );

      alert("Appointment booked successfully!");

      router.push("/user-dashboard/user/appointments");
    } catch (err) {
      const msg = err.response?.data?.error || "Booking failed";
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  /* Beautiful Loading Screen */
  if (fetching) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-cyan-100">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>

          <h2 className="mt-6 text-2xl font-bold text-gray-800">
            Loading Doctor Details
          </h2>

          <p className="text-gray-500 mt-2">
            Please wait while we fetch the doctor profile...
          </p>
        </div>
      </div>
    );
  }

  if (!doctor) {
    return (
      <p className="p-6 text-center text-red-500">
        Doctor not found.
      </p>
    );
  }

  const availabilityDays = doctor.availability
    ?.map((a) => a.day)
    .join(", ");

  return (
    <section className="min-h-screen py-16 bg-gradient-to-br from-blue-50 via-white to-cyan-50">
      <div className="max-w-6xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="grid md:grid-cols-2 gap-10 bg-white/90 backdrop-blur rounded-3xl shadow-2xl overflow-hidden border border-white"
        >
          {/* Doctor Image */}
          <div className="relative h-[500px] md:h-auto">
            <Image
              src={doctor.image || "/placeholder-doctor.png"}
              alt={doctor.name}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover object-top"
            />

            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
          </div>

          {/* Doctor Info */}
          <div className="p-8 flex flex-col justify-center">
            <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-1 rounded-full text-sm font-medium w-fit mb-4">
              <FaStethoscope />
              {doctor.specialization}
            </div>

            <h1 className="text-4xl font-bold text-gray-900 leading-tight">
              {doctor.name}
            </h1>

            {doctor.experience && (
              <div className="flex items-center gap-2 text-gray-600 mt-4">
                <FaUserMd className="text-blue-500" />
                <span className="font-medium">
                  {doctor.experience} years experience
                </span>
              </div>
            )}

            {doctor.totalReviews > 0 && (
              <div className="flex items-center gap-2 mt-3">
                <div className="flex items-center gap-1 text-yellow-500">
                  <FaStar />
                  <span className="font-semibold">
                    {doctor.averageRating}
                  </span>
                </div>

                <span className="text-gray-500 text-sm">
                  ({doctor.totalReviews} reviews)
                </span>
              </div>
            )}

            {/* About */}
            {doctor.description && (
              <div className="mt-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  About Doctor
                </h2>

                <p className="text-gray-600 leading-relaxed">
                  {doctor.description}
                </p>
              </div>
            )}

            {/* Availability */}
            {availabilityDays && (
              <div className="mt-6 flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-2xl p-4">
                <FaCalendarAlt className="text-blue-500 mt-1" />

                <div>
                  <p className="font-semibold text-gray-800">
                    Available Days
                  </p>

                  <p className="text-gray-600 text-sm">
                    {availabilityDays}
                  </p>
                </div>
              </div>
            )}

            {/* Booking Form */}
            <form
              onSubmit={handleSubmit}
              className="mt-8 flex flex-col gap-5"
            >
              {allSlots.length > 0 ? (
                <div>
                  <label className="text-sm font-semibold text-gray-700">
                    Select Appointment Slot
                  </label>

                  <select
                    value={selectedSlot}
                    onChange={(e) => setSelectedSlot(e.target.value)}
                    className="w-full mt-2 p-3 border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    required
                  >
                    <option value="">-- Choose a slot --</option>

                    {allSlots.map((s, i) => (
                      <option
                        key={i}
                        value={JSON.stringify({
                          date: s.date,
                          time: s.time,
                        })}
                      >
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <p className="text-sm text-red-500 font-medium">
                  No available slots in the next 7 days.
                </p>
              )}

              <button
                type="submit"
                disabled={loading || !selectedSlot}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold shadow-lg hover:scale-[1.02] hover:shadow-xl transition-all duration-300 disabled:opacity-50"
              >
                {loading ? "Booking Appointment..." : "Book Appointment"}
              </button>
            </form>
          </div>
        </motion.div>
      </div>
    </section>
  );
}