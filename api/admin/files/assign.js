import { requireRole } from "../../../lib/auth.js";
import { parseJson } from "../../../lib/parse.js";
import { json } from "../../../lib/response.js";
import { prisma } from "../../../lib/db.js";
import { withCors } from "../../../lib/cors.js";

async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "method" });

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

export default withCors(requireRole("admin")(handler));
