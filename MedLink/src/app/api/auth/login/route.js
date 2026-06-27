import connectDB from "@/lib/db";
import User from "@/models/User";
import Doctor from "@/models/Doctor";
import { signAccessToken, signRefreshToken, setAuthCookies } from "@/lib/auth";
import { rateLimit } from "@/lib/rateLimit";

export async function POST(req) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    const rl = rateLimit(`login:${ip}`, 10, 15 * 60 * 1000);
    if (rl.blocked) {
      return Response.json(
        { error: `Too many attempts. Try again in ${rl.retryAfter}s.` },
        { status: 429 }
      );
    }

    await connectDB();
    const { email, password } = await req.json();

    let account = await User.findOne({ email });
    let role = account?.role || null;

    if (!account) {
      account = await Doctor.findOne({ email });
      if (account) role = "doctor";
    }

    if (!account) {
      return Response.json({ error: "No account found with this email" }, { status: 400 });
    }

    const isMatch = await account.comparePassword(password);
    if (!isMatch) {
      return Response.json({ error: "Incorrect password" }, { status: 400 });
    }

    // Doctors can login regardless of approval status — dashboard handles the status display
    const payload = { id: account._id, role };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    account.refreshToken = refreshToken;
    await account.save();

    const safeAccount = account.toObject();
    delete safeAccount.password;
    delete safeAccount.refreshToken;

    const res = new Response(
      JSON.stringify({ message: "Logged in successfully", role, user: safeAccount }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );

    return setAuthCookies(res, accessToken, refreshToken);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
