"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import axios from "axios";

export default function RegisterPatient() {
  const router = useRouter();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    gender: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const { name, email, password, gender } = form;

    if (!name || name.trim().length < 3) {
      setError("Name must be at least 3 characters long.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (!password || password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (!gender) {
      setError("Please select your gender.");
      return;
    }

    setLoading(true);

    try {
      await axios.post("/api/auth/register", {
        ...form,
        role: "user",
      });

      router.push("/login?registered=patient");
    } catch (err) {
      setError(
        err.response?.data?.error ||
          "Registration failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex justify-center items-center bg-cover bg-center px-4 pt-20"
      style={{ backgroundImage: "url('/header1.png')" }}
    >
      {/* CHANGED: max-w-md -> max-w-[420px] sm:max-w-md */}
      <div className="backdrop-blur-xl bg-black/40 border border-white/20 shadow-[0_10px_60px_rgba(0,0,0,0.5)] rounded-3xl p-10 w-full max-w-[420px] sm:max-w-md">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            {/* CHANGED: added max-w/max-h cap */}
            <div className="w-14 h-14 max-w-[56px] max-h-[56px] rounded-full bg-green-600/80 flex items-center justify-center">
              <svg
                className="w-7 h-7 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </div>
          </div>

          {/* CHANGED: added max-h cap */}
          <h1 className="text-3xl max-h-[40px] font-extrabold text-white drop-shadow-lg">
            Patient Registration
          </h1>

          <p className="text-white text-sm mt-2 font-medium">
            Create your patient account
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-500/20 border border-red-400/40 text-red-200 text-sm p-3 rounded-xl mb-5">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          
          {/* Full Name */}
          <div>
            <label className="block text-white text-sm font-medium mb-1">
              Full Name
            </label>

            <input
              name="name"
              type="text"
              placeholder="John Doe"
              required
              onChange={handleChange}
              /* CHANGED: added max-h cap */
              className="w-full p-3 max-h-[48px] rounded-xl bg-white/10 text-white placeholder-white/60 border border-white/20 focus:outline-none focus:ring-2 focus:ring-green-400 transition-all"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-white text-sm font-medium mb-1">
              Email
            </label>

            <input
              name="email"
              type="email"
              placeholder="you@example.com"
              required
              onChange={handleChange}
              /* CHANGED: added max-h cap */
              className="w-full p-3 max-h-[48px] rounded-xl bg-white/10 text-white placeholder-white/60 border border-white/20 focus:outline-none focus:ring-2 focus:ring-green-400 transition-all"
            />
          </div>

          {/* Gender */}
          <div>
            <label className="block text-white text-sm font-medium mb-1">
              Gender
            </label>

            <select
              name="gender"
              required
              onChange={handleChange}
              /* CHANGED: added max-h cap */
              className="w-full p-3 max-h-[48px] rounded-xl bg-white/10 text-white border border-white/20 focus:outline-none focus:ring-2 focus:ring-green-400 transition-all"
            >
              <option value="" className="text-black">
                Select Gender
              </option>
              <option value="male" className="text-black">
                Male
              </option>
              <option value="female" className="text-black">
                Female
              </option>
              <option value="other" className="text-black">
                Other
              </option>
            </select>
          </div>

          {/* Password */}
          <div>
            <label className="block text-white text-sm font-medium mb-1">
              Password
            </label>

            <input
              name="password"
              type="password"
              placeholder="Min. 6 characters"
              required
              onChange={handleChange}
              /* CHANGED: added max-h cap */
              className="w-full p-3 max-h-[48px] rounded-xl bg-white/10 text-white placeholder-white/60 border border-white/20 focus:outline-none focus:ring-2 focus:ring-green-400 transition-all"
            />
          </div>

          {/* Button */}
          <button
            type="submit"
            disabled={loading}
            /* CHANGED: added max-h cap */
            className="mt-2 w-full py-3 max-h-[48px] rounded-xl font-semibold text-white bg-green-600/90 hover:bg-green-600 shadow-lg transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {loading ? "Creating Account..." : "Register as Patient"}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-6 pt-5 border-t border-white/10 text-center text-sm text-white">
          <p>
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-blue-400 hover:text-blue-300 font-medium hover:underline"
            >
              Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}