import { requireRole } from "../lib/auth.js";
import { json } from "../lib/response.js";
import { prisma } from "../lib/db.js";
import { parseJson } from "../lib/parse.js";
import { withCors } from "../lib/cors.js";

async function me(req, res) {
  return json(res, 200, { user: req.user });
}

async function myFiles(req, res) {
  const files = await prisma.file.findMany({
    where: { assignedToId: req.user.id },
    select: { id: true, filename: true, url: true, createdAt: true, assignedToId: true }
  });
  return json(res, 200, { files });
}

async function myRecords(req, res) {
  const url = new URL(req.url, "http://localhost");
  const fileId = url.searchParams.get("fileId");
  if (!fileId) return json(res, 400, { error: "fileId" });
  const records = await prisma.record.findMany({
    where: { fileId, employeeId: req.user.id },
    orderBy: { createdAt: "asc" }
  });
  return json(res, 200, { records });
}

async function updateRecord(req, res, id) {
  const body = await parseJson(req);
  const record = await prisma.record.findUnique({ where: { id } });
  if (!record || record.employeeId !== req.user.id) return json(res, 404, { error: "notfound" });
  const updated = await prisma.record.update({
    where: { id },
    data: { status: body.status, reason: body.reason || null }
  });
  return json(res, 200, { id: updated.id, status: updated.status, reason: updated.reason });
}

async function handler(req, res) {
  const url = new URL(req.url, "http://localhost");
  const path = url.pathname.replace(/^\/api\/me/, "") || "/";

  if (req.method === "GET" && path === "/") return me(req, res);
  if (req.method === "GET" && path === "/files") return myFiles(req, res);
  if (req.method === "GET" && path === "/records") return myRecords(req, res);
  if (req.method === "PATCH" && /^\/records\/[^/]+$/.test(path)) {
    const id = path.split("/").pop();
    return updateRecord(req, res, id);
  }

  return json(res, 404, { error: "not_found" });
}

export default withCors(requireRole("employee")(handler));
