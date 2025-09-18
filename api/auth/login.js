import { parseJson } from "../../lib/parse.js";
import { signIn, setAuthCookie } from "../../lib/auth.js";
import { json } from "../../lib/response.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "method" });
  const body = await parseJson(req);
  const u = await signIn(body.username, body.password);
  if (!u) return json(res, 401, { error: "invalid" });
  setAuthCookie(res, u);
  return json(res, 200, { user: u });
}
