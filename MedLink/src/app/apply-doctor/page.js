"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function ApplyDoctor() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const fileToBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("File read failed"));
    });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const name = e.target.name.value.trim();
    const email = e.target.email.value.trim();
    const password = e.target.password.value.trim();
    const phone = e.target.phone.value.trim();
    const specialization = e.target.specialization.value.trim();
    const experience = e.target.experience.value.trim();
    const licenseNumber = e.target.licenseNumber.value.trim();
    const clinicDetails = e.target.clinicDetails.value.trim();
    const description = e.target.description.value.trim();

    if (name.length < 3) { setError("Name must be at least 3 characters."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError("Please enter a valid email."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (!phone || phone.length < 7) { setError("Please enter a valid phone number."); return; }
    if (!licenseNumber) { setError("License number is required."); return; }

    setLoading(true);
    try {
      let imageBase64 = "";
      if (file) imageBase64 = await fileToBase64(file);

      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: "doctor",
          name, email, password, phone, specialization,
          experience, licenseNumber, clinicDetails, description, imageBase64,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Registration failed.");
        return;
      }

      router.push("/login?applied=doctor");
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen py-10 flex justify-center items-center bg-cover bg-center px-4"
      style={{ backgroundImage: "url('/header1.png')" }}
    >
      {/* CHANGED: max-w-lg -> max-w-[420px] sm:max-w-lg */}
      <div className="backdrop-blur-xl bg-white/5 border border-white/20 shadow-[0_10px_60px_rgba(0,0,0,0.5)] rounded-3xl p-10 w-full max-w-[420px] sm:max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            {/* CHANGED: added max-w/max-h cap */}
            <div className="w-14 h-14 max-w-[56px] max-h-[56px] rounded-full bg-blue-700/80 flex items-center justify-center">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
          {/* CHANGED: added max-h cap */}
          <h1 className="text-3xl max-h-[40px] font-extrabold text-white drop-shadow">Doctor Application</h1>
          <p className="text-white/60 text-sm mt-1">Apply to join MedLink as a verified doctor</p>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-400/40 text-red-300 text-sm p-3 rounded-xl mb-5">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Personal Info */}
          <p className="text-white/50 text-xs uppercase tracking-widest font-semibold">Personal Information</p>

          {/* CHANGED: added max-h cap to every text/email/password/tel/number input below */}
          <input name="name" type="text" placeholder="Full Name" required
            className="w-full p-3 max-h-[48px] rounded-xl bg-white/10 text-white placeholder-white/40 border border-white/20 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all" />

          <input name="email" type="email" placeholder="Email Address" required
            className="w-full p-3 max-h-[48px] rounded-xl bg-white/10 text-white placeholder-white/40 border border-white/20 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all" />

          <input name="password" type="password" placeholder="Password (min. 6 chars)" required
            className="w-full p-3 max-h-[48px] rounded-xl bg-white/10 text-white placeholder-white/40 border border-white/20 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all" />

          <input name="phone" type="tel" placeholder="Phone Number" required
            className="w-full p-3 max-h-[48px] rounded-xl bg-white/10 text-white placeholder-white/40 border border-white/20 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all" />

          {/* Professional Info */}
          <p className="text-white/50 text-xs uppercase tracking-widest font-semibold mt-2">Professional Details</p>

          <input name="specialization" type="text" placeholder="Specialty (e.g. Cardiology)" required
            className="w-full p-3 max-h-[48px] rounded-xl bg-white/10 text-white placeholder-white/40 border border-white/20 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all" />

          <input name="experience" type="number" placeholder="Years of Experience" required min="0"
            className="w-full p-3 max-h-[48px] rounded-xl bg-white/10 text-white placeholder-white/40 border border-white/20 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all" />

          <input name="licenseNumber" type="text" placeholder="Medical License Number" required
            className="w-full p-3 max-h-[48px] rounded-xl bg-white/10 text-white placeholder-white/40 border border-white/20 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all" />

          <input name="clinicDetails" type="text" placeholder="Clinic / Hospital Name & Address" required
            className="w-full p-3 max-h-[48px] rounded-xl bg-white/10 text-white placeholder-white/40 border border-white/20 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all" />

          {/* NOTE: textarea NOT capped with max-h since it already has a fixed h-24 and is meant to be multi-line */}
          <textarea name="description" placeholder="Brief bio / professional description" required
            className="w-full p-3 rounded-xl bg-white/10 text-white placeholder-white/40 border border-white/20 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all resize-none h-24" />

          {/* Profile Photo */}
          <p className="text-white/50 text-xs uppercase tracking-widest font-semibold mt-2">Profile Photo</p>
          {/* CHANGED: added max-h cap */}
          <label className="w-full p-3 max-h-[52px] rounded-xl bg-white/10 text-white/60 border border-white/20 border-dashed cursor-pointer hover:bg-white/15 transition-all flex items-center gap-3">
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-sm truncate">{file ? file.name : "Upload profile photo (optional)"}</span>
            <input type="file" accept="image/*" onChange={e => setFile(e.target.files[0])} className="hidden" />
          </label>

          {/* CHANGED: added max-h cap */}
          <button type="submit" disabled={loading}
            className="mt-2 w-full py-3 max-h-[48px] rounded-xl font-semibold text-white bg-blue-600/90 hover:bg-blue-600 shadow-lg transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100">
            {loading ? "Submitting Application..." : "Submit Application"}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-white/10 text-center text-sm text-white/60">
          <p>
            Already applied?{" "}
            <Link href="/login" className="text-blue-400 hover:text-blue-300 font-medium hover:underline">
              Login here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}