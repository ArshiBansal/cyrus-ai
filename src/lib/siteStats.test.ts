/* ══ siteStats.test.ts — the chrome cannot drift from the data ════════ */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { REPOS } from "@/data/repos";
import { PROGRAMS } from "@/data/orgs";
import { CRAWL } from "@/data/crawlStats";
import { ARCHIVE_PROJECTS, STATS, fmt, statsLine } from "./siteStats";

const archiveLength = (file: string): number => {
  const json = JSON.parse(readFileSync(new URL(`../../public/data/${file}`, import.meta.url), "utf8"));
  return (json.projects ?? []).length;
};

describe("stats the footer and metadata quote", () => {
  it("counts the catalog from the data module, not a literal", () => {
    expect(STATS.repos).toBe(REPOS.length);
    expect(STATS.catalog).toBeGreaterThan(STATS.repos);
    expect(STATS.programs).toBe(PROGRAMS.length);
  });

  it("keeps the archive literal equal to the two JSON files", () => {
    const total = archiveLength("gsoc-projects.json") + archiveLength("otherProjects.json");
    expect(ARCHIVE_PROJECTS).toBe(total);
  });

  it("quotes the crawl for every issue number", () => {
    expect(STATS.issues).toBe(CRAWL.issues);
    expect(STATS.issueRepos).toBe(CRAWL.reposWithIssues);
    expect(STATS.beginnerIssues).toBe(CRAWL.beginnerLabelled);
    expect(STATS.crawledAt).toBe(CRAWL.crawledAt);
  });

  it("never claims more issue-bearing repos than the crawl covered", () => {
    expect(STATS.issueRepos).toBeLessThanOrEqual(CRAWL.catalogRepos);
    expect(STATS.beginnerIssues).toBeLessThanOrEqual(STATS.issues);
  });
});

describe("copy helpers", () => {
  it("formats with thousands separators", () => {
    expect(fmt(1528)).toBe("1,528");
  });

  it("writes a summary line made only of live numbers", () => {
    const line = statsLine();
    expect(line).toContain(`${fmt(STATS.issues)} open issues`);
    expect(line).toContain(`${STATS.programs} tracked open-source programs`);
    expect(line).not.toMatch(/NaN|undefined|hackathon/i);
  });
});
