import { prisma } from "../lib/db.js";

export default async function handler(req, res) {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ ok: true, db: true, service: "backend", routes: "/api/*" });
  } catch (e) {
    res.status(500).json({ ok: false, db: false, error: "db_unreachable" });
  }
}
