// src/middleware.js — Next.js route protection at the edge
import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

const ACCESS_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

// Route → allowed roles
const PROTECTED_ROUTES = [
  { pattern: /^\/dashboard\/user/, roles: ["user"] },
  { pattern: /^\/dashboard\/doctor/, roles: ["doctor"] },
  { pattern: /^\/dashboard\/admin/, roles: ["admin"] },
  { pattern: /^\/doctor-dashboard/, roles: ["doctor"] },
  { pattern: /^\/admin-dashboard/, roles: ["admin"] },
];

// Pages only accessible when NOT logged in
const AUTH_PAGES = [
  "/login",
  "/register-patient",
  "/apply-doctor",
  "/login/user",
  "/login/doctor",
  "/register/user",
  "/register/doctor",
];

const ROLE_HOME = {
  user: "/dashboard/user/home",
  doctor: "/doctor-dashboard",
  admin: "/admin-dashboard",
};

export async function middleware(request) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("token")?.value;

  let decoded = null;
  if (token) {
    try {
      const { payload } = await jwtVerify(token, ACCESS_SECRET);
      decoded = payload;
    } catch {
      if (!pathname.startsWith("/api")) {
        const url = request.nextUrl.clone();
        url.pathname = "/auth/refresh";
        url.searchParams.set("redirect", pathname);
        return NextResponse.redirect(url);
      }
    }
  }

  // Redirect logged-in users away from auth pages
  if (decoded && AUTH_PAGES.some(p => pathname === p || pathname.startsWith(p + "/"))) {
    const home = ROLE_HOME[decoded.role] || "/";
    return NextResponse.redirect(new URL(home, request.url));
  }

  // Protect dashboard routes
  for (const route of PROTECTED_ROUTES) {
    if (route.pattern.test(pathname)) {
      if (!decoded) {
        const loginUrl = new URL("/login", request.url);
        loginUrl.searchParams.set("redirect", pathname);
        return NextResponse.redirect(loginUrl);
      }
      if (!route.roles.includes(decoded.role)) {
        const home = ROLE_HOME[decoded.role] || "/";
        return NextResponse.redirect(new URL(home, request.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/doctor-dashboard",
    "/doctor-dashboard/:path*",
    "/admin-dashboard",
    "/admin-dashboard/:path*",
    "/login",
    "/login/:path*",
    "/register-patient",
    "/apply-doctor",
    "/register/:path*",
  ],
};
