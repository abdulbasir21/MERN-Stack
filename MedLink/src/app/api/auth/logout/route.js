import { clearAuthCookies } from "@/lib/auth";
import { verifyRefreshToken } from "@/lib/auth";
import connectDB from "@/lib/db";
import User from "@/models/User";
import Doctor from "@/models/Doctor";

export async function POST(req) {
  try {
    const refreshToken = req.cookies.get("refreshToken")?.value;
    if (refreshToken) {
      await connectDB();
      try {
        const decoded = verifyRefreshToken(refreshToken);
        // Invalidate refresh token in DB
        if (decoded.role === "doctor") {
          await Doctor.findByIdAndUpdate(decoded.id, { refreshToken: null });
        } else {
          await User.findByIdAndUpdate(decoded.id, { refreshToken: null });
        }
      } catch (_) { /* token already invalid, ignore */ }
    }

    const res = Response.json({ message: "Logged out" }, { status: 200 });
    return clearAuthCookies(res);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
