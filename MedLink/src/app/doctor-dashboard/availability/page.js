"use client";
import { useState, useEffect } from "react";
import axios from "axios";

const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

export default function AvailabilityPage() {
  const [availability, setAvailability] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    axios.get("/api/auth/doctor", { withCredentials: true })
      .then(res => setAvailability(res.data?.availability || []));
  }, []);

  const toggleDay = (day) => {
    setAvailability(prev => {
      const exists = prev.find(a => a.day === day);
      if (exists) return prev.filter(a => a.day !== day);
      return [...prev, { day, startTime: "09:00", endTime: "17:00", slotDurationMinutes: 30 }];
    });
  };

  const updateSlot = (day, field, value) => {
    setAvailability(prev => prev.map(a => a.day === day ? { ...a, [field]: value } : a));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.patch("/api/auth/doctor/availability", { availability }, { withCredentials: true });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      alert(err.response?.data?.error || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#00072D] text-white p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-2">Set Availability</h1>
        <p className="text-white/60 text-sm mb-8">Select working days and set your hours.</p>

        <div className="space-y-4">
          {DAYS.map(day => {
            const slot = availability.find(a => a.day === day);
            const active = !!slot;
            return (
              <div key={day} className={`rounded-2xl border transition ${active ? "border-blue-400/50 bg-white/10" : "border-white/10 bg-white/5"} p-4`}>
                <div className="flex items-center justify-between">
                  <span className="font-medium">{day}</span>
                  <button
                    onClick={() => toggleDay(day)}
                    className={`w-12 h-6 rounded-full transition-colors ${active ? "bg-blue-500" : "bg-white/20"} relative`}
                  >
                    <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all ${active ? "left-6" : "left-0.5"}`} />
                  </button>
                </div>
                {active && (
                  <div className="flex flex-wrap gap-4 mt-4 text-sm">
                    <label className="flex flex-col gap-1 text-white/70">
                      Start
                      <input type="time" value={slot.startTime} onChange={e => updateSlot(day, "startTime", e.target.value)}
                        className="bg-white/10 border border-white/20 rounded-lg px-2 py-1 text-white" />
                    </label>
                    <label className="flex flex-col gap-1 text-white/70">
                      End
                      <input type="time" value={slot.endTime} onChange={e => updateSlot(day, "endTime", e.target.value)}
                        className="bg-white/10 border border-white/20 rounded-lg px-2 py-1 text-white" />
                    </label>
                    <label className="flex flex-col gap-1 text-white/70">
                      Slot (min)
                      <select value={slot.slotDurationMinutes} onChange={e => updateSlot(day, "slotDurationMinutes", Number(e.target.value))}
                        className="bg-white/10 border border-white/20 rounded-lg px-2 py-1 text-white">
                        <option value={15}>15</option>
                        <option value={30}>30</option>
                        <option value={45}>45</option>
                        <option value={60}>60</option>
                      </select>
                    </label>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="mt-8 w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-semibold transition disabled:opacity-50"
        >
          {saving ? "Saving..." : saved ? "✓ Saved!" : "Save Availability"}
        </button>
      </div>
    </div>
  );
}
