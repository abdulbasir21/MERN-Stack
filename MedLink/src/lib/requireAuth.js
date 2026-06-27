// lib/requireAuth.js — reusable server-side auth guard for API routes
import { verifyAccessToken } from "@/lib/auth";
import { cookies } from "next/headers";

/**
 * Verifies the access token from cookies.
 * Returns { decoded, error }.
 */
export async function requireAuth(allowedRoles = []) {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  if (!token) return { decoded: null, error: "Not authenticated", status: 401 };

  try {
    const decoded = verifyAccessToken(token);
    if (allowedRoles.length && !allowedRoles.includes(decoded.role)) {
      return { decoded: null, error: "Forbidden", status: 403 };
    }
    return { decoded, error: null };
  } catch (err) {
    return { decoded: null, error: "Token expired or invalid", status: 401 };
  }
}
