"use client";

import DoctorNavbar from '../components/Navbar/DoctorNavbar';
import { useState, useEffect } from 'react';
import axios from 'axios';

export default function DoctorLayout({ children }) {
  const [doctor, setDoctor] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get("/api/auth/doctor", { withCredentials: true })
      .then(res => setDoctor(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return null;
  if (!doctor) return <p className="text-center mt-8">Doctor not found</p>;

  const isApproved = doctor.isApproved;
  const isRejected = doctor.isRejected;

  return (
    <div className="min-h-screen flex flex-col  bg-[#001050]">
      <DoctorNavbar
        name={doctor.name}
        image={doctor.image}
        specialization={doctor.specialization}
        isApproved={isApproved}
        isRejected={isRejected}
      />
      <main className="flex-1">{children}</main>
    </div>
  );
}