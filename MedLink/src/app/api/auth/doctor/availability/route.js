import connectDB from "@/lib/db";
import Doctor from "@/models/Doctor";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/requireAuth";

export async function PATCH(req) {
  const { decoded, error, status } = await requireAuth(["doctor"]);
  if (error) return NextResponse.json({ error }, { status });

  await connectDB();
  const { availability } = await req.json();

  const doctor = await Doctor.findByIdAndUpdate(
    decoded.id,
    { availability },
    { new: true }
  ).select("-password -refreshToken");

  return NextResponse.json({ success: true, doctor });
}
