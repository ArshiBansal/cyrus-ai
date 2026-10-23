/* ══ turnstile.ts — Cloudflare Turnstile on the sign-in endpoints ═══════
   Two variables decide everything:

     NEXT_PUBLIC_TURNSTILE_SITE_KEY   the "0x..." key the browser widget renders
     TURNSTILE_SECRET_KEY             the matching "x0..." server-only secret

   With either one missing the check is dormant and the routes behave exactly
   as they did before, so a fresh clone, a preview deploy or a half-configured
   production never locks a real user out of their own board. With both set the
   check is strict and fails closed: a missing token, a replayed token or an
   unreachable siteverify endpoint all reject the request, because a captcha
   that can be stepped around is not protection, it is decoration.

   Only the endpoint that *sends* a code is gated. That is where the abuse
   actually costs something - Resend quota, a spammy-looking sender reputation,
   and an inbox flooded with codes somebody never asked for. Guessing an
   already-issued code is a different threat and stays guarded by the six-try
   lock in email.ts.                                                   ═ */

const siteKey = (): string => (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "").trim();
const secretKey = (): string => (process.env.TURNSTILE_SECRET_KEY ?? "").trim();

/** true when both halves exist, i.e. the widget must render and the token must verify */
export const turnstileActive = (): boolean => Boolean(siteKey() && secretKey());

export type TurnstileResult = { ok: true } | { ok: false; reason: "captcha_required" | "captcha_failed" };

const SITEVERIFY = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/**
 * Verify one widget token. `ip` is optional extra signal Cloudflare uses for
 * its risk score, taken from the x-forwarded-for head Vercel sets.
 */
export async function verifyTurnstile(token?: string, ip?: string): Promise<TurnstileResult> {
  if (!turnstileActive()) return { ok: true };
  if (!token || token.length < 8) return { ok: false, reason: "captcha_required" };
  try {
    const body = new URLSearchParams({ secret: secretKey(), response: token });
    if (ip) body.set("remoteip", ip);
    const r = await fetch(SITEVERIFY, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    const d = (await r.json()) as { success?: boolean; "error-codes"?: string[] };
    return d.success === true ? { ok: true } : { ok: false, reason: "captcha_failed" };
  } catch {
    return { ok: false, reason: "captcha_failed" };
  }
}

/** the visitor-facing reason strings, kept in one place so UI and API agree */
export const TURNSTILE_MESSAGES: Record<"captcha_required" | "captcha_failed", string> = {
  captcha_required: "Please confirm you are human before we email a code.",
  captcha_failed: "That verification expired - tick it again and resend.",
};
