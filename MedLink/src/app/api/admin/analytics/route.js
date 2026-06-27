// GET /api/admin/analytics — platform-wide stats
import connectDB from "@/lib/db";
import User from "@/models/User";
import Doctor from "@/models/Doctor";
import Appointment from "@/models/Appointment";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/requireAuth";

export async function GET() {
  const { error, status } = await requireAuth(["admin"]);
  if (error) return NextResponse.json({ error }, { status });

  await connectDB();

  const [
    totalUsers, totalDoctors, pendingDoctors,
    totalAppointments, byStatus,
  ] = await Promise.all([
    User.countDocuments({ role: "user" }),
    Doctor.countDocuments({ isApproved: true }),
    Doctor.countDocuments({ isApproved: false }),
    Appointment.countDocuments(),
    Appointment.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ]),
  ]);

  const statusMap = Object.fromEntries(byStatus.map(s => [s._id, s.count]));

  return NextResponse.json({
    success: true,
    analytics: {
      totalUsers,
      totalDoctors,
      pendingDoctors,
      totalAppointments,
      appointmentsByStatus: {
        pending: statusMap.pending || 0,
        confirmed: statusMap.confirmed || 0,
        completed: statusMap.completed || 0,
        cancelled: statusMap.cancelled || 0,
      },
    },
  });
}
