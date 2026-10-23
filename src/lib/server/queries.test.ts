/* ══ queries.test.ts — the API validation guards ═══════════════ */
import { describe, expect, it } from "vitest";
import {
  smallJson, validAppKind, validAppStatus, validEmail,
  validId, validItemType, validSubmissionKind,
} from "./queries";

describe("saved-item guards", () => {
  it("accepts only the four item types the site has pages for", () => {
    for (const t of ["repo", "org", "program", "issue"]) expect(validItemType(t)).toBe(true);
    expect(validItemType("wiki")).toBe(false);
    expect(validItemType("hackathon")).toBe(false);
    expect(validItemType(undefined)).toBe(false);
  });
  it("bounds item ids to sane strings", () => {
    expect(validId("vercel/next.js")).toBe(true);
    expect(validId("")).toBe(false);
    expect(validId("x".repeat(201))).toBe(false);
    expect(validId(42 as unknown as string)).toBe(false);
  });
});

describe("application guards", () => {
  it("knows the pipeline kinds and every status stage", () => {
    expect(validAppKind("program")).toBe(true);
    expect(validAppKind("job")).toBe(false);
    for (const s of ["drafting", "roadmap", "drafting_done", "submitted", "interview", "accepted", "rejected"]) {
      expect(validAppStatus(s)).toBe(true);
    }
    expect(validAppStatus("maybe")).toBe(false);
  });
});

describe("submission guards", () => {
  it("accepts the four inbox kinds only", () => {
    for (const k of ["org_nomination", "data_fix", "feedback", "newsletter"]) expect(validSubmissionKind(k)).toBe(true);
    expect(validSubmissionKind("spam")).toBe(false);
  });
  it("lets small JSON through and blocks oversized or non-objects", () => {
    expect(smallJson({ a: 1 })).toBe(true);
    expect(smallJson(null)).toBe(true);
    expect(smallJson("text")).toBe(false);
    expect(smallJson({ blob: "x".repeat(9000) })).toBe(false);
  });
  it("validates emails without being clever about it", () => {
    expect(validEmail("dev@example.com")).toBe(true);
    expect(validEmail("nope")).toBe(false);
    expect(validEmail("a@b")).toBe(false);
    expect(validEmail("a b@c.de")).toBe(false);
  });
});
