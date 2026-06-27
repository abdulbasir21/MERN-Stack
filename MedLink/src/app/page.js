"use client";
import { useRouter } from "next/navigation";

export default function LandingPage() {
  const router = useRouter();

  return (
    <div
      className="min-h-screen flex flex-col justify-center items-center bg-cover bg-center px-4"
      style={{ backgroundImage: "url('/header1.png')" }}
    >
      {/* Glass Card - hard capped width/padding so it can never exceed this size on any screen */}
      <div className="backdrop-blur-xl bg-white/5 border border-white/20 shadow-[0_10px_60px_rgba(0,0,0,0.5)] rounded-3xl p-12 w-full max-w-[420px] sm:max-w-[480px] lg:max-w-lg text-center">
        {/* Logo / Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 max-w-[80px] max-h-[80px] rounded-full bg-blue-600/80 flex items-center justify-center shadow-lg shadow-blue-500/30">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
        </div>

        <h1 className="text-5xl max-h-[60px] font-extrabold text-white drop-shadow-lg mb-2">MedLink</h1>
        <p className="text-white/60 mb-10 text-base">Your trusted doctor appointment platform</p>

        <div className="flex flex-col gap-4">
          {/* Login */}
          <button
            onClick={() => router.push("/login")}
            className="w-full px-8 py-4 max-h-[56px] rounded-xl font-semibold text-white
              bg-blue-600/90 hover:bg-blue-600 shadow-lg shadow-blue-500/30
              transition-all duration-300 hover:scale-105 text-lg"
          >
            Login
          </button>

          {/* Register as Patient */}
          <button
            onClick={() => router.push("/register-patient")}
            className="w-full px-8 py-4 max-h-[56px] rounded-xl font-semibold text-white
              bg-white/10 hover:bg-white/20 border border-white/30
              transition-all duration-300 hover:scale-105 text-lg backdrop-blur-sm"
          >
            Register as Patient
          </button>

          {/* Apply as Doctor */}
          <button
            onClick={() => router.push("/apply-doctor")}
            className="w-full px-8 py-4 max-h-[56px] rounded-xl font-semibold
              bg-white text-blue-700 hover:bg-blue-50
              shadow-lg transition-all duration-300 hover:scale-105 text-lg"
          >
            Apply as Doctor
          </button>
        </div>
      </div>
    </div>
  );
}