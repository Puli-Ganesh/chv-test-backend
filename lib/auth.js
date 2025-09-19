import { parse, serialize } from "cookie";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { prisma } from "./db.js";

const COOKIE_NAME = "auth";

function must(name) {
  if (!process.env[name]) throw new Error(`missing ${name}`);
  return process.env[name];
}

function signJwt(payload) {
  return jwt.sign(payload, must("JWT_SECRET"), { expiresIn: "7d" });
}

function verifyJwt(token) {
  return jwt.verify(token, must("JWT_SECRET"));
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
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) return null;
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return null;
  return { id: user.id, username: user.username, role: user.role };
}

function getBearer(req) {
  const h = req.headers.authorization || req.headers.Authorization;
  if (!h) return null;
  const [type, token] = String(h).split(" ");
  if (type?.toLowerCase() !== "bearer" || !token) return null;
  return token;
}

async function getUserFromReq(req) {
  const bearer = getBearer(req);
  let payload = null;

  if (bearer) {
    try {
      payload = verifyJwt(bearer);
    } catch {
      payload = null;
    }
  }

  if (!payload) {
    const cookies = parse(req.headers.cookie || "");
    const token = cookies[COOKIE_NAME];
    if (token) {
      try {
        payload = verifyJwt(token);
      } catch {
        payload = null;
      }
    }
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

export function issueToken(payload) {
  return signJwt(payload);
}
