"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import {
  User,
  Mail,
  Users,
  Loader2,
  Badge,
} from "lucide-react";

export default function UserProfilePage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoading(true);

        const res = await axios.get("/api/auth/user", {
          withCredentials: true,
        });

        setUser(res.data);
      } catch (err) {
        console.log(err);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  /* LOADING */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-cyan-900">
        <div className="text-center text-white">
          <Loader2 className="w-10 h-10 animate-spin mx-auto text-cyan-300" />
          <p className="mt-4 text-lg font-medium">
            Loading your profile...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <p className="text-red-500 text-lg">
          Failed to load user profile
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-12 px-6 bg-gradient-to-br from-blue-50 via-cyan-50 to-blue-100">

      <div className="max-w-md mx-auto">

        {/* CARD */}
        <div className="bg-white/80 backdrop-blur-xl border border-white/50 shadow-2xl rounded-3xl p-8 hover:shadow-blue-200 transition-all">

          {/* AVATAR */}
          <div className="flex justify-center mb-6">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white text-3xl font-bold shadow-lg">
              {user?.name?.[0]?.toUpperCase()}
            </div>
          </div>

          {/* TITLE */}
          <h1 className="text-2xl font-bold text-center text-gray-900 mb-6 flex items-center justify-center gap-2">
            <Badge className="text-blue-500" />
            User Profile
          </h1>

          {/* INFO */}
          <div className="space-y-4 text-gray-700">

            <div className="flex items-center gap-3 bg-blue-50 p-4 rounded-xl hover:bg-blue-100 transition">
              <User className="text-blue-500" />
              <div>
                <p className="text-xs text-gray-500">Name</p>
                <p className="font-semibold">{user.name}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-cyan-50 p-4 rounded-xl hover:bg-cyan-100 transition">
              <Mail className="text-cyan-600" />
              <div>
                <p className="text-xs text-gray-500">Email</p>
                <p className="font-semibold">{user.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-blue-50 p-4 rounded-xl hover:bg-blue-100 transition">
              <Users className="text-blue-600" />
              <div>
                <p className="text-xs text-gray-500">Role</p>
                <p className="font-semibold">
                  {user.role || "User"}
                </p>
              </div>
            </div>

          </div>
        </div>

        {/* FOOTER */}
        <p className="text-center text-xs text-gray-500 mt-6">
          Secure medical profile dashboard
        </p>

      </div>
    </div>
  );
}