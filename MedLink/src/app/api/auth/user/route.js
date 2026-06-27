import { NextResponse } from "next/server";
import User from "@/models/User";
import connectDB from "@/lib/db";
import { requireAuth } from "@/lib/requireAuth";

export async function GET() {
  await connectDB();
  const { decoded, error, status } = await requireAuth(["user", "admin"]);
  if (error) return NextResponse.json({ error }, { status });

  const user = await User.findById(decoded.id).select("-password -refreshToken");
  return NextResponse.json(user);
}
