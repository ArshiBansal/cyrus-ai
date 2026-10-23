/* ══ GET /api/health — liveness + backend capability probe ═════ */
import { dbReady } from "@/lib/db";
import { turnstileActive } from "@/lib/server/turnstile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({
    ok: true,
    db: dbReady(),
    auth: Boolean(process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 16),
    captcha: turnstileActive(),
    time: new Date().toISOString(),
  });
}
