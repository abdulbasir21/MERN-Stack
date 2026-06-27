import connectDB from "@/lib/db";
import Doctor from "@/models/Doctor";
import { requireAuth } from "@/lib/requireAuth";

export async function PATCH(req, { params }) {
  const auth = await requireAuth(req, ["admin"]);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });

  await connectDB();
  const { approve } = await req.json();
  const { id } = await params;

  const doctor = await Doctor.findById(id);
  if (!doctor) return Response.json({ error: "Doctor not found" }, { status: 404 });

  doctor.isApproved = approve === true;
  doctor.isRejected = approve === false;
  await doctor.save();

  return Response.json({
    message: approve ? "Doctor approved successfully" : "Doctor application rejected",
    doctor: { _id: doctor._id, name: doctor.name, isApproved: doctor.isApproved, isRejected: doctor.isRejected },
  });
}
