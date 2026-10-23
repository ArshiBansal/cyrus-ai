/* ══ build-program-roster.mjs — who actually ran each program ═══════
   Reads the archives already in public/data and writes one small file
   that answers a single question per program: which organizations
   took part, how many projects each one had, and in which years.

   Nothing here is invented. A program only appears when its archive
   exists on disk; the ones that publish no public project list stay
   out of the file, and the page says so instead of guessing.
     ═══════════════════════════════════════════════════════════════ */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const data = (f) => JSON.parse(readFileSync(join(root, "public/data", f), "utf8"));
const read = (f) => { try { return data(f); } catch { return null; } };

/* archive program label -> the id used by PROGRAMS in src/data/orgs.ts */
const ARCHIVES = { GSoC: "gsoc", LFX: "lfx", Outreachy: "outreachy", "Summer of Bitcoin": "sob" };

/** name -> { n, years:Set, url, category } */
function tally(rows, programOf, yearOf) {
  const by = new Map();
  for (const r of rows) {
    const name = (r.o ?? "").trim();
    if (!name) continue;
    const prog = programOf(r);
    if (!prog || !ARCHIVES[prog]) continue;
    let e = by.get(prog + "\u0000" + name);
    if (!e) by.set(prog + "\u0000" + name, (e = { name, n: 0, years: new Set() }));
    e.n += 1;
    const y = yearOf(r);
    if (y) e.years.add(y);
  }
  return by;
}

const programs = {};
const yearsSeen = {};

/* GSoC: 5,238 accepted projects across 2022-2026, org display names */
const gsoc = read("gsoc-projects.json");
if (gsoc?.projects?.length) {
  const by = tally(gsoc.projects, () => "GSoC", (p) => p.y);
  const urls = gsoc.orgs ?? {};
  for (const [key, e] of by) {
    const [prog] = key.split("\u0000");
    const id = ARCHIVES[prog];
    (programs[id] ??= []).push({
      name: e.name, n: e.n, years: [...e.years].sort(),
      url: urls[e.name]?.url ?? "", category: urls[e.name]?.category ?? "",
    });
    yearsSeen[id] ??= new Set();
    for (const y of e.years) yearsSeen[id].add(y);
  }
}

/* LFX · Outreachy · Summer of Bitcoin: the other archive, rows carry .program */
const other = read("otherProjects.json");
if (other?.projects?.length) {
  const by = tally(other.projects, (p) => p.program, (p) => p.y);
  const urls = other.orgs ?? {};
  for (const [key, e] of by) {
    const [prog] = key.split("\u0000");
    const id = ARCHIVES[prog];
    if (!id) continue;
    (programs[id] ??= []).push({
      name: e.name, n: e.n, years: [...e.years].sort(),
      url: urls[e.name]?.url ?? "", category: urls[e.name]?.category ?? "",
    });
    yearsSeen[id] ??= new Set();
    for (const y of e.years) yearsSeen[id].add(y);
  }
}

/* GSoC also publishes a per-year organization roster with its own logo and
   tagline; fold that detail into the same entries so the card can show it. */
const gsocOrgs = read("gsoc-orgs.json");
if (gsocOrgs && programs.gsoc) {
  const byName = new Map(programs.gsoc.map((o) => [o.name, o]));
  for (const year of Object.keys(gsocOrgs)) {
    for (const o of gsocOrgs[year] ?? []) {
      const e = byName.get(o.name);
      if (!e) continue;
      if (!e.url && o.url) e.url = o.url;
      if (!e.category && o.category) e.category = o.category;
      e.years ??= [];
      const y = Number(year);
      if (y && !e.years.includes(y)) e.years.push(y);
    }
  }
  for (const e of programs.gsoc) e.years.sort((a, b) => a - b);
}

const out = {
  generated: new Date().toISOString().slice(0, 10),
  source: "public/data/gsoc-projects.json + otherProjects.json + gsoc-orgs.json",
  note: "Only programs with a public project archive appear here. Everything else is labelled on the page as a program that does not publish a roster.",
  programs: Object.fromEntries(
    Object.entries(programs)
      .map(([id, orgs]) => {
        orgs.sort((a, b) => b.n - a.n || a.name.localeCompare(b.name));
        const projects = orgs.reduce((s, o) => s + o.n, 0);
        return [id, {
          projects,
          years: [...(yearsSeen[id] ?? [])].sort(),
          orgs,
        }];
      })
      .sort((a, b) => b[1].projects - a[1].projects),
  ),
};

const dest = join(root, "public/data/program-roster.json");
writeFileSync(dest, JSON.stringify(out));
for (const [id, p] of Object.entries(out.programs)) {
  console.log(`${id.padEnd(10)} ${String(p.orgs.length).padStart(4)} orgs  ${String(p.projects).padStart(5)} projects  ${p.years.join(", ")}`);
}
console.log(`\nwrote ${dest.replace(root + "/", "")} (${(readFileSync(dest).length / 1024).toFixed(0)} KB)`);
