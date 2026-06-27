"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import Image from "next/image";
import { FaStethoscope, FaUserMd, FaStar } from "react-icons/fa";
import { useRouter } from "next/navigation";

export default function DoctorsSection() {
  const [doctors, setDoctors] = useState([]);
  const [specializations, setSpecializations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [specFilter, setSpecFilter] = useState("");
  const [minExp, setMinExp] = useState("");
  const router = useRouter();

  const fetchDoctors = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams();

      if (specFilter) {
        params.set("specialization", specFilter);
      }

      if (minExp) {
        params.set("minExp", minExp);
      }

      const res = await axios.get(
        `/api/doctors?${params.toString()}`,
        { withCredentials: true }
      );

      setDoctors(res.data.doctors || []);

      if (res.data.specializations) {
        setSpecializations(res.data.specializations);
      }
    } catch (err) {
      console.error("Failed to fetch doctors:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctors();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchDoctors();
  };

  return (
    <section className="py-20 bg-gray-50" id="doctors">
      <div className="max-w-7xl mx-auto px-6">
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-4xl font-bold text-gray-900 mb-4 text-center"
        >
          Meet Our Doctors
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-gray-600 mb-8 text-lg text-center"
        >
          Our team of experienced healthcare professionals is here for you.
        </motion.p>

        {/* Filters */}
        <form
          onSubmit={handleSearch}
          className="flex flex-wrap gap-3 mb-10 items-center justify-center"
        >
          <select
            value={specFilter}
            onChange={(e) => setSpecFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value="">All Specializations</option>

            {specializations.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <select
            value={minExp}
            onChange={(e) => setMinExp(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value="">Any Experience</option>
            <option value="2">2+ years</option>
            <option value="5">5+ years</option>
            <option value="10">10+ years</option>
          </select>

          <button
            type="submit"
            className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition"
          >
            Filter
          </button>
        </form>

        {loading ? (
          <p className="text-center p-8">Loading doctors...</p>
        ) : !doctors.length ? (
          <p className="text-center p-8">
            No doctors found matching your criteria.
          </p>
        ) : (
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: { staggerChildren: 0.2 },
              },
            }}
          >
            {doctors.map((doctor) => (
              <motion.div
                key={doctor._id}
                variants={{
                  hidden: { opacity: 0, y: 30 },
                  visible: { opacity: 1, y: 0 },
                }}
              >
                <div className="bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-lg transition p-6 flex flex-col items-center cursor-pointer">
                  <div className="w-full h-72 rounded-xl overflow-hidden mb-6 shadow-lg relative">
                    <Image
                      src={doctor.image || "/placeholder-doctor.png"}
                      alt={doctor.name || "Doctor"}
                      fill
                      className="object-cover object-center"
                    />
                  </div>

                  <h3 className="text-lg font-semibold text-gray-900">
                    {doctor.name}
                  </h3>

                  <div className="flex items-center gap-2 text-blue-600 mt-2 text-sm">
                    <FaStethoscope />
                    <span>{doctor.specialization}</span>
                  </div>

                  <div className="flex items-center gap-2 text-gray-500 mt-1 text-xs">
                    <FaUserMd />
                    <span>{doctor.experience} yrs experience</span>
                  </div>

                  {doctor.totalReviews > 0 && (
                    <div className="flex items-center gap-1 text-yellow-500 mt-1 text-sm">
                      <FaStar />
                      <span>{doctor.averageRating}</span>
                      <span className="text-gray-400 text-xs">
                        ({doctor.totalReviews})
                      </span>
                    </div>
                  )}

                  <div className="w-full mt-6">
                    <button
                      onClick={() =>
                        doctor._id &&
                        router.push(`/user-dashboard/user/book/${doctor._id}`)
                      }
                      className="inline-block w-full px-5 py-2 border border-gray-300 rounded-lg text-gray-700 text-sm font-medium hover:bg-gray-100 transition"
                    >
                      View Profile &amp; Book
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </section>
  );
}