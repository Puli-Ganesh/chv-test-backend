import { requireRole } from "../../lib/auth.js";
import { json } from "../../lib/response.js";
import { prisma } from "../../lib/db.js";

async function handler(req, res) {
  if (req.method !== "GET") return json(res, 405, { error: "method" });
  const url = new URL(req.url, "http://localhost");
  const fileId = url.searchParams.get("fileId");
  if (!fileId) return json(res, 400, { error: "fileId" });
  const records = await prisma.record.findMany({
    where: { fileId, employeeId: req.user.id },
    orderBy: { createdAt: "asc" }
  });
  return json(res, 200, { records });
}

export default requireRole("employee")(handler);
