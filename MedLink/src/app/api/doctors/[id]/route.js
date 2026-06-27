import connectDB from "@/lib/db";
import Doctor from "@/models/Doctor";
import { NextResponse } from "next/server";

export async function GET(request, { params }) {
  const { id } = await params;

  if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
    return NextResponse.json({ error: "Invalid Doctor ID" }, { status: 400 });
  }

  try {
    await connectDB();
    const doctor = await Doctor.findOne({ _id: id, isApproved: true }).select("-password -refreshToken");
    if (!doctor) return NextResponse.json({ error: "Doctor not found" }, { status: 404 });
    return NextResponse.json({ success: true, doctor });
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
