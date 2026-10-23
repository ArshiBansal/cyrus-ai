/* ══ turnstile.test.ts — the captcha gate's three states ════════════
   Dormant while either key is missing (so a fresh clone never gets locked
   out of its own sign-in), strict once both exist, and fail-closed when
   Cloudflare is unreachable. siteverify is stubbed - no network in tests. ═ */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { turnstileActive, verifyTurnstile } from "./turnstile";

const SITE = "NEXT_PUBLIC_TURNSTILE_SITE_KEY";
const SECRET = "TURNSTILE_SECRET_KEY";
const saved: Record<string, string | undefined> = {};

const configure = (on: boolean) => {
  if (on) {
    process.env[SITE] = "0x4AAA000000000000000000AA";
    process.env[SECRET] = "0x4AAAAAAPLACEHOLDERSECRET";
  } else {
    delete process.env[SITE];
    delete process.env[SECRET];
  }
};

const siteverify = (body: unknown) => {
  const f = vi.fn(async (_url: string, _init?: RequestInit) =>
    new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } }));
  vi.stubGlobal("fetch", f);
  return f;
};

beforeEach(() => {
  saved[SITE] = process.env[SITE];
  saved[SECRET] = process.env[SECRET];
});

afterEach(() => {
  configure(false);
  if (saved[SITE]) process.env[SITE] = saved[SITE];
  if (saved[SECRET]) process.env[SECRET] = saved[SECRET];
  vi.unstubAllGlobals();
});

describe("turnstile config probe", () => {
  it("is inactive with no keys, active with both", () => {
    configure(false);
    expect(turnstileActive()).toBe(false);
    process.env[SITE] = "0x4AAA000000000000000000AA";
    expect(turnstileActive()).toBe(false); // half-configured stays dormant, not broken
    delete process.env[SITE];
    process.env[SECRET] = "x";
    expect(turnstileActive()).toBe(false);
    configure(true);
    expect(turnstileActive()).toBe(true);
  });
});

describe("verifyTurnstile while dormant", () => {
  it("passes any request through without calling Cloudflare", async () => {
    configure(false);
    const f = vi.fn();
    vi.stubGlobal("fetch", f);
    expect(await verifyTurnstile(undefined)).toEqual({ ok: true });
    expect(await verifyTurnstile("whatever")).toEqual({ ok: true });
    expect(f).not.toHaveBeenCalled();
  });
});

describe("verifyTurnstile when configured", () => {
  beforeEach(() => configure(true));

  it("rejects a missing or stub token before any network call", async () => {
    const f = vi.fn();
    vi.stubGlobal("fetch", f);
    expect(await verifyTurnstile(undefined)).toEqual({ ok: false, reason: "captcha_required" });
    expect(await verifyTurnstile("short")).toEqual({ ok: false, reason: "captcha_required" });
    expect(f).not.toHaveBeenCalled();
  });

  it("accepts the token when siteverify says success", async () => {
    const f = siteverify({ success: true, "error-codes": [] });
    expect(await verifyTurnstile("a-real-looking-token", "203.0.113.7")).toEqual({ ok: true });
    const [url, init] = f.mock.calls[0];
    expect(String(url)).toContain("/turnstile/v0/siteverify");
    const form = new URLSearchParams(String((init as RequestInit).body));
    expect(form.get("response")).toBe("a-real-looking-token");
    expect(form.get("remoteip")).toBe("203.0.113.7");
    expect(form.get("secret")).toBe(process.env[SECRET]);
  });

  it("rejects a token Cloudflare does not recognise", async () => {
    siteverify({ success: false, "error-codes": ["invalid-input-response"] });
    expect(await verifyTurnstile("replayed-token")).toEqual({ ok: false, reason: "captcha_failed" });
  });

  it("fails closed when siteverify is unreachable or answers junk", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("network down"); }));
    expect(await verifyTurnstile("some-long-enough-token")).toEqual({ ok: false, reason: "captcha_failed" });
    vi.stubGlobal("fetch", vi.fn(async () => new Response("not json", { status: 200 })));
    expect(await verifyTurnstile("some-long-enough-token")).toEqual({ ok: false, reason: "captcha_failed" });
  });
});
