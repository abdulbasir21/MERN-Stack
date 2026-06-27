// DELETE/PATCH /api/appointments/[appointmentId]
import connectDB from "@/lib/db";
import Appointment from "@/models/Appointment";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/requireAuth";

// Patient cancels appointment
export async function DELETE(request, { params }) {
  const { decoded, error, status } = await requireAuth(["user", "admin"]);
  if (error) return NextResponse.json({ error }, { status });

  try {
    await connectDB();
    const { appointmentId } = await params;

    if (!appointmentId.match(/^[0-9a-fA-F]{24}$/)) {
      return NextResponse.json({ error: "Invalid Appointment ID" }, { status: 400 });
    }

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) return NextResponse.json({ error: "Appointment not found" }, { status: 404 });

    // Patients can only cancel their own appointments
    if (decoded.role === "user" && appointment.user.toString() !== decoded.id) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    appointment.status = "cancelled";
    await appointment.save();

    return NextResponse.json({ success: true, message: "Appointment cancelled", appointment });
  } catch (error) {
    return NextResponse.json({ error: "Failed to cancel appointment", details: error.message }, { status: 500 });
  }
}

// Doctor updates appointment status (confirm / complete)
export async function PATCH(request, { params }) {
  const { decoded, error, status } = await requireAuth(["doctor", "admin"]);
  if (error) return NextResponse.json({ error }, { status });

  try {
    await connectDB();
    const { appointmentId } = await params;
    const { status: newStatus } = await request.json();

    const allowed = ["confirmed", "completed", "cancelled"];
    if (!allowed.includes(newStatus)) {
      return NextResponse.json({ error: "Invalid status value" }, { status: 400 });
    }

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) return NextResponse.json({ error: "Appointment not found" }, { status: 404 });

    // Doctors can only update their own appointments
    if (decoded.role === "doctor" && appointment.doctor.toString() !== decoded.id) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    appointment.status = newStatus;
    await appointment.save();

    return NextResponse.json({ success: true, message: `Appointment ${newStatus}`, appointment });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update appointment", details: error.message }, { status: 500 });
  }
}
