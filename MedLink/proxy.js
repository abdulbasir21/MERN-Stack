// src/proxy.js
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";

export function proxy(req) {
  const { pathname } = req.nextUrl;

  // 1️⃣ Allow public routes
  const publicPaths = ["/login/user", "/login/doctor", "/register/user", "/register/doctor", "/"];
  if (publicPaths.some(path => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // 2️⃣ Get token from cookies
  const token = req.cookies.get("token")?.value;

  if (!token) {
    // Not logged in → redirect to login page based on path
    const loginPage = pathname.includes("/doctor") ? "/login/doctor" : "/login/user";
    return NextResponse.redirect(new URL(loginPage, req.url));
  }

  try {
    // 3️⃣ Verify JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 4️⃣ Role-based authorization
    if (pathname.startsWith("/dashboard/doctor") && decoded.role !== "doctor") {
      return NextResponse.redirect(new URL("/login/doctor", req.url));
    }

    if (pathname.startsWith("/dashboard/user") && decoded.role !== "user") {
      return NextResponse.redirect(new URL("/login/user", req.url));
    }

    // 5️⃣ Attach user info to headers if needed in API routes
    const res = NextResponse.next();
    res.headers.set("x-user-id", decoded.id);
    res.headers.set("x-user-role", decoded.role);
    return res;

  } catch (err) {
    // Invalid token → redirect to login
    const loginPage = pathname.includes("/doctor") ? "/login/doctor" : "/login/user";
    return NextResponse.redirect(new URL(loginPage, req.url));
  }
}

// 6️⃣ Apply proxy to only protected routes
export const config = {
  matcher: [
    "/dashboard/:path*", // protect all dashboard routes
    // add other protected routes if needed
  ],
};
