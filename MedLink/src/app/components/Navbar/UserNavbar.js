"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { FiMenu, FiX } from "react-icons/fi";

export default function UserNavbar({ name }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

 const logout = async () => {
  try {
    // Call backend logout API to clear HttpOnly cookie
    await axios.post("/api/auth/logout");

    // Remove all stored user/doctor info and token
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("userId");
    localStorage.removeItem("userName");
    localStorage.removeItem("doctorId");

    // Redirect to homepage
    router.push("/");
  } catch (err) {
    console.error("Logout failed:", err);
    alert("Failed to logout. Try again.");
  }
};


  const goToProfile = () => {
    router.push("/user-dashboard/user/profile");
  };
 
  return (
    <nav className="bg-white shadow-md fixed w-full z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo */}
          <div
            onClick={() => router.push("/user-dashboard/user/home")}
            className="text-2xl font-bold text-blue-500 cursor-pointer"
          >
            Medlink
          </div>

          {/* Desktop Links */}
          <div className="hidden md:flex items-center gap-6">
            <button
              onClick={() => router.push("/user-dashboard/user/home")}
              className="text-black hover:text-blue-500 font-medium"
            >
              Home
            </button>
            <button
              onClick={() =>   router.push("/user-dashboard/user/home#doctors")}
              className="text-black hover:text-blue-500 font-medium"
            >
              Doctors
            </button>
            <button
              onClick={() => router.push("/user-dashboard/user/appointments")}
              className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 font-medium"
            >
              My Appointments
            </button>
            <button
              onClick={logout}
              className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 font-medium"
            >
              Log Out
            </button>

            {/* User Avatar */}
            <div
              onClick={goToProfile}
              className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold cursor-pointer"
            >
              {name[0].toUpperCase()}
            </div>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-2xl text-black focus:outline-none"
            >
              {isOpen ? <FiX /> : <FiMenu />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden bg-white shadow-md px-4 pt-4 pb-4 space-y-3">
          <button
            onClick={() => { router.push("/user-dashboard/user/home"); setIsOpen(false); }}
            className="block w-full text-left text-black hover:text-blue-500 font-medium"
          >
            Home
          </button>
          <button
            onClick={() => {  router.push("/user-dashboard/user/home#doctors"); setIsOpen(false); }}
            className="block w-full text-left text-black hover:text-blue-500 font-medium"
          >
            Doctors
          </button>
          <button
            onClick={() => { router.push("/user-dashboard/user/appointments"); setIsOpen(false); }}
            className="block w-full text-left bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 font-medium"
          >
            My Appointments
          </button>
          <button
            onClick={() => { logout(); setIsOpen(false); }}
            className="block w-full text-left bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 font-medium"
          >
            Log Out
          </button>
          <div
            onClick={() => { goToProfile(); setIsOpen(false); }}
            className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold cursor-pointer"
          >
            {name[0].toUpperCase()}
          </div>
        </div>
      )}
    </nav>
  );
}
