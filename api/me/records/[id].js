import { requireRole } from "../../../lib/auth.js";
import { json } from "../../../lib/response.js";
import { prisma } from "../../../lib/db.js";
import { parseJson } from "../../../lib/parse.js";

async function handler(req, res) {
  if (req.method !== "PATCH") return json(res, 405, { error: "method" });
  const id = req.url.split("/").pop().split("?")[0];
  const body = await parseJson(req);
  const record = await prisma.record.findUnique({ where: { id } });
  if (!record || record.employeeId !== req.user.id) return json(res, 404, { error: "notfound" });
  const updated = await prisma.record.update({
    where: { id },
    data: { status: body.status, reason: body.reason || null }
  });
  return json(res, 200, { id: updated.id, status: updated.status, reason: updated.reason });
}

export default requireRole("employee")(handler);
