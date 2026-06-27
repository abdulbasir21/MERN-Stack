import connectDB from "@/lib/db";
import User from "@/models/User";
import { requireAuth } from "@/lib/requireAuth";

export async function GET(req) {
  const auth = await requireAuth(req, ["admin"]);
  if (auth.error) {
    return Response.json(
      { error: auth.error },
      { status: auth.status }
    );
  }

  await connectDB();

  // ✅ FIX: only real patients
  const patients = await User.find({ role: "user" })
    .select("-password -refreshToken")
    .sort({ createdAt: -1 });

  return Response.json({ patients });
}