"use client";

import { motion } from "framer-motion";
import { FiUserCheck, FiCalendar, FiClock } from "react-icons/fi";
import Link from "next/link";

export default function HeroSection() {
  return (
    <section
      className="
        relative w-full 
        bg-cover bg-center
        flex flex-col justify-center items-center
        py-24 md:py-0 
        md:h-screen
        overflow-hidden
      "
      style={{ backgroundImage: "url('/header.webp')" }}
    >
      {/* ✨ Gradient Overlay */}
      <div className="absolute inset-0 bg-linear-to-b from-black/70 via-black/60 to-blue-900/60"></div>

      {/* 🌟 Floating Gradient Accent */}
      <div className="absolute top-20 right-20 w-72 h-72 bg-blue-500/20 rounded-full blur-3xl"></div>

      {/* ✨ Content */}
      <div className="relative z-10 flex flex-col items-center text-center px-4">
        {/* Heading */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-4xl md:text-6xl font-extrabold text-white leading-tight drop-shadow-lg"
        >
          Your Health, <span className="text-blue-400">Our Priority</span>
        </motion.h1>

        {/* Description */}
        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="mt-5 text-white/90 text-lg md:text-xl max-w-2xl"
        >
          Book appointments with trusted healthcare professionals. Experience
          quality care, anytime, anywhere.
        </motion.p>

        {/* Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="mt-8 flex flex-col md:flex-row gap-4"
        >
          <Link href="/user-dashboard/user/home#doctors">
            <button className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-full shadow-lg hover:shadow-blue-400/40 transition-transform hover:scale-105">
              Book Appointment
            </button>
          </Link>

          <Link href="#services">
            <button className="px-8 py-3 border border-white/70 text-white font-semibold rounded-full hover:bg-white hover:text-blue-700 transition-colors shadow-lg hover:shadow-white/30">
              Explore Services
            </button>
          </Link>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0, y: 30 },
            visible: {
              opacity: 1,
              y: 0,
              transition: { staggerChildren: 0.2, delayChildren: 1 },
            },
          }}
          className="mt-16 flex flex-col md:flex-row gap-6 justify-center"
        >
          {[
            { icon: FiUserCheck, label: "Expert Doctors", value: "500+" },
            { icon: FiCalendar, label: "Appointments", value: "10k+" },
            { icon: FiClock, label: "Support Hours", value: "24/7" },
          ].map((item, index) => (
            <motion.div
              key={index}
              variants={{
                hidden: { opacity: 0, y: 30 },
                visible: { opacity: 1, y: 0 },
              }}
              className="flex items-center gap-4 p-5 rounded-2xl 
              bg-white/10 backdrop-blur-md border border-white/20 
              text-white shadow-lg hover:bg-white/20 transition-all"
            >
              <div className="p-4 bg-blue-500/70 rounded-xl flex items-center justify-center">
                <item.icon className="text-2xl" />
              </div>
              <div>
                <span className="text-2xl font-bold block">{item.value}</span>
                <p className="text-sm opacity-80">{item.label}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
