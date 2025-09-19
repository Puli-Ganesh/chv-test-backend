import { withCors } from "../lib/cors.js";
import { json } from "../lib/response.js";
import { parseJson } from "../lib/parse.js";
import { prisma } from "../lib/db.js";
import { requireRole, setAuthCookie, clearAuthCookie, issueToken, signIn } from "../lib/auth.js";
import { parseForm, uploadToBlob, excelRows } from "../lib/upload.js";
import fs from "node:fs/promises";

async function health(req, res) {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return json(res, 200, { ok: true, db: true, service: "backend", routes: "/api/*" });
  } catch {
    return json(res, 500, { ok: false, db: false, error: "db_unreachable" });
  }
}

async function authLogin(req, res) {
  const body = await parseJson(req);
  const u = await signIn(body.username, body.password);
  if (!u) return json(res, 401, { error: "invalid" });
  setAuthCookie(res, u);
  const token = issueToken(u);
  return json(res, 200, { user: u, token });
}

async function authLogout(req, res) {
  clearAuthCookie(res);
  return json(res, 200, { ok: true });
}

async function adminEmployeesGet(req, res) {
  const employees = await prisma.user.findMany({
    where: { role: "employee" },
    select: { id: true, username: true, role: true, createdAt: true }
  });
  return json(res, 200, { employees });
}

async function adminEmployeesPost(req, res) {
  const body = await parseJson(req);
  const exists = await prisma.user.findUnique({ where: { username: body.username } });
  if (exists) return json(res, 409, { error: "exists" });
  const user = await prisma.user.create({
    data: { username: body.username, password: body.password, role: "employee" }
  });
  return json(res, 201, { id: user.id, username: user.username, role: user.role });
}

async function adminDashboard(req, res) {
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

async function adminAssign(req, res) {
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

async function adminUpload(req, res) {
  const { files, fields } = await parseForm(req);
  const file = files.file;
  if (!file) return json(res, 400, { error: "file" });
  const buffer = await fs.readFile(file.filepath);
  const url = await uploadToBlob(file);
  const rows = await excelRows(buffer);
  const employeeId = Array.isArray(fields.employeeId) ? fields.employeeId[0] : fields.employeeId || null;
  const created = await prisma.file.create({
    data: {
      filename: file.originalFilename || file.newFilename,
      url,
      uploadedById: req.user.id,
      assignedToId: employeeId || null
    }
  });
  if (rows.length) {
    await prisma.$transaction(
      rows.map((r) =>
        prisma.record.create({
          data: { fileId: created.id, employeeId: employeeId || null, data: r }
        })
      )
    );
  }
  return json(res, 201, { fileId: created.id, rows: rows.length, assignedToId: employeeId || null });
}

async function meGet(req, res) {
  return json(res, 200, { user: req.user });
}

async function meFiles(req, res) {
  const files = await prisma.file.findMany({
    where: { assignedToId: req.user.id },
    select: { id: true, filename: true, url: true, createdAt: true, assignedToId: true }
  });
  return json(res, 200, { files });
}

async function meRecords(req, res) {
  const url = new URL(req.url, "http://localhost");
  const fileId = url.searchParams.get("fileId");
  if (!fileId) return json(res, 400, { error: "fileId" });
  const records = await prisma.record.findMany({
    where: { fileId, employeeId: req.user.id },
    orderBy: { createdAt: "asc" }
  });
  return json(res, 200, { records });
}

async function meRecordPatch(req, res, id) {
  const body = await parseJson(req);
  const record = await prisma.record.findUnique({ where: { id } });
  if (!record || record.employeeId !== req.user.id) return json(res, 404, { error: "notfound" });
  const updated = await prisma.record.update({
    where: { id },
    data: { status: body.status, reason: body.reason || null }
  });
  return json(res, 200, { id: updated.id, status: updated.status, reason: updated.reason });
}

function is(path, method, target) {
  return method === target.method && path === target.path;
}

export default withCors(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  const p = url.pathname;

  if (is(p, req.method, { method: "GET", path: "/api/health" })) return health(req, res);

  if (is(p, req.method, { method: "POST", path: "/api/auth/login" })) return authLogin(req, res);
  if (is(p, req.method, { method: "POST", path: "/api/auth/logout" })) return authLogout(req, res);

  if (is(p, req.method, { method: "GET", path: "/api/admin/employees" })) return requireRole("admin")(adminEmployeesGet)(req, res);
  if (is(p, req.method, { method: "POST", path: "/api/admin/employees" })) return requireRole("admin")(adminEmployeesPost)(req, res);
  if (is(p, req.method, { method: "GET", path: "/api/admin/dashboard" })) return requireRole("admin")(adminDashboard)(req, res);
  if (is(p, req.method, { method: "POST", path: "/api/admin/files/assign" })) return requireRole("admin")(adminAssign)(req, res);
  if (is(p, req.method, { method: "POST", path: "/api/admin/files/upload" })) return requireRole("admin")(adminUpload)(req, res);

  if (is(p, req.method, { method: "GET", path: "/api/me" })) return requireRole("employee")(meGet)(req, res);
  if (is(p, req.method, { method: "GET", path: "/api/me/files" })) return requireRole("employee")(meFiles)(req, res);
  if (is(p, req.method, { method: "GET", path: "/api/me/records" })) return requireRole("employee")(meRecords)(req, res);
  if (req.method === "PATCH" && /^\/api\/me\/records\/[^/]+$/.test(p)) {
    const id = p.split("/").pop();
    return requireRole("employee")(async (rq, rs) => meRecordPatch(rq, rs, id))(req, res);
  }

  if (is(p, req.method, { method: "GET", path: "/api" })) return json(res, 200, { ok: true, service: "backend", routes: "/api/*" });

  return json(res, 404, { error: "not_found" });
});
