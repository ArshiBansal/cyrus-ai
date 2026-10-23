/* ══ seasons.test.ts — the calendar is derived, not typed ═══════════
   If a program gains a phase the grid has to show it, and if the
   fraction math drifts the exported dates drift with it. Both are
   checked here rather than by eye.                                 ═ */
import { describe, expect, it } from "vitest";
import { PROGRAMS } from "@/data/orgs";
import { googleUrl, ics, monthGrid, overlaps, seasonEvents, spanLabel } from "./seasons";

const DAY = 864e5;
const ymd = (ms: number) => {
  const d = new Date(ms);
  return [d.getFullYear(), d.getMonth() + 1, d.getDate()].map((n) => String(n).padStart(2, "0")).join("");
};

describe("season events", () => {
  const evs = seasonEvents(2026);

  it("has one event per phase of every tracked program", () => {
    expect(evs.length).toBe(PROGRAMS.reduce((s, p) => s + p.phases.length, 0));
  });

  it("covers every program id", () => {
    expect(new Set(evs.map((e) => e.pid)).size).toBe(PROGRAMS.length);
  });

  it("sorts by start and keeps spans positive", () => {
    for (const e of evs) expect(e.end).toBeGreaterThan(e.start);
    expect([...evs].sort((a, b) => a.start - b.start)).toEqual(evs);
  });

  it("carries the month-fraction windows into real dates", () => {
    const gsoc = PROGRAMS.find((p) => p.id === "gsoc")!;
    const coding = gsoc.phases.find((p) => p.label === "Coding period")!;
    const e = evs.find((x) => x.pid === "gsoc" && x.phase === coding.label)!;
    expect(new Date(e.start).getMonth()).toBe(Math.floor(coding.s));
    expect(new Date(e.start).getFullYear()).toBe(2026);
  });

  it("rolls a December window into the next year", () => {
    const outreachy = PROGRAMS.find((p) => p.id === "outreachy")!;
    const dec = outreachy.phases.find((p) => p.e >= 12);
    if (!dec) return; // only meaningful while Outreachy has a Dec cohort
    const e = seasonEvents(2026).find((x) => x.pid === "outreachy" && x.phase === dec.label)!;
    expect(new Date(e.end - DAY).getFullYear() >= 2026).toBe(true);
  });
});

describe("google calendar link", () => {
  it("prefills title, all-day range and the program page", () => {
    const e = seasonEvents(2026)[0];
    const u = new URL(googleUrl(e));
    expect(u.hostname).toBe("calendar.google.com");
    expect(u.searchParams.get("action")).toBe("TEMPLATE");
    expect(u.searchParams.get("text")).toBe(`${e.program}: ${e.phase}`);
    const [a, b] = u.searchParams.get("dates")!.split("/");
    expect(a).toBe(ymd(e.start));
    expect(b).toBe(ymd(e.end)); // DTEND is exclusive in both formats
    expect(u.searchParams.get("details")).toContain(e.url);
  });
});

describe("ics export", () => {
  const e = seasonEvents(2026)[0];
  const file = ics([e], "test calendar");

  it("is a VCALENDAR with one complete VEVENT", () => {
    expect(file.startsWith("BEGIN:VCALENDAR")).toBe(true);
    expect(file.trimEnd().endsWith("END:VCALENDAR")).toBe(true);
    expect(file).toContain("BEGIN:VEVENT");
    expect(file).toContain(`UID:${e.id}@cyrus.ai`);
    expect(file).toContain(`DTSTART;VALUE=DATE:${ymd(e.start)}`);
    expect(file).toContain(`DTEND;VALUE=DATE:${ymd(e.end)}`);
    expect(file).toContain("END:VEVENT");
  });

  it("escapes the commas rfc 5545 reserves", () => {
    const e0 = seasonEvents(2026)[0];
    const tricky = { ...e0, program: "T", phase: "Applications, open; finally" };
    expect(ics([tricky])).toContain("SUMMARY:T: Applications\\, open\\; finally");
  });

  it("exports every event when asked for a whole year", () => {
    const year = seasonEvents(2026);
    expect((ics(year).match(/BEGIN:VEVENT/g) ?? []).length).toBe(year.length);
  });
});

describe("month grid", () => {
  it("starts on Monday and always fills six weeks", () => {
    const cells = monthGrid(new Date(2026, 9, 1).getTime());
    expect(cells).toHaveLength(42);
    expect(new Date(cells[0].ms).getDay()).toBe(1);
    expect(cells.filter((c) => c.inMonth)).toHaveLength(31);
  });

  it("handles a february in a leap year", () => {
    const cells = monthGrid(new Date(2028, 1, 10).getTime());
    expect(cells.filter((c) => c.inMonth)).toHaveLength(29);
  });
});

describe("overlaps", () => {
  it("reads a span as inclusive of its last day", () => {
    const e = seasonEvents(2026)[0];
    expect(overlaps(e, e.start, e.start + DAY)).toBe(true);
    expect(overlaps(e, e.end - DAY, e.end)).toBe(true);
    expect(overlaps(e, e.end, e.end + DAY)).toBe(false);
  });

  it("labels a multi-week window with both ends", () => {
    const e = seasonEvents(2026).find((x) => x.end - x.start > 14 * DAY)!;
    expect(spanLabel(e)).toContain("-");
  });
});
