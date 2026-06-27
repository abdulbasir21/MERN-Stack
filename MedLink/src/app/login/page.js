"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("applied") === "doctor") {
      setSuccessMsg("Application submitted successfully! Please log in to view your status and wait for admin approval.");
    } else if (searchParams.get("registered") === "patient") {
      setSuccessMsg("Account created! You can now log in.");
    }
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        return;
      }

      if (data.role === "doctor") {
        localStorage.setItem("doctorId", data.user._id);
        localStorage.setItem("doctorName", data.user.name);
      } else {
        localStorage.setItem("userId", data.user._id);
        localStorage.setItem("userName", data.user.name);
      }
      localStorage.setItem("role", data.role);

      const redirect = searchParams.get("redirect");
      if (redirect) { router.push(redirect); return; }

      if (data.role === "user") router.push("/user-dashboard/user/home");
      else if (data.role === "doctor") router.push("/doctor-dashboard");
      else if (data.role === "admin") router.push("/admin-dashboard");
      else router.push("/");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex justify-center items-center bg-cover bg-center px-4"
      style={{ backgroundImage: "url('/header1.png')" }}
    >
      {/* CHANGED: added max-w-[420px] sm:max-w-md cap instead of just max-w-md */}
      <div className="backdrop-blur-xl bg-white/5 border border-white/20 shadow-[0_10px_60px_rgba(0,0,0,0.5)] rounded-3xl p-10 w-full max-w-[420px] sm:max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            {/* CHANGED: added max-w/max-h cap on the icon circle */}
            <div className="w-14 h-14 max-w-[56px] max-h-[56px] rounded-full bg-blue-600/80 flex items-center justify-center">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
          </div>
          {/* CHANGED: added max-h cap on the heading */}
          <h1 className="text-3xl max-h-[40px] font-extrabold text-white drop-shadow">Welcome Back</h1>
          <p className="text-white/60 text-sm mt-1">Sign in to your MedLink account</p>
        </div>

        {successMsg && (
          <div className="bg-green-500/20 border border-green-400/40 text-green-300 text-sm p-3 rounded-xl mb-5">
            {successMsg}
          </div>
        )}

        {error && (
          <div className="bg-red-500/20 border border-red-400/40 text-red-300 text-sm p-3 rounded-xl mb-5">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-white/70 text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              /* CHANGED: added max-h cap on input */
              className="w-full p-3 max-h-[48px] rounded-xl bg-white/10 text-white placeholder-white/40 border border-white/20 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all"
            />
          </div>
          <div>
            <label className="block text-white/70 text-sm font-medium mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              /* CHANGED: added max-h cap on input */
              className="w-full p-3 max-h-[48px] rounded-xl bg-white/10 text-white placeholder-white/40 border border-white/20 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            /* CHANGED: added max-h cap on button */
            className="mt-2 w-full py-3 max-h-[48px] rounded-xl font-semibold text-white bg-blue-600/90 hover:bg-blue-600 shadow-lg shadow-blue-500/20 transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-white/10 flex flex-col gap-2 text-center text-sm text-white/60">
          <p>
            New patient?{" "}
            <Link href="/register-patient" className="text-blue-400 hover:text-blue-300 font-medium hover:underline">
              Register as Patient
            </Link>
          </p>
          <p>
            Are you a doctor?{" "}
            <Link href="/apply-doctor" className="text-green-400 hover:text-green-300 font-medium hover:underline">
              Apply as Doctor
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#00072D]" />}>
      <LoginForm />
    </Suspense>
  );
}