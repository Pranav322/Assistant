// Contextly waitlist: collects emails into D1.
//
//   POST /join     {"email": "...", "source": "..."}   public, called by the website
//   GET  /export   Authorization: Bearer <ADMIN_KEY>   CSV by default, ?format=json for JSON
//   GET  /health
//
// There is deliberately nothing here a visitor can read back: the list is only
// reachable with ADMIN_KEY or through `wrangler d1 execute`.

export interface Env {
  DB: D1Database;
  ADMIN_KEY?: string;
}

const MAX_BODY_BYTES = 2048;
// Global cap so a script cannot fill the table: signups per rolling minute / hour.
const MAX_PER_MINUTE = 60;
const MAX_PER_HOUR = 1000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function csvCell(v: unknown): string {
  const s = String(v ?? "");
  // Prefix formula-looking cells so a spreadsheet does not execute them.
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
}

async function timingSafeEqual(a: string, b: string): Promise<boolean> {
  const enc = new TextEncoder();
  const [ha, hb] = await Promise.all([
    crypto.subtle.digest("SHA-256", enc.encode(a)),
    crypto.subtle.digest("SHA-256", enc.encode(b)),
  ]);
  const x = new Uint8Array(ha);
  const y = new Uint8Array(hb);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

async function join(request: Request, env: Env): Promise<Response> {
  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) return json({ error: "request too large" }, 413);

  let data: { email?: unknown; source?: unknown; website?: unknown } | null = null;
  try {
    data = JSON.parse(raw);
  } catch {
    return json({ error: "invalid request" }, 400);
  }

  // Honeypot: real visitors never fill the hidden "website" field. Pretend it
  // worked so a bot gets no signal.
  if (typeof data?.website === "string" && data.website.trim() !== "") return json({ ok: true });

  const email = typeof data?.email === "string" ? data.email.trim().toLowerCase() : "";
  if (!email || email.length > 254 || !EMAIL_RE.test(email)) {
    return json({ error: "Please enter a valid email address." }, 400);
  }
  const source = typeof data?.source === "string" ? data.source.slice(0, 64) : null;

  const now = Date.now();
  const recent = await env.DB.prepare(
    "SELECT SUM(created_at > ?) AS minute, COUNT(*) AS hour FROM waitlist WHERE created_at > ?",
  )
    .bind(now - 60_000, now - 3_600_000)
    .first<{ minute: number | null; hour: number }>();
  if ((recent?.minute ?? 0) >= MAX_PER_MINUTE || (recent?.hour ?? 0) >= MAX_PER_HOUR) {
    return json({ error: "Too many requests right now. Please try again in a few minutes." }, 429);
  }

  await env.DB.prepare("INSERT OR IGNORE INTO waitlist (email, source, created_at) VALUES (?, ?, ?)")
    .bind(email, source, now)
    .run();
  return json({ ok: true });
}

async function exportList(request: Request, env: Env): Promise<Response> {
  const auth = request.headers.get("Authorization") ?? "";
  const presented = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!env.ADMIN_KEY || !presented || !(await timingSafeEqual(presented, env.ADMIN_KEY))) {
    return json({ error: "unauthorized" }, 401);
  }
  const { results } = await env.DB.prepare(
    "SELECT id, email, source, created_at FROM waitlist ORDER BY id",
  ).all<{ id: number; email: string; source: string | null; created_at: number }>();

  if (new URL(request.url).searchParams.get("format") === "json") {
    return json({ count: results.length, signups: results });
  }
  const lines = ["id,email,source,joined_at_utc"];
  for (const r of results) {
    lines.push([r.id, csvCell(r.email), csvCell(r.source), new Date(r.created_at).toISOString()].join(","));
  }
  return new Response(lines.join("\n") + "\n", {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="contextly-waitlist.csv"',
      "Cache-Control": "no-store",
    },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url);
    try {
      if (pathname === "/health") return json({ ok: true });
      if (pathname === "/join" && request.method === "POST") return await join(request, env);
      if (pathname === "/export" && request.method === "GET") return await exportList(request, env);
      return json({ error: "not found" }, 404);
    } catch (err) {
      console.error("waitlist error", err);
      return json({ error: "Something went wrong. Please try again." }, 500);
    }
  },
} satisfies ExportedHandler<Env>;
