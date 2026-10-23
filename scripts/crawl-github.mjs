/*
 * GitHub data crawler for the Cyrus rebuild.
 *
 * Collects real public data through the GitHub REST API and checkpoints it as
 * JSONL, so the site can be built against partial results and re-run to extend
 * them. Nothing in here is generated or estimated: every row is a response from
 * api.github.com, and each file records the query that produced it.
 *
 *   node scripts/crawl-github.mjs --phase repos --target 9000
 *   node scripts/crawl-github.mjs --phase issues --target 40000
 *   node scripts/crawl-github.mjs --phase authors --top 220
 *
 * Needs a token in GH_TOKEN (falls back to `gh auth token`). Search is capped at
 * 30 requests/minute and core at 5000/hour; both are respected here.
 */

import { mkdirSync, appendFileSync, readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";

const OUT = "data/crawl";
const API = "https://api.github.com";
const PER = 100;
const MINUTE = 60_000;
const SEARCH_PER_MIN = 28;

const args = {};
for (let i = 0; i < process.argv.length; i++) {
  const a = process.argv[i];
  if (a.startsWith("--")) args[a.slice(2)] = process.argv[i + 1]?.startsWith("--") === false ? process.argv[i + 1] : "1";
}

const TOKEN = process.env.GH_TOKEN || (() => {
  try { return execFileSync("gh", ["auth", "token"], { encoding: "utf8" }).trim(); } catch { return ""; }
})();
if (!TOKEN) { console.error("no token: set GH_TOKEN or sign in with gh"); process.exit(1); }

mkdirSync(OUT, { recursive: true });
const stamp = () => new Date().toISOString().slice(11, 19);
const log = (...m) => console.log(`[${stamp()}]`, ...m);

/* ---- two independent limiters: search window, and core quota from headers ---- */
const window_ = [];
let coreResetAt = 0, coreRemaining = 5000;
async function gate(bucket) {
  if (bucket === "search") {
    const now = Date.now();
    while (window_.length && now - window_[0] > MINUTE) window_.shift();
    if (window_.length >= SEARCH_PER_MIN) {
      const wait = MINUTE - (now - window_[0]) + 500;
      log(`search window full, sleeping ${(wait / 1000).toFixed(0)}s`);
      await new Promise(r => setTimeout(r, wait));
      return gate(bucket);
    }
    window_.push(Date.now());
  } else {
    const now = Date.now();
    if (coreRemaining < 50 && now < coreResetAt) {
      const wait = coreResetAt - now + 2000;
      log(`core quota low (${coreRemaining}), sleeping ${(wait / 1000).toFixed(0)}s until reset`);
      await new Promise(r => setTimeout(r, Math.min(wait, 30 * 60_000)));
    }
  }
}

async function get(path, bucket = "core", tries = 0) {
  await gate(bucket);
  let res;
  try {
    res = await fetch(`${API}${path}`, {
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "cyrus-data-pipeline",
      },
    });
  } catch (e) {
    if (tries > 3) return null;
    await new Promise(r => setTimeout(r, 5000));
    return get(path, bucket, tries + 1);
  }
  coreRemaining = Number(res.headers.get("x-ratelimit-remaining") ?? coreRemaining);
  coreResetAt = Number(res.headers.get("x-ratelimit-reset") ?? 0) * 1000 || coreResetAt;
  if (res.status === 403 || res.status === 429) {
    const ra = Number(res.headers.get("retry-after") || 0);
    const wait = ra ? ra * 1000 : Math.max(20_000, coreResetAt - Date.now() + 2000);
    if (tries > 5) { log("giving up on", path); return null; }
    log(`status ${res.status}, backing off ${(wait / 1000).toFixed(0)}s`);
    await new Promise(r => setTimeout(r, Math.min(wait, 10 * 60_000)));
    return get(path, bucket, tries + 1);
  }
  if (res.status === 404 || res.status === 451) return null;
  if (!res.ok) { log(`HTTP ${res.status} ${path}`, (await res.text().catch(() => "")).slice(0, 140)); return null; }
  return res.json();
}

