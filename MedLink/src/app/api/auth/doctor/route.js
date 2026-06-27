import { NextResponse } from "next/server";
import Doctor from "@/models/Doctor";
import connectDB from "@/lib/db";
import { requireAuth } from "@/lib/requireAuth";

export async function GET() {
  await connectDB();
  const { decoded, error, status } = await requireAuth(["doctor"]);
  if (error) return NextResponse.json({ error }, { status });

  const doctor = await Doctor.findById(decoded.id).select("-password -refreshToken");
  return NextResponse.json(doctor);
}
