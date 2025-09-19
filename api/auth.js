import { parseJson } from "../lib/parse.js";
import { signIn, setAuthCookie, clearAuthCookie } from "../lib/auth.js";
import { json } from "../lib/response.js";
import { withCors } from "../lib/cors.js";

async function handler(req, res) {
  const url = new URL(req.url, "http://localhost");
  const path = url.pathname.replace(/^\/api\/auth/, "") || "/";

  if (req.method === "POST" && path === "/login") {
    if (!process.env.JWT_SECRET) return json(res, 500, { error: "missing_jwt_secret" });
    const body = await parseJson(req);
    const u = await signIn(body.username, body.password);
    if (!u) return json(res, 401, { error: "invalid" });
    setAuthCookie(res, u);
    return json(res, 200, { user: u });
  }

  if (req.method === "POST" && path === "/logout") {
    clearAuthCookie(res);
    return json(res, 200, { ok: true });
  }

  return json(res, 404, { error: "not_found" });
}

export default withCors(handler);
