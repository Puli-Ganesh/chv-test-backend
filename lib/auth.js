// lib/auth.js
import { parse, serialize } from "cookie";
import jwt from "jsonwebtoken";
import { prisma } from "./db.js";

const COOKIE_NAME = "auth";

function signJwt(payload) {
  if (!process.env.JWT_SECRET) throw new Error("missing JWT_SECRET");
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "7d" });
}

export function issueToken(payload) {
  if (!process.env.JWT_SECRET) throw new Error("missing JWT_SECRET");
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "7d" });
}

export function setAuthCookie(res, payload) {
  const token = signJwt(payload);
  const cookie = serialize(COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    path: "/",
    maxAge: 7 * 24 * 60 * 60
  });
  res.setHeader("Set-Cookie", cookie);
}

export function clearAuthCookie(res) {
  const cookie = serialize(COOKIE_NAME, "", {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    path: "/",
    maxAge: 0
  });
  res.setHeader("Set-Cookie", cookie);
}

export async function signIn(username, password) {
  const user = await prisma.user.findUnique({
    where: { username },
    select: { id: true, username: true, role: true, passwordHash: true }
  });
  if (!user) return null;

  // PLAINTEXT comparison
  if (user.passwordHash !== password) return null;

  return { id: user.id, username: user.username, role: user.role };
}

async function getUserFromReq(req) {
  const cookies = parse(req.headers.cookie || "");
  const token = cookies[COOKIE_NAME];
  if (!token) return null;

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return null;
  }
  if (!payload?.id) return null;

  const user = await prisma.user.findUnique({
    where: { id: payload.id },
    select: { id: true, username: true, role: true }
  });
  return user || null;
}

export function requireAuth(handler) {
  return async (req, res) => {
    const user = await getUserFromReq(req);
    if (!user) {
      res.statusCode = 401;
      res.setHeader("Content-Type", "application/json");
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
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "forbidden" }));
        return;
      }
      return handler(req, res);
    });
}
