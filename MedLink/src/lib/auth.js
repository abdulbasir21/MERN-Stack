// lib/auth.js — JWT helpers (access + refresh tokens)
import jwt from "jsonwebtoken";

const ACCESS_SECRET = process.env.JWT_SECRET;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET + "_refresh";

export function signAccessToken(payload) {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: "15m" });
}

export function signRefreshToken(payload) {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: "7d" });
}

export function verifyAccessToken(token) {
  return jwt.verify(token, ACCESS_SECRET);
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, REFRESH_SECRET);
}

export function setAuthCookies(response, accessToken, refreshToken) {
  response.headers.append(
    "Set-Cookie",
    `token=${accessToken}; HttpOnly; Path=/; Max-Age=${15 * 60}; SameSite=Lax`
  );
  response.headers.append(
    "Set-Cookie",
    `refreshToken=${refreshToken}; HttpOnly; Path=/; Max-Age=${7 * 24 * 60 * 60}; SameSite=Lax`
  );
  return response;
}

export function clearAuthCookies(response) {
  response.headers.append("Set-Cookie", `token=; HttpOnly; Path=/; Max-Age=0`);
  response.headers.append("Set-Cookie", `refreshToken=; HttpOnly; Path=/; Max-Age=0`);
  return response;
}
