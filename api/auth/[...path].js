// api/auth/[...path].js
import { parseJson } from "../../lib/parse.js";
import { signIn, setAuthCookie, issueToken, clearAuthCookie } from "../../lib/auth.js";
import { json } from "../../lib/response.js";
import { withCors } from "../../lib/cors.js";

async function handler(req, res) {
  const url = new URL(req.url, "http://localhost");
  const base = "/api/auth";
  const path = url.pathname.startsWith(base) ? url.pathname.slice(base.length) || "/" : "/";

  if (req.method === "POST" && path === "/login") {
    const body = await parseJson(req);
    const u = await signIn(body.username, body.password);
    if (!u) return json(res, 401, { error: "invalid" });
    setAuthCookie(res, u);
    const token = issueToken(u);
    return json(res, 200, { user: u, token });
  }

  if (req.method === "POST" && path === "/logout") {
    clearAuthCookie(res);
    return json(res, 200, { ok: true });
  }

  return json(res, 404, { error: "not_found" });
}

export default withCors(handler);
