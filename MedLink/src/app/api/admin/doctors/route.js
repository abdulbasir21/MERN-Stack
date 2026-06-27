// GET /api/admin/doctors — list all doctors (approved + pending)
import connectDB from "@/lib/db";
import Doctor from "@/models/Doctor";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/requireAuth";

export async function GET(req) {
  const { decoded, error, status } = await requireAuth(["admin"]);
  if (error) return NextResponse.json({ error }, { status });

  await connectDB();
  const { searchParams } = new URL(req.url);
  const approved = searchParams.get("approved");
  const query = {};
  if (approved !== null && approved !== "") query.isApproved = approved === "true";

  const doctors = await Doctor.find(query).select("-password -refreshToken").lean();
  return NextResponse.json({ success: true, doctors });
}
