import { requireRole } from "../../lib/auth.js";
import { json } from "../../lib/response.js";
import { prisma } from "../../lib/db.js";
import { withCors } from "../../lib/cors.js";

async function handler(req, res) {
  if (req.method !== "GET") return json(res, 405, { error: "method" });

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

export default withCors(requireRole("admin")(handler));
