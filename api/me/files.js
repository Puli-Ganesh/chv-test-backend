import { requireRole } from "../../lib/auth.js";
import { json } from "../../lib/response.js";
import { prisma } from "../../lib/db.js";

async function handler(req, res) {
  if (req.method !== "GET") return json(res, 405, { error: "method" });
  const files = await prisma.file.findMany({
    where: { assignedToId: req.user.id },
    select: { id: true, filename: true, url: true, createdAt: true, assignedToId: true }
  });
  return json(res, 200, { files });
}

export default requireRole("employee")(handler);
