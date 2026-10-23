/* Fetch the real GitHub Sponsors / funding setup for the catalog's top repos.
   A repo counts only if .github/FUNDING.yml exists on its default branch -
   that is the file that makes the Sponsor button appear. Output:
   public/data/sponsors.json  */
import { readFileSync, writeFileSync } from "fs";
import { execSync } from "child_process";

const TOKEN = execSync("gh auth token", { encoding: "utf8" }).trim();
const src = readFileSync("src/data/repos.ts", "utf8");
const repos = [];
for (const line of src.split("\n")) {
  const t = line.trim().replace(/,$/, "");
  if (t.startsWith("{") && t.endsWith("}")) {
    try { repos.push(JSON.parse(t)); } catch { /* not a row */ }
  }
}
const top = repos.sort((a, b) => b.stars - a.stars).slice(0, 260);
console.log(`scanning ${top.length} repos, ${repos.length} in catalog`);

const get = async (url) => {
  const r = await fetch(url, { headers: {
    Authorization: `Bearer ${TOKEN}`, Accept: "application/vnd.github+json",
    "User-Agent": "cyrus-sponsors-scan", "X-GitHub-Api-Version": "2022-11-28",
  }});
  return r.status === 404 ? null : r;
};

/* crude YAML: top-level "key:" followed by scalar or [a, b] or list items */
function parseFunding(b64) {
  const text = Buffer.from(b64, "base64").toString("utf8");
  const out = {};
  let key = null;
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const m = line.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
    if (m) {
      key = m[1].toLowerCase();
      const v = m[2].replace(/\s*#.*$/, "").trim();
      if (!v) { out[key] = out[key] || []; continue; }
      if (v.startsWith("[")) {
        out[key] = v.slice(1, -1).split(",").map((s) => s.trim().replace(/^['"]|['"]$/g, "")).filter(Boolean);
      } else out[key] = [v.replace(/^['"]|['"]$/g, "")];
    } else if (line.startsWith("- ") && key) {
      (out[key] = out[key] || []).push(line.slice(2).trim().replace(/^['"]|['"]$/g, ""));
    }
  }
  return out;
}

const items = [];
let done = 0, errs = 0;
const QUEUE = [...top];
async function worker() {
  while (QUEUE.length) {
    const r = QUEUE.shift();
    const [owner, name] = r.repo.split("/");
    try {
      let res = await get(`https://api.github.com/repos/${owner}/${name}/contents/.github/FUNDING.yml`);
      if (!res) { done++; continue; }
      if (!res.ok) { errs++; continue; }
      const body = await res.json();
      const platforms = parseFunding(body.content);
      if (Object.keys(platforms).length) {
        items.push({ repo: r.repo, stars: r.stars, lang: r.lang, desc: r.desc,
          url: `https://github.com/${r.repo}`, platforms });
      }
    } catch (e) { errs++; }
    done++;
    if (done % 40 === 0) console.log(`  ${done}/${top.length} checked, ${items.length} funded, ${errs} errors`);
  }
}
await Promise.all([worker(), worker(), worker(), worker(), worker(), worker()]);

items.sort((a, b) => b.stars - a.stars);
const data = { crawledAt: new Date().toISOString().slice(0, 10), scanned: top.length, items };
writeFileSync("public/data/sponsors.json", JSON.stringify(data));
console.log(`DONE  ${items.length} funded repos of ${top.length} scanned (${errs} errors)`);
console.log("github:", items.filter((i) => i.platforms.github).length,
  "patreon:", items.filter((i) => i.platforms.patreon).length,
  "opencollective:", items.filter((i) => i.platforms.open_collective || i.platforms.opencollective).length,
  "custom:", items.filter((i) => i.platforms.custom).length);
