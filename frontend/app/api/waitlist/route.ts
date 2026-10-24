import { NextResponse } from "next/server";

// Same-origin proxy to the waitlist Worker (Cloudflare Worker + D1, see
// waitlist-worker/). Going through the site keeps the page free of cross-origin
// requests, so the Content-Security-Policy `connect-src` does not need to change.
const WAITLIST_API_URL =
  process.env.WAITLIST_API_URL ?? "https://contextly-waitlist.priyanshi.workers.dev";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: { email?: unknown; website?: unknown; source?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }

  try {
    const upstream = await fetch(`${WAITLIST_API_URL}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: body.email,
        website: body.website,
        source: typeof body.source === "string" ? body.source : "site",
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    const data = await upstream.json().catch(() => ({}));
    return NextResponse.json(data, { status: upstream.status });
  } catch {
    return NextResponse.json(
      { error: "We could not save that just now. Please try again in a moment." },
      { status: 502 }
    );
  }
}
