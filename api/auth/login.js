import { parseJson } from "../../lib/parse.js";
import { signIn, setAuthCookie } from "../../lib/auth.js";
import { json } from "../../lib/response.js";
import { withCors } from "../../lib/cors.js";

async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "method" });
  if (!process.env.JWT_SECRET) return json(res, 500, { error: "missing_jwt_secret" });
  const body = await parseJson(req);
  const u = await signIn(body.username, body.password);
  if (!u) return json(res, 401, { error: "invalid" });
  setAuthCookie(res, u);
  return json(res, 200, { user: u });
}

export default withCors(handler);
