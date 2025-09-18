import jwt from "jsonwebtoken";
import { parse, serialize } from "cookie";
import { prisma } from "./db.js";
import bcrypt from "bcrypt";

export async function signIn(username, password) {
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) return null;
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return null;
  return { id: user.id, username: user.username, role: user.role };
}

export function setAuthCookie(res, payload) {
  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "7d" });
  const cookie = serialize("auth", token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60
  });
  res.setHeader("Set-Cookie", cookie);
}

export function clearAuthCookie(res) {
  const cookie = serialize("auth", "", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0
  });
  res.setHeader("Set-Cookie", cookie);
}

export function getUserFromReq(req) {
  const cookies = parse(req.headers.cookie || "");
  const token = cookies.auth || "";
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded;
  } catch {
    return null;
  }
}

export function requireAuth(handler) {
  return async (req, res) => {
    const user = getUserFromReq(req);
    if (!user) {
      res.statusCode = 401;
      res.end(JSON.stringify({ error: "unauthorized" }));
      return;
    }
    req.user = user;
    return handler(req, res);
  };
}

export function requireRole(role) {
  return (handler) =>
    requireAuth(async (req, res) => {
      if (req.user.role !== role) {
        res.statusCode = 403;
        res.end(JSON.stringify({ error: "forbidden" }));
        return;
      }
      return handler(req, res);
    });
}
