/* ══ demand.test.ts — the folding table is auditable, so test the folds
   that a reader would actually challenge: does "C++" stay C++, does a
   bare "C" only appear when it really means C, and do soft-skill tags
   get counted as unmatched instead of guessed into a language.     ══ */
import { describe, expect, it } from "vitest";
import { buildDemand, foldTag, pulse } from "./demand";

describe("foldTag", () => {
  it("keeps C++ out of the C bucket", () => {
    expect(foldTag("C++")).toBe("C++");
    expect(foldTag("cpp")).toBe("C++");
    expect(foldTag("C/C++")).toBe("C++");
  });

  it("folds an explicit C tag, but not an accidental letter", () => {
    expect(foldTag("Programming in C")).toBe("C");
    expect(foldTag("C language")).toBe("C");
    expect(foldTag("canvas")).toBeNull();
    expect(foldTag("cross platform")).toBeNull();
  });

  it("prefers the specific name when several patterns could match", () => {
    expect(foldTag("JavaScript")).toBe("JavaScript");
    expect(foldTag("typescript")).toBe("TypeScript");
    expect(foldTag("React")).toBe("JavaScript");
    expect(foldTag("Java")).toBe("Java & Kotlin");
    expect(foldTag("Kotlin")).toBe("Java & Kotlin");
  });

  it("labels groups by what they hold, not by one token", () => {
    expect(foldTag("Kubernetes")).toBe("Containers");
    expect(foldTag("PostgreSQL")).toBe("Databases");
    expect(foldTag("Embedded Linux")).toBe("Systems & embedded");
    expect(foldTag("CI/CD")).toBe("Testing & CI");
    expect(foldTag("LLMs")).toBe("Machine learning");
    expect(foldTag("Haskell")).toBe("Functional languages");
    expect(foldTag("WebAssembly")).toBe("WebAssembly");
  });

  it("returns null for tags that name no technology", () => {
    expect(foldTag("")).toBeNull();
    expect(foldTag("   ")).toBeNull();
    expect(foldTag("communication skills")).toBeNull();
    expect(foldTag("teamwork")).toBeNull();
  });
});

describe("buildDemand", () => {
  const rows = [
    { y: 2024, o: "Org A", tt: ["Rust", "Linux"], program: "GSoC" },
    { y: 2025, o: "Org A", tt: ["rust preferred", "communication skills"], tp: ["CLI"], program: "GSoC" },
    { y: 2025, o: "Org B", tt: ["Rust"], program: "LFX" },
  ];
  const d = buildDemand(rows);

  it("counts a project once per technology however many tags repeat it", () => {
    const rust = d.techs.find((t) => t.tech === "Rust")!;
    expect(rust.projects).toBe(3);
    expect(rust.byYear[2024]).toBe(1);
    expect(rust.byYear[2025]).toBe(2);
    expect(rust.byProgram.LFX).toBe(1);
  });

  it("reports coverage instead of hiding the tags it could not fold", () => {
    expect(d.tags).toBe(6);
    expect(d.unmatched).toBe(1);
    expect(d.matched).toBe(5);
    expect(d.projects).toBe(3);
    expect(d.years).toEqual([2024, 2025]);
    expect(d.yearTotals).toEqual({ 2024: 1, 2025: 2 });
  });

  it("ranks by volume and keeps the org roll-up with it", () => {
    expect(d.techs[0].tech).toBe("Rust");
    expect(d.techs[0].orgs[0]).toEqual({ name: "Org A", n: 2 });
  });

  it("treats a missing program field as GSoC", () => {
    const solo = buildDemand([{ y: 2026, o: "X", tt: ["Go"] }]);
    expect(solo.techs[0].byProgram).toEqual({ GSoC: 1 });
  });
});

describe("pulse", () => {
  const T = {
    tech: "T", projects: 0,
    byYear: { 2022: 10, 2023: 10, 2024: 10, 2025: 20 },
    byProgram: {}, orgs: [],
  };

  it("compares the back half of the window against the front, as a share", () => {
    const totals = { 2022: 100, 2023: 100, 2024: 200, 2025: 200 };
    expect(pulse(T, [2022, 2023, 2024, 2025], totals)).toEqual({ share: 7.5, delta: -2.5 });
  });

  it("does not read a thin crawl of the running cycle as a decline", () => {
    // five mentions out of a hundred projects, then five out of fifty:
    // the raw count is flat, the share doubled
    const t = { ...T, byYear: { 2024: 5, 2025: 5 } };
    expect(pulse(t, [2024, 2025], { 2024: 100, 2025: 50 })).toEqual({ share: 10, delta: 5 });
  });

  it("survives an archive with no projects in the denominator", () => {
    expect(pulse(T, [2022], {})).toEqual({ share: 0, delta: 0 });
  });
});
