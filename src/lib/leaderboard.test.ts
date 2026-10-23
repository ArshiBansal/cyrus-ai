/* ══ leaderboard.test.ts — the ranking rules, before the page uses them ══ */
import { describe, expect, it } from "vitest";
import {
  bots, has, humans, isBot, num, ordinal, podium, rank, search, total,
} from "./leaderboard";
import type { LeaderRow } from "./leaderboard";
import { BOTS, LEADERS } from "../data/leaderboard";

const row = (over: Partial<LeaderRow> & { login: string }): LeaderRow => ({
  avatar: `https://avatars.githubusercontent.com/u/1?v=4`,
  html: `https://github.com/${over.login}`,
  name: null, company: null, location: null,
  followers: 0, public_repos: 0, joined: null,
  merged_total: 0, open_total: 0, reviews_total: 0, discovered_in_sample: 0,
  ...over,
});

describe("isBot", () => {
  it("takes GitHub's own [bot] suffix", () => {
    expect(isBot("dependabot[bot]")).toBe(true);
    expect(isBot("claude[bot]")).toBe(true);
  });

  it("takes a GitHub App avatar even when the handle looks human", () => {
    expect(isBot("some-service", "https://avatars.githubusercontent.com/in/29110?v=4")).toBe(true);
    // an integer user id is not an app id
    expect(isBot("some-service", "https://avatars.githubusercontent.com/u/29110?v=4")).toBe(false);
  });

  it("takes a handle that ends in bot", () => {
    expect(isBot("BrewTestBot")).toBe(true);
    expect(isBot("cgwalters-bot")).toBe(true);
  });

  it("does not turn every handle containing bot into a machine", () => {
    expect(isBot("CybotTM")).toBe(false);
    expect(isBot("flow-bot-gh")).toBe(false);
    expect(isBot("robotlabs")).toBe(false);
  });
});

describe("rank", () => {
  const rows = [row({ login: "b", merged_total: 50 }), row({ login: "a", merged_total: 50 }), row({ login: "c", merged_total: 90 })];

  it("orders by the chosen column", () => {
    expect(rank(rows, "merged_total").map((r) => r.login)).toEqual(["c", "a", "b"]);
  });

  it("breaks ties on the login so the order is stable across builds", () => {
    expect(rank(rows, "merged_total")[1].login).toBe("a");
    expect(rank([...rows].reverse(), "merged_total")[1].login).toBe("a");
  });

  it("numbers the set it was given, starting at one", () => {
    expect(rank(rows, "merged_total").map((r) => r.rank)).toEqual([1, 2, 3]);
  });

  it("treats a missing count as zero rather than NaN", () => {
    const withNull = [...rows, row({ login: "d", merged_total: null })];
    const out = rank(withNull, "merged_total");
    expect(out[out.length - 1].login).toBe("d");
    expect(out.every((r) => Number.isFinite(r.merged_total ?? 0))).toBe(true);
  });

  it("flags the bots it is handed without removing them", () => {
    const out = rank([row({ login: "person" }), row({ login: "worker[bot]" })], "merged_total");
    expect(out.map((r) => r.bot)).toEqual([false, true]);
  });
});

describe("humans and bots", () => {
  const mixed = [row({ login: "person" }), row({ login: "worker[bot]" }), row({ login: "BrewTestBot" })];
  it("partitions the set", () => {
    expect(humans(mixed).map((r) => r.login)).toEqual(["person"]);
    expect(bots(mixed).map((r) => r.login)).toEqual(["worker[bot]", "BrewTestBot"]);
    expect(humans(mixed).length + bots(mixed).length).toBe(mixed.length);
  });
});

describe("search", () => {
  const rows = [row({ login: "shivammathur", name: "Shivam Mathur", company: "php", location: "Delhi, IN" })];
  it("matches the handle, name, company or place", () => {
    for (const q of ["shiv", "Mathur", "php", "delhi"]) expect(search(rows, q)).toHaveLength(1);
  });
  it("requires every term", () => {
    expect(search(rows, "php delhi")).toHaveLength(1);
    expect(search(rows, "php rust")).toHaveLength(0);
  });
  it("returns everything for an empty or whitespace query", () => {
    expect(search(rows, "")).toBe(rows);
    expect(search(rows, "   ")).toBe(rows);
  });
});

describe("helpers", () => {
  it("num guards null and non-finite values", () => {
    expect([num(null), num(undefined), num(NaN), num(7)]).toEqual([0, 0, 0, 7]);
  });
  it("has distinguishes a reported zero from no number at all", () => {
    expect([has(0), has(null), has(undefined)]).toEqual([true, false, false]);
  });
  it("totals a column", () => {
    expect(total([row({ login: "a", merged_total: 3 }), row({ login: "b", merged_total: 4 })], "merged_total")).toBe(7);
  });
  it("ordinals the awkward teens", () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 111].map(ordinal)).toEqual(
      ["1st", "2nd", "3rd", "4th", "11th", "12th", "13th", "21st", "111th"],
    );
  });
  it("only calls the first three a podium", () => {
    expect([podium(1), podium(3), podium(4)]).toEqual([1, 3, null]);
  });
});

describe("the shipped board", () => {
  it("keeps the bots out of the human ranking", () => {
    expect(LEADERS.some((r) => isBot(r.login, r.avatar))).toBe(false);
    expect(BOTS.every((r) => isBot(r.login, r.avatar))).toBe(true);
  });

  it("arrives pre-ordered by merged PRs so the default view needs no sort", () => {
    for (let i = 1; i < LEADERS.length; i++) {
      expect(num(LEADERS[i - 1].merged_total)).toBeGreaterThanOrEqual(num(LEADERS[i].merged_total));
    }
  });

  it("carries a real GitHub profile for every row", () => {
    for (const r of LEADERS) {
      expect(r.html).toBe(`https://github.com/${r.login}`);
      expect(r.avatar).toMatch(/^https:\/\/avatars\.githubusercontent\.com\/u\//);
    }
    // apps live under /apps, and their avatar is the only thing that says so
    for (const r of BOTS) expect(r.avatar).toMatch(/^https:\/\/avatars\.githubusercontent\.com\//);
  });

  it("has enough humans to fill a top 100", () => {
    expect(LEADERS.length).toBeGreaterThanOrEqual(100);
  });
});
