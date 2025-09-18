import { put } from "@vercel/blob";
import formidable from "formidable";
import XLSX from "xlsx";

export function parseForm(req) {
  return new Promise((resolve, reject) => {
    const form = formidable({ multiples: false, keepExtensions: true });
    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      else resolve({ fields, files });
    });
  });
}

export async function uploadToBlob(file) {
  const arrayBuffer = await fileToArrayBuffer(file.filepath);
  const res = await put(file.originalFilename || file.newFilename, arrayBuffer, {
    access: "public",
    token: process.env.BLOB_READ_WRITE_TOKEN
  });
  return res.url;
}

function fileToArrayBuffer(path) {
  return import("node:fs/promises").then(({ readFile }) => readFile(path));
}

export async function excelRows(fileBuffer) {
  const workbook = XLSX.read(fileBuffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  return XLSX.utils.sheet_to_json(worksheet);
}
