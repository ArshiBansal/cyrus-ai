/* ══ leaderboard.ts — the ranking rules, away from the DOM ═══════
   Everything the leaderboard page asserts about a person comes through
   here: who counts as a bot, how a column is ordered, what a tie looks
   like. Keeping it pure means the rules are testable and the page cannot
   quietly disagree with itself about who is number one.

   The numbers themselves are GitHub's. Each row's merged_total,
   open_total and reviews_total is the total_count of an author-scoped
   search, which GitHub reports exactly rather than approximately, so
   nothing here rounds, scales or estimates.
   ═════════════════════════════════════════════════════════════════ */

export interface LeaderRow {
  login: string;
  avatar: string;
  html: string;
  name: string | null;
  company: string | null;
  location: string | null;
  followers: number | null;
  public_repos: number | null;
  joined: string | null;
  merged_total: number | null;
  open_total: number | null;
  reviews_total: number | null;
  /** merged PRs by this author seen in the recency sample that built the pool */
  discovered_in_sample: number;
}

export type Ranked = LeaderRow & { rank: number; bot: boolean };

export type Metric = "merged_total" | "reviews_total" | "open_total" | "followers" | "discovered_in_sample";

/** A column of the board. `sortable` is false where the number is a
    property of our sample rather than of the person - ranking by it would
    rank the crawl, not the contributor - so it is shown but never offered
    as the way to order the list. */
export interface MetricDef { key: Metric; label: string; unit: string; note: string; sortable: boolean }

export const METRICS: MetricDef[] = [
  { key: "merged_total", label: "Merged PRs", unit: "merged", note: "Pull requests this author has had merged, all time.", sortable: true },
  { key: "reviews_total", label: "Reviews", unit: "reviews", note: "Pull requests this author has reviewed, all time.", sortable: true },
  { key: "open_total", label: "Open PRs", unit: "open", note: "Pull requests currently open from this author.", sortable: true },
  { key: "followers", label: "Followers", unit: "followers", note: "GitHub followers on the public profile.", sortable: true },
  { key: "discovered_in_sample", label: "In the sample", unit: "seen", note: "Merged PRs by this author that our own 2025-and-later sample happened to catch. A read on how recent the work is, not a total.", sortable: false },
];

export const RANKABLE: MetricDef[] = METRICS.filter((m) => m.sortable);

/** GitHub's own convention plus the two shapes that show up in the wild:
    an App avatar and a handle that ends in "bot". Deliberately narrow -
    CybotTM and flow-bot-gh are people, and a substring match would have
    filed them as machines. */
export function isBot(login: string, avatar = ""): boolean {
  if (/\[bot\]$/i.test(login)) return true;
  if (/avatars\.githubusercontent\.com\/in\/\d+/.test(avatar)) return true;
  return /bot$/i.test(login);
}

/** GitHub omits a count for accounts it will not search; treat that as
    zero for ordering but never render it as a claim. */
export const num = (v: number | null | undefined): number =>
  typeof v === "number" && Number.isFinite(v) ? v : 0;

export const has = (v: number | null | undefined): boolean =>
  typeof v === "number" && Number.isFinite(v);

export const humans = (rows: LeaderRow[]): LeaderRow[] => rows.filter((r) => !isBot(r.login, r.avatar));

export const bots = (rows: LeaderRow[]): LeaderRow[] => rows.filter((r) => isBot(r.login, r.avatar));

/** Rank within the set you were given, so hiding the bots renumbers the
    board to 1..n rather than leaving holes. Ties break on the login so
    the order is the same on every machine and in every build. */
export function rank(rows: LeaderRow[], metric: Metric): Ranked[] {
  return [...rows]
    .sort((a, b) => num(b[metric]) - num(a[metric]) || a.login.localeCompare(b.login, "en"))
    .map((r, i) => ({ ...r, rank: i + 1, bot: isBot(r.login, r.avatar) }));
}

const HAY = (r: LeaderRow) =>
  [r.login, r.name, r.company, r.location].filter(Boolean).join(" ").toLowerCase();

export function search(rows: LeaderRow[], q: string): LeaderRow[] {
  const needle = q.trim().toLowerCase();
  if (!needle) return rows;
  const terms = needle.split(/\s+/);
  return rows.filter((r) => {
    const hay = HAY(r);
    return terms.every((t) => hay.includes(t));
  });
}

export const total = (rows: LeaderRow[], metric: Metric): number =>
  rows.reduce((s, r) => s + num(r[metric]), 0);

/** 1st / 2nd / 3rd, and everything after that is just the number */
export function ordinal(n: number): string {
  if (n % 100 >= 11 && n % 100 <= 13) return `${n}th`;
  return `${n}${[null, "st", "nd", "rd"][n % 10] ?? "th"}`;
}

/** The band a rank sits in, used for the medal treatment on the top three */
export const podium = (n: number): 1 | 2 | 3 | null => (n === 1 || n === 2 || n === 3 ? n : null);
