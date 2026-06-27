import connectDB from "@/lib/db";
import Appointment from "@/models/Appointment";
import Doctor from "@/models/Doctor";
import User from "@/models/User";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/requireAuth";
import { sendAppointmentConfirmation } from "@/lib/email";

export async function POST(request, { params }) {
  const { decoded, error, status } = await requireAuth(["user"]);
  if (error) return NextResponse.json({ error }, { status });

  try {
    await connectDB();
    const { doctorId } = await params;
    const { date, time } = await request.json();
    const userId = decoded.id;

    if (!doctorId.match(/^[0-9a-fA-F]{24}$/)) {
      return NextResponse.json({ error: "Invalid Doctor ID" }, { status: 400 });
    }
    if (!date || !time) {
      return NextResponse.json({ error: "Date and time are required" }, { status: 400 });
    }

    const doctor = await Doctor.findOne({ _id: doctorId, isApproved: true });
    if (!doctor) return NextResponse.json({ error: "Doctor not found or not approved" }, { status: 404 });

    // Availability check
    if (doctor.availability && doctor.availability.length > 0) {
      const dayNames = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
      const dayName = dayNames[new Date(date).getDay()];
      const slot = doctor.availability.find(a => a.day === dayName);
      if (!slot) {
        return NextResponse.json({ error: `Doctor is not available on ${dayName}` }, { status: 400 });
      }
      if (time < slot.startTime || time > slot.endTime) {
        return NextResponse.json(
          { error: `Doctor is only available ${slot.startTime}–${slot.endTime} on ${dayName}` },
          { status: 400 }
        );
      }
    }

    // Double-booking check
    const conflict = await Appointment.findOne({
      doctor: doctorId,
      date: new Date(date),
      time,
      status: { $in: ["pending","confirmed"] },
    });
    if (conflict) {
      return NextResponse.json({ error: "That slot is already booked. Please choose another time." }, { status: 400 });
    }

    const alreadyBooked = await Appointment.findOne({
      user: userId,
      doctor: doctorId,
      status: { $in: ["pending","confirmed"] },
    });
    if (alreadyBooked) {
      return NextResponse.json({ error: "You already have an active appointment with this doctor." }, { status: 400 });
    }

    const appointment = new Appointment({ user: userId, doctor: doctorId, date, time, status: "pending" });
    await appointment.save();

    // Send email notification (non-blocking)
    const user = await User.findById(userId).select("name email");
    sendAppointmentConfirmation({
      to: user?.email,
      patientName: user?.name,
      doctorName: doctor.name,
      date, time,
    });

    return NextResponse.json({ success: true, message: "Appointment booked!", appointment }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to book appointment", details: error.message }, { status: 500 });
  }
}
