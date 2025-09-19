// api/admin/employees.js
import { prisma } from "../../lib/db.js";
import { parseJson } from "../../lib/parse.js";
import { json } from "../../lib/response.js";
import { requireRole } from "../../lib/auth.js";
import { withCors } from "../../lib/cors.js";

async function handler(req, res) {
  if (req.method === "GET") {
    const employees = await prisma.user.findMany({
      where: { role: "employee" },
      select: { id: true, username: true, role: true, createdAt: true }
    });
    return json(res, 200, { employees });
  }

  if (req.method === "POST") {
    const body = await parseJson(req);
    const exists = await prisma.user.findUnique({ where: { username: body.username } });
    if (exists) return json(res, 409, { error: "exists" });

    const user = await prisma.user.create({
      data: { username: body.username, passwordHash: body.password, role: "employee" }
    });
    return json(res, 201, { id: user.id, username: user.username, role: user.role });
  }

  return json(res, 405, { error: "method" });
}

export default withCors(requireRole("admin")(handler));
