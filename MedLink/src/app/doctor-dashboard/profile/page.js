"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import DoctorNavbar from "../../components/Navbar/DoctorNavbar";

export default function DoctorProfilePage() {
  const [doctor, setDoctor] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDoctor = async () => {
      try {
        const res = await axios.get("/api/auth/doctor", {
  withCredentials: true
});
        setDoctor(res.data);
      } catch (err) {
        console.log(err);
      } finally {
        setLoading(false);
      }
    };
    fetchDoctor();
  }, []);

  if (loading) return <p className="text-center mt-8">Loading...</p>;
  if (!doctor) return <p className="text-center mt-8">Doctor not found</p>;

  return (
   <>
  <div className="min-h-screen flex flex-col items-center justify-center bg-[#00072D] relative overflow-hidden p-6">
    
    {/* Background Glow */}
    <div className="absolute top-0 left-0 w-72 h-72 bg-blue-600/20 blur-3xl rounded-full"></div>
    <div className="absolute bottom-0 right-0 w-72 h-72 bg-blue-500/10 blur-3xl rounded-full"></div>

    {/* Avatar */}
    <div className="relative mb-6 z-10">
      {doctor.image ? (
        <img
          src={doctor.image}
          alt={doctor.name}
          className="w-28 h-28 rounded-full object-cover border-[3px] border-blue-600/90 
          shadow-[0_0_25px_rgba(37,99,235,0.5)]"
        />
      ) : (
        <div
          className="w-28 h-28 rounded-full bg-blue-600/90 flex items-center justify-center 
          text-white text-4xl font-bold border-[3px] border-white
          shadow-[0_0_25px_rgba(37,99,235,0.5)]"
        >
          {doctor.name[0].toUpperCase()}
        </div>
      )}

      {/* Status Dot */}
      <div className="absolute bottom-1 right-1 w-4 h-4 bg-green-400 border-2 border-[#00072D] rounded-full"></div>
    </div>

    {/* Card */}
    <div
      className="w-full max-w-md rounded-[28px] p-6
      bg-white/10 backdrop-blur-2xl
      border border-white/15
      shadow-[0_10px_35px_rgba(0,0,0,0.45)]
      relative z-10"
    >
      {/* Heading */}
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-white tracking-wide">
          Doctor Profile
        </h1>

        <div className="w-16 h-1 bg-blue-600/90 mx-auto mt-2 rounded-full"></div>
      </div>

      {/* Details */}
      <div className="space-y-3">
        
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 hover:bg-blue-600/10 transition-all duration-300">
          <p className="text-xs text-white/60 mb-1">Name</p>
          <h2 className="text-base font-semibold text-blue-600/90">
            {doctor.name}
          </h2>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 hover:bg-blue-600/10 transition-all duration-300">
          <p className="text-xs text-white/60 mb-1">Email</p>
          <h2 className="text-sm text-white break-all">
            {doctor.email}
          </h2>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 hover:bg-blue-600/10 transition-all duration-300">
          <p className="text-xs text-white/60 mb-1">Specialization</p>
          <h2 className="text-sm font-medium text-blue-600/90">
            {doctor.specialization}
          </h2>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 hover:bg-blue-600/10 transition-all duration-300">
          <p className="text-xs text-white/60 mb-1">Experience</p>
          <h2 className="text-sm text-white">
            {doctor.experience} years
          </h2>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 hover:bg-blue-600/10 transition-all duration-300">
          <p className="text-xs text-white/60 mb-2">Description</p>
          <p className="text-sm text-white/90 leading-relaxed">
            {doctor.description}
          </p>
        </div>
      </div>
    </div>
  </div>
</>
  );
}
