import { clearAuthCookie } from "../../lib/auth.js";
import { json } from "../../lib/response.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "method" });
  clearAuthCookie(res);
  return json(res, 200, { ok: true });
}