const seen = (file, key = "id") => {
  const s = new Set();
  if (existsSync(`${OUT}/${file}`)) {
    for (const line of readFileSync(`${OUT}/${file}`, "utf8").split("\n")) {
      if (!line.trim()) continue;
      try { const j = JSON.parse(line); if (j[key] != null) s.add(j[key]); } catch { /* truncated tail */ }
    }
  }
  return s;
};
const count = (file) => existsSync(`${OUT}/${file}`) ? readFileSync(`${OUT}/${file}`, "utf8").split("\n").filter(Boolean).length : 0;
const write = (file, rows) => { if (rows.length) appendFileSync(`${OUT}/${file}`, rows.map(r => JSON.stringify(r)).join("\n") + "\n"); };

const LANGS = ["javascript", "typescript", "python", "java", "go", "rust", "c", "cpp", "csharp", "ruby",
  "php", "swift", "kotlin", "dart", "html", "css", "shell", "haskell", "scala", "elixir", "zig", "vue",
  "svelte", "solidity", "r", "julia", "clojure", "lua", "perl", "objective-c", "astro", "terraform",
  "django", "flask", "react", "node.js"];

/* ================= Phase 1: repository catalog ================= */
async function phaseRepos() {
  const file = "repos.jsonl";
  const have = seen(file);
  let n = have.size;
  const target = Number(args.target || 9000);
  const shapes = [];
  for (const lang of LANGS) shapes.push(`language:${lang} stars:>500`);
  for (const topic of ["react", "nextjs", "vue", "machine-learning", "llm", "devops", "cli", "database",
    "kubernetes", "security", "testing", "ui", "framework", "library", "api", "compiler", "wasm", "ai-agent"]) {
    shapes.push(`topic:${topic} stars:>1000`);
  }
  for (const shape of shapes) {
    if (n >= target) break;
    for (let page = 1; page <= 5; page++) {
      if (n >= target) break;
      const r = await get(`/search/repositories?q=${encodeURIComponent(shape)}&per_page=${PER}&page=${page}&sort=stars&order=desc`, "search");
      if (!r || !r.items?.length) break;
      const rows = r.items.filter(it => !have.has(it.id)).map(it => ({
        id: it.id, full_name: it.full_name, owner: it.owner?.login, owner_type: it.owner?.type,
        avatar: it.owner?.avatar_url, description: it.description, url: it.html_url,
        stars: it.stargazers_count, forks: it.forks_count, open_issues: it.open_issues_count,
        language: it.language, topics: it.topics || [], license: it.license?.spdx_id || null,
        pushed_at: it.pushed_at, created_at: it.created_at, archived: it.archived,
        has_issues: it.has_issues, size_kb: it.size, homepage: it.homepage, query: shape,
      }));
      rows.forEach(x => have.add(x.id));
      write(file, rows);
      n = have.size;
      if (page === 1) log(`repos [${shape}]: +${rows.length} total=${n} (shape has ${r.total_count})`);
      if (rows.length === 0) break;
    }
  }
  log(`PHASE repos done: ${n} repositories in catalog`);
}

/* ================= Phase 2: open issues from catalog repos ================= */
const BAD_LABELS = /duplicate|stale|wontfix|invalid|on hold|needs retri/i;

async function phaseIssues() {
  const file = "issues.jsonl";
  const have = seen(file);
  const target = Number(args.target || 40000);
  const pages = Number(args.pages || 5);
  const repos = readFileSync(`${OUT}/repos.jsonl`, "utf8").split("\n").filter(Boolean).map(l => JSON.parse(l));
  if (!repos.length) { console.error("run --phase repos first"); process.exit(1); }
  repos.sort((a, b) => b.stars - a.stars);
  log(`issues: ${repos.length} candidate repos, starting from ${have.size} already stored`);
  let n = have.size, i = 0;
  for (const repo of repos) {
    if (n >= target) break;
    if (repo.archived || repo.has_issues === false) continue;
    i++;
    for (let p = 1; p <= pages; p++) {
      if (n >= target) break;
      const items = await get(`/repos/${repo.full_name}/issues?state=open&per_page=${PER}&page=${p}&sort=created&direction=desc`, "core");
      if (!Array.isArray(items) || !items.length) break;
      const rows = items
        .filter(it => !it.pull_request && !it.pull_request_url)   // the endpoint mixes in PRs
        .filter(it => !BAD_LABELS.test((it.labels || []).map(l => l.name).join(",")))
        .filter(it => !have.has(it.id))
        .map(it => ({
          id: it.id, number: it.number, repo: repo.full_name, org: repo.owner, title: it.title,
          url: it.html_url, state: it.state, locked: it.locked, comments: it.comments,
          created_at: it.created_at, updated_at: it.updated_at, closed_at: it.closed_at,
          labels: (it.labels || []).map(l => l.name),
          author: it.user?.login, assignees: (it.assignees || []).map(a => a.login),
          reactions: it.reactions?.total_count ?? 0, body: (it.body || "").slice(0, 1500),
          repo_stars: repo.stars, repo_language: repo.language, repo_topics: repo.topics,
        }));
      rows.forEach(x => have.add(x.id));
      write(file, rows);
      n = have.size;
      if (items.length < PER) break;
    }
    if (i % 25 === 0) log(`issues: ${i}/${repos.length} repos scanned, stored=${n}, core left=${coreRemaining}`);
  }
  log(`PHASE issues done: ${n} issues from ${i} repositories`);
}

