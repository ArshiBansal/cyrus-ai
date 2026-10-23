/* ══ demand.ts — what five years of accepted projects asked for ═════
   The archives for GSoC, LFX, Outreachy and Summer of Bitcoin carry the
   skill tags the organizers wrote on each accepted project. This folds
   those free-text tags into canonical technologies and counts them, so
   "how much demand is there for Rust" is answered with a number of real
   projects rather than an opinion.

   Tags are messy ("Rust Preferred", "Programming in C"). Anything the
   fold does not recognize is left out and counted in `unmatched`, and
   the page reports that share - a coverage number you can disagree with
   is better than a clean chart nobody can check.                  ══ */

export interface ArchRow {
  y: number;
  o: string;              /* organization name as published */
  tt?: string[];          /* skills the organizer asked for */
  tp?: string[];          /* technologies the project touched */
  program?: string;       /* only present in the non-GSoC file */
}

export interface TechStat {
  tech: string;
  projects: number;                       /* distinct accepted projects naming it */
  byYear: Record<number, number>;
  byProgram: Record<string, number>;
  orgs: { name: string; n: number }[];
}

/* first match wins, so specific names come before general ones. "C" sits
   at the bottom deliberately: a bare c would otherwise swallow "c++",
   "c lang", "canvas" and friends before their own patterns ran. */
const PATTERNS: [string, RegExp][] = [
  ["C++", /\bc\+\+|\bcpp\b/],
  ["Python", /python|numpy|pandas|django|flask|fastapi|pytorch|tensorflow|scikit|jupyter/],
  ["Rust", /\brust\b|rustlang/],
  ["Go", /\bgolang\b|\bgo\b(?!od|ld|al)/],
  ["JavaScript", /javascript|node\.?js|react|next\.?js|vue|svelte|express|\bjs\b/],
  ["TypeScript", /typescript|\bts\b/],
  ["Java & Kotlin", /\bjava\b(?!script)|spring|android|kotlin|gradle/],
  ["Shell & CLI", /bash|shell script|zsh|\bshell\b|command[- ]line|\bcli\b/],
  ["WebAssembly", /webassembly|\bwasm\b|emscripten/],
  ["Databases", /\bsql\b|postgres|sqlite|mysql|redis|database|\bmongo\w*\b/],
  ["Containers", /kubernetes|\bk8s\b|docker|container|\bhelm\b/],
  ["Systems & embedded", /\blinux\b|kernel|qemu|\brisc-v\b|embedded|bare[- ]metal|device driver|\bdriver\b/],
  ["Machine learning", /machine learning|\bml\b|deep learning|neural|\bllms?\b|transformer|inference|\bnlp\b|computer vision|opencv/],
  ["Graphics", /opengl|vulkan|\bwebgl\b|shader|renderer|graphics|three\.?js/],
  ["Frontend & design", /front[- ]?end|html|css|accessibility|ui design|figma|\bux\b/],
  ["Documentation", /documentation|\bdocs?\b|technical writing|user guide/],
  ["Testing & CI", /\btesting\b|test suite|\btests?\b|ci\/cd|\bci\b|quality assurance|fuzzing/],
  ["Security", /security|cryptography|crypto|vulnerabilit|penetration|authenticat/],
  ["APIs", /\bapi\b|\brest\b|graphql|grpc|openapi|webhook/],
  ["Data visualization", /visuali[sz]|\bd3\b|chart|dashboard|dataviz/],
  ["Compilers & parsing", /compiler|\bllvm\b|parser|lexical|static analysis|interpreter/],
  ["Networking", /\bnetwork|protocol|\btcp\b|\budp\b|\bhttp\b|\bdns\b|socket|bluetooth|wireless/],
  ["Swift", /\bswift\b|\bios\b|objective-c|xcode/],
  ["Ruby", /\bruby\b|rails/],
  ["PHP", /\bphp\b|wordpress|laravel/],
  ["Functional languages", /haskell|ocaml|\bscala\b|erlang|elixir|clojure|\bf#\b/],
  ["C", /\bprogramming in c\b|\bc language\b|\bc\b(?!lang|hat|an|pp|sharp|ross|li|lo|o)/],
];

/** fold one organizer tag into a technology, or null if it says nothing we recognize */
export function foldTag(raw: string): string | null {
  const s = raw.toLowerCase().trim();
  if (!s) return null;
  for (const [tech, re] of PATTERNS) if (re.test(s)) return tech;
  return null;
}

export function buildDemand(rows: ArchRow[]): {
  techs: TechStat[];
  projects: number;
  tags: number;
  matched: number;
  unmatched: number;
  years: number[];
  yearTotals: Record<number, number>;
} {
  const map = new Map<string, TechStat>();
  const yearTotals: Record<number, number> = {};
  let tags = 0; let matched = 0;

  for (const r of rows) {
    yearTotals[r.y] = (yearTotals[r.y] ?? 0) + 1;
    const seen = new Set<string>();
    for (const raw of [...(r.tt ?? []), ...(r.tp ?? [])]) {
      tags++;
      const tech = foldTag(raw);
      if (!tech) continue;
      matched++;
      seen.add(tech);
    }
    for (const tech of seen) {
      const e = map.get(tech) ?? { tech, projects: 0, byYear: {}, byProgram: {}, orgs: [] };
      e.projects++;
      e.byYear[r.y] = (e.byYear[r.y] ?? 0) + 1;
      const prog = r.program ?? "GSoC";
      e.byProgram[prog] = (e.byProgram[prog] ?? 0) + 1;
      map.set(tech, e);
    }
    /* org roll-up is a second pass per tech: cheap enough at this scale */
    for (const tech of seen) {
      const e = map.get(tech)!;
      const hit = e.orgs.find((o) => o.name === r.o);
      if (hit) hit.n++; else e.orgs.push({ name: r.o, n: 1 });
    }
  }

  const techs = [...map.values()]
    .map((e) => ({ ...e, orgs: e.orgs.sort((a, b) => b.n - a.n || a.name.localeCompare(b.name)).slice(0, 8) }))
    .sort((a, b) => b.projects - a.projects || a.tech.localeCompare(b.tech));
  const years = [...new Set(rows.map((r) => r.y))].sort((a, b) => a - b);
  return { techs, projects: rows.length, tags, matched, unmatched: tags - matched, years, yearTotals };
}

/**
 * The two-half pulse, measured as a *share* of each cycle's accepted
 * projects rather than a raw count. The running cycle is always a
 * smaller crawl than the settled ones behind it, so a raw comparison
 * reads as "everything is dying" - a share cancels that out.
 * `delta` is in percentage points.
 */
export function pulse(t: TechStat, years: number[], yearTotals: Record<number, number>): { share: number; delta: number } {
  if (!years.length) return { share: 0, delta: 0 };
  const half = Math.ceil(years.length / 2);
  const rate = (ys: number[]) => {
    const n = ys.reduce((s, y) => s + (t.byYear[y] ?? 0), 0);
    const d = ys.reduce((s, y) => s + (yearTotals[y] ?? 0), 0);
    return d ? (n / d) * 100 : 0;
  };
  const old = rate(years.slice(0, half));
  const now = rate(years.slice(half));
  return { share: Math.round(now * 10) / 10, delta: Math.round((now - old) * 10) / 10 };
}
