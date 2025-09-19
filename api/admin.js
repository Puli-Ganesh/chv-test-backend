import { prisma } from "../lib/db.js";
import { parseJson } from "../lib/parse.js";
import { json } from "../lib/response.js";
import bcrypt from "bcrypt";
import { requireRole } from "../lib/auth.js";
import { withCors } from "../lib/cors.js";

async function getEmployees(req, res) {
  const employees = await prisma.user.findMany({
    where: { role: "employee" },
    select: { id: true, username: true, role: true, createdAt: true }
  });
  return json(res, 200, { employees });
}

async function createEmployee(req, res) {
  const body = await parseJson(req);
  const exists = await prisma.user.findUnique({ where: { username: body.username } });
  if (exists) return json(res, 409, { error: "exists" });
  const passwordHash = await bcrypt.hash(body.password, 10);
  const user = await prisma.user.create({
    data: { username: body.username, passwordHash, role: "employee" }
  });
  return json(res, 201, { id: user.id, username: user.username, role: user.role });
}

async function dashboard(req, res) {
  const employees = await prisma.user.findMany({
    where: { role: "employee" },
    select: { id: true, username: true, createdAt: true }
  });
  const files = await prisma.file.findMany({
    include: { assignedTo: { select: { id: true, username: true } } }
  });
  const aggregates = await prisma.record.groupBy({
    by: ["employeeId", "status"],
    _count: { status: true }
  });
  return json(res, 200, { employees, files, aggregates });
}

async function assignFile(req, res) {
  const body = await parseJson(req);
  const file = await prisma.file.update({
    where: { id: body.fileId },
    data: { assignedToId: body.employeeId }
  });
  await prisma.record.updateMany({
    where: { fileId: file.id },
    data: { employeeId: body.employeeId }
  });
  return json(res, 200, { ok: true });
}

async function handler(req, res) {
  const url = new URL(req.url, "http://localhost");
  const path = url.pathname.replace(/^\/api\/admin/, "") || "/";

  if (req.method === "GET" && path === "/employees") return getEmployees(req, res);
  if (req.method === "POST" && path === "/employees") return createEmployee(req, res);
  if (req.method === "GET" && path === "/dashboard") return dashboard(req, res);
  if (req.method === "POST" && path === "/files/assign") return assignFile(req, res);

  return json(res, 404, { error: "not_found" });
}

export default withCors(requireRole("admin")(handler));