/* ================= Phase 3: PR leaderboard ================= */
async function phaseAuthors() {
  const candFile = "pr-candidates.jsonl";
  const tally = new Map();
  if (existsSync(`${OUT}/${candFile}`)) {
    for (const line of readFileSync(`${OUT}/${candFile}`, "utf8").split("\n")) {
      if (!line.trim()) continue;
      try { const j = JSON.parse(line); tally.set(j.login, j); } catch {}
    }
  }
  const since = args.since || "2025-01-01";
  const nLangs = Number(args.langs || 12);
  for (const lang of LANGS.slice(0, nLangs)) {
    for (let page = 1; page <= 6; page++) {
      const q = `is:pr is:merged language:${lang} merged:>=${since}`;
      const r = await get(`/search/issues?q=${encodeURIComponent(q)}&per_page=${PER}&page=${page}&sort=updated`, "search");
      if (!r || !r.items?.length) break;
      for (const it of r.items) {
        const login = it.user?.login;
        if (!login || it.draft) continue;
        const cur = tally.get(login) || { login, seen: 0, avatar: it.user?.avatar_url, html: it.user?.html_url };
        cur.seen += 1;
        tally.set(login, cur);
      }
    }
    log(`authors: discovered via ${lang}, pool=${tally.size}`);
  }
  const ranked = [...tally.values()].sort((a, b) => b.seen - a.seen).slice(0, 500);
  write(candFile, ranked);

  // total_count on an author-scoped search is an exact count, so the leaderboard
  // reports real all-time merged/open/review numbers rather than a sample tally.
  const out = "leaderboard.jsonl";
  const done = seen(out, "login");
  for (const c of ranked) {
    if (done.has(c.login)) continue;
    if (done.size >= Number(args.top || 220)) break;
    const s = (q) => get(`/search/issues?q=${encodeURIComponent(q)}&per_page=1`, "search");
    const merged = await s(`is:pr is:merged author:${c.login}`);
    if (!merged) continue;
    const open = await s(`is:pr is:open author:${c.login}`);
    const reviews = await s(`is:pr reviewed-by:${c.login}`);
    const profile = await get(`/users/${c.login}`, "core");
    write(out, [{
      login: c.login, avatar: c.avatar, html: c.html,
      name: profile?.name || null, bio: profile?.bio || null, company: profile?.company || null,
      location: profile?.location || null, followers: profile?.followers ?? null,
      public_repos: profile?.public_repos ?? null, created_at: profile?.created_at || null,
      merged_total: merged.total_count ?? null,
      open_total: open?.total_count ?? null,
      reviews_total: reviews?.total_count ?? null,
      discovered_in_sample: c.seen,
    }]);
    done.add(c.login);
    log(`leaderboard #${done.size} ${c.login}: merged=${merged.total_count} open=${open?.total_count} reviews=${reviews?.total_count}`);
  }
  log(`PHASE authors done: ${done.size} ranked contributors stored`);
}

const phase = args.phase || "repos";
log(`starting phase=${phase} ${JSON.stringify(args)}`);
if (phase === "repos") await phaseRepos();
else if (phase === "issues") await phaseIssues();
else if (phase === "authors") await phaseAuthors();
else { console.error("unknown phase"); process.exit(1); }
log(`done. files: repos=${count("repos.jsonl")} issues=${count("issues.jsonl")} leaders=${count("leaderboard.jsonl")}`);
