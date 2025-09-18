import { requireAuth } from "../../lib/auth.js";
import { json } from "../../lib/response.js";

async function handler(req, res) {
  if (req.method !== "GET") return json(res, 405, { error: "method" });
  return json(res, 200, { user: req.user });
}

export default requireAuth(handler);
