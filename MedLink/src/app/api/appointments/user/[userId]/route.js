import connectDB from "@/lib/db";
import Appointment from "@/models/Appointment";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/requireAuth";

export async function GET(request, { params }) {
  const { decoded, error, status } = await requireAuth(["user", "admin"]);
  if (error) return NextResponse.json({ error }, { status });

  try {
    await connectDB();
    const { userId } = await params;

    // Users can only view their own appointments
    if (decoded.role === "user" && decoded.id !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const appointments = await Appointment.find({ user: userId })
      .populate("user", "name email")
      .populate("doctor", "name image specialization")
      .sort({ date: 1, time: 1 })
      .lean();

    return NextResponse.json({ success: true, count: appointments.length, appointments });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch appointments", details: error.message }, { status: 500 });
  }
}
