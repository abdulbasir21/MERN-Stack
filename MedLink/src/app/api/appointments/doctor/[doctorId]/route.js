import connectDB from "@/lib/db";
import Appointment from "@/models/Appointment";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/requireAuth";

export async function GET(request, { params }) {
  const { decoded, error, status } = await requireAuth(["doctor", "admin"]);
  if (error) return NextResponse.json({ error }, { status });

  try {
    await connectDB();
    const { doctorId } = await params;

    if (decoded.role === "doctor" && decoded.id !== doctorId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get("status");
    const query = { doctor: doctorId };
    if (statusFilter) query.status = statusFilter;

    const appointments = await Appointment.find(query)
      .populate("user", "name email gender")
      .sort({ date: 1, time: 1 })
      .lean();

    return NextResponse.json({ success: true, count: appointments.length, appointments });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch appointments", details: error.message }, { status: 500 });
  }
}
