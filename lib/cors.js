// lib/cors.js
const ALLOWED = (process.env.CORS_ORIGINS || "").split(",").map(s => s.trim()).filter(Boolean);

export function withCors(handler) {
  return async (req, res) => {
    const origin = req.headers.origin || "";
    const allowOrigin = ALLOWED.includes(origin) ? origin : "";
    res.setHeader("Vary", "Origin");
    if (allowOrigin) {
      res.setHeader("Access-Control-Allow-Origin", allowOrigin);
      res.setHeader("Access-Control-Allow-Credentials", "true");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
      res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,PUT,DELETE,OPTIONS");
    }
    if (req.method === "OPTIONS") {
      res.statusCode = 204;
      res.end();
      return;
    }
    return handler(req, res);
  };
}
