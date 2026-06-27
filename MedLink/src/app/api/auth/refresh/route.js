// POST /api/auth/refresh — exchange refresh token for new access token
import connectDB from "@/lib/db";
import User from "@/models/User";
import Doctor from "@/models/Doctor";
import { verifyRefreshToken, signAccessToken, setAuthCookies } from "@/lib/auth";

export async function POST(req) {
  try {
    const refreshToken = req.cookies.get("refreshToken")?.value;
    if (!refreshToken) {
      return Response.json({ error: "No refresh token" }, { status: 401 });
    }

    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch {
      return Response.json({ error: "Refresh token expired or invalid" }, { status: 401 });
    }

    await connectDB();

    // Verify token matches what's stored in DB (rotation check)
    let account;
    if (decoded.role === "doctor") {
      account = await Doctor.findById(decoded.id);
    } else {
      account = await User.findById(decoded.id);
    }

    if (!account || account.refreshToken !== refreshToken) {
      return Response.json({ error: "Refresh token reuse detected" }, { status: 401 });
    }

    const newAccessToken = signAccessToken({ id: decoded.id, role: decoded.role });
    const res = Response.json({ message: "Token refreshed" }, { status: 200 });
    res.headers.set(
      "Set-Cookie",
      `token=${newAccessToken}; HttpOnly; Path=/; Max-Age=${15 * 60}; SameSite=Lax`
    );
    return res;
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
