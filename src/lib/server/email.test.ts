/* ══ email.test.ts — verification-code logic (memory + envelope) ══
   No DATABASE_URL in the test env, so storeCode/checkCode exercise the
   fallbacks: in-memory round-trip, single-use burn, wrong tries lockout
   and the 30s resend lock, plus the HMAC envelope that lets a second
   serverless instance verify a code it never issued.                ═ */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  checkCode, envelopeReady, genCode, issueEnvelope, normalizeEmail, storeCode, validEmail, __mem,
} from "./email";

const mail = () => `t${Math.random().toString(36).slice(2, 8)}@example.com`;

describe("email validators", () => {
  it("accepts normal addresses", () => {
    expect(validEmail("ada@lovelace.dev")).toBe(true);
    expect(validEmail("  You@Example.COM ")).toBe(true);
  });
  it("rejects junk", () => {
    expect(validEmail("")).toBe(false);
    expect(validEmail("no-at-sign")).toBe(false);
    expect(validEmail("a@b")).toBe(false);
    expect(validEmail("a b@c.io")).toBe(false);
  });
  it("normalizes trim + lowercase", () => {
    expect(normalizeEmail("  Ada@Lovalace.Dev ")).toBe("ada@lovalace.dev");
  });
  it("generates six digits", () => {
    for (let i = 0; i < 20; i++) expect(genCode()).toMatch(/^\d{6}$/);
  });
});

describe("code store (memory fallback)", () => {
  it("verifies the right code once, then burns it", async () => {
    const e = mail();
    expect(await storeCode(e, "123456")).toBe(true);
    expect(await checkCode(e, "123456")).toEqual({ ok: true });
    expect(await checkCode(e, "123456")).toEqual({ ok: false, reason: "no_code" });
  });

  it("rejects a wrong code without burning it", async () => {
    const e = mail();
    await storeCode(e, "246810");
    expect(await checkCode(e, "000000")).toEqual({ ok: false, reason: "wrong" });
    expect(await checkCode(e, "246810")).toEqual({ ok: true });
  });

  it("locks after six wrong tries", async () => {
    const e = mail();
    await storeCode(e, "111222");
    for (let i = 0; i < 6; i++) expect(await checkCode(e, "999999")).toEqual({ ok: false, reason: "wrong" });
    expect(await checkCode(e, "111222")).toEqual({ ok: false, reason: "locked" });
    expect(__mem.has(e)).toBe(false);
  });

  it("enforces the 30s resend lock", async () => {
    const e = mail();
    expect(await storeCode(e, "135790")).toBe(true);
    expect(await storeCode(e, "246810")).toBe(false);
  });

  it("reports no_code for an unknown address", async () => {
    expect(await checkCode(mail(), "123456")).toEqual({ ok: false, reason: "no_code" });
  });
});

describe("code envelope (no DATABASE_URL, SESSION_SECRET set)", () => {
  const KEY = "qa-test-secret-length-over-sixteen";
  beforeEach(() => { process.env.SESSION_SECRET = KEY; });
  afterEach(() => { delete process.env.SESSION_SECRET; });

  it("is inert without a signing secret", () => {
    delete process.env.SESSION_SECRET;
    expect(envelopeReady()).toBe(false);
    expect(issueEnvelope(mail(), "123456")).toBeNull();
  });

  it("verifies on an instance that never saw the start request", async () => {
    const e = mail();
    const tok = issueEnvelope(e, "654321");
    expect(typeof tok).toBe("string");
    /* deliberately no storeCode(): only the envelope carries the hash */
    expect(await checkCode(e, "654321", tok!)).toEqual({ ok: true });
  });

  it("never trusts a tampered or foreign envelope", async () => {
    const e = mail();
    const tok = issueEnvelope(e, "111111")!;
    expect(await checkCode(e, "111111", "nonsense")).toEqual({ ok: false, reason: "no_code" });
    expect(await checkCode(e, "111111", tok + "x")).toEqual({ ok: false, reason: "no_code" });
    expect(await checkCode(`other@${e.split("@")[1]}`, "111111", tok)).toEqual({ ok: false, reason: "no_code" });
  });

  it("counts tries across instances and burns after six", async () => {
    const e = mail();
    let tok = issueEnvelope(e, "222222")!;
    for (let i = 0; i < 6; i++) {
      const r = await checkCode(e, "999999", tok);
      if (r.ok) throw new Error("a wrong code must not verify");
      expect(r.reason).toBe("wrong");
      expect(typeof r.challenge).toBe("string");
      tok = r.challenge!;
    }
    expect(await checkCode(e, "222222", tok)).toEqual({ ok: false, reason: "locked", challenge: null });
  });

  it("spends the envelope - a correct code works once", async () => {
    const e = mail();
    const tok = issueEnvelope(e, "333333")!;
    expect(await checkCode(e, "333333", tok)).toEqual({ ok: true });
    expect(await checkCode(e, "333333", tok)).toEqual({ ok: false, reason: "no_code" });
  });
});
