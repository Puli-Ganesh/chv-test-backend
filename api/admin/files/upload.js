import { requireRole } from "../../../lib/auth.js";
import { json } from "../../../lib/response.js";
import { parseForm, uploadToBlob, excelRows } from "../../../lib/upload.js";
import { prisma } from "../../../lib/db.js";
import fs from "node:fs/promises";

async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "method" });
  const { files, fields } = await parseForm(req);
  const file = files.file;
  if (!file) return json(res, 400, { error: "file" });
  const buffer = await fs.readFile(file.filepath);
  const url = await uploadToBlob(file);
  const rows = await excelRows(buffer);
  const created = await prisma.file.create({
    data: {
      filename: file.originalFilename || file.newFilename,
      url,
      uploadedById: req.user.id
    }
  });
  if (rows.length) {
    await prisma.$transaction(
      rows.map((r) =>
        prisma.record.create({
          data: { fileId: created.id, data: r }
        })
      )
    );
  }
  return json(res, 201, { fileId: created.id, rows: rows.length });
}

export default requireRole("admin")(handler);
