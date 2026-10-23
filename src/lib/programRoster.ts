/* ══ programRoster.ts — every organization that took part in a program.
   Two sources, and the page says which one a row came from:
   - public/data/program-roster.json, built by scripts/build-program-roster.mjs
     from the GSoC / LFX / Outreachy / Summer of Bitcoin project archives, so
     those rows carry a real project count and the years that org appeared;
   - the GitHub topics on the repositories we already track, which is the
     only honest evidence for programs that publish no roster at all.
   An org links to its cyrus.ai profile when the directory has one, and to
   its own official page otherwise. We never send someone to a page we did
   not build from their real record.                                     ═ */
import { useEffect, useState } from "react";
import { ORGS } from "../data/orgs";
import { topicOrgsOf } from "../data/programAssoc";

export type RosterOrg = {
  name: string;
  n: number;
  years: number[];
  url: string;
  category: string;
  login: string | null;
  to: string;
  href: string;
  evidence: "archive" | "topics";
};

export type RosterFile = {
  generated: string;
  programs: Record<string, { projects: number; years: number[]; orgs: Omit<RosterOrg, "login" | "to" | "href" | "evidence">[] }>;
};

/* display name / login -> our directory profile, when we have one */
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
const DIR = new Map<string, string>();
for (const o of ORGS) { DIR.set(norm(o.login), o.login); DIR.set(norm(o.name), o.login); }
const GITHUB = (login: string) => `https://github.com/${login}`;

function link(o: { name: string; url?: string; login?: string | null }): { login: string | null; to: string } {
  const found = DIR.get(norm(o.name));
  if (found) return { login: found, to: `/organizations/${found}` };
  const byLogin = o.login ? DIR.get(norm(o.login)) : undefined;
  if (byLogin) return { login: byLogin, to: `/organizations/${byLogin}` };
  return { login: o.login ?? null, to: o.url || (o.login ? GITHUB(o.login) : "") };
}

/* programs whose roster comes from the project archives */
export const ARCHIVE_IDS = ["gsoc", "lfx", "outreachy", "sob"] as const;

/* one-time fetch shared by every program page in the session */
let cache: Promise<RosterFile | null> | null = null;
export function loadRoster(): Promise<RosterFile | null> {
  if (!cache) {
    cache = fetch("/data/program-roster.json")
      .then((r) => (r.ok ? (r.json() as Promise<RosterFile>) : null))
      .catch(() => null);
  }
  return cache;
}
function roster(): Promise<RosterFile | null> { return loadRoster(); }

/* programs with no public participant list, and where that fact is stated
   on the page instead of guessed at: everything except the four archives
   plus the two badge rosters derived from GitHub topics */
export const TOPIC_ID_OF: Record<string, string> = { gssoc: "gssoc", oct: "oct" };

/**
 * One number per program for the directory cards: real organizations we can
 * name, where they came from, and how many projects that record covers.
 */
export type RosterIndex = { ready: boolean; byId: Record<string, { orgs: number; projects: number; source: "archive" | "topics" }> };

export function useRosterIndex(): RosterIndex {
  const [state, setState] = useState<RosterIndex>({ ready: false, byId: {} });
  useEffect(() => {
    let go = true;
    loadRoster().then((file) => {
      if (!go) return;
      const byId: RosterIndex["byId"] = {};
      for (const [id, e] of Object.entries(file?.programs ?? {})) {
        if (e.orgs?.length) byId[id] = { orgs: e.orgs.length, projects: e.projects, source: "archive" };
      }
      for (const [id, topic] of Object.entries(TOPIC_ID_OF)) {
        if (byId[id]) continue;
        const t = topicOrgsOf(topic);
        if (t.length) byId[id] = { orgs: t.length, projects: t.reduce((s, o) => s + o.n, 0), source: "topics" };
      }
      setState({ ready: true, byId });
    });
    return () => { go = false; };
  }, []);
  return state;
}

export type Roster = {
  ready: boolean;
  orgs: RosterOrg[];
  projects: number;
  years: number[];
  source: "archive" | "topics" | "none";
  generated: string;
};

const EMPTY: Roster = { ready: false, orgs: [], projects: 0, years: [], source: "none", generated: "" };

/**
 * The roster for one program. `topicId` is the badge id used by
 * programAssoc (gssoc, oct) and is only consulted when the archive has
 * nothing for this program.
 */
export function useRoster(id: string, topicId?: string): Roster {
  const [state, setState] = useState<Roster>(EMPTY);

  useEffect(() => {
    let go = true;
    roster().then((file) => {
      if (!go) return;
      const entry = file?.programs?.[id];
      if (entry?.orgs?.length) {
        const orgs = entry.orgs.map((o) => {
          const l = link(o);
          return { ...o, ...l, href: l.to.startsWith("/") ? l.to : l.to || `https://github.com/search?q=${encodeURIComponent(o.name)}&type=organizations`, evidence: "archive" as const };
        });
        setState({ ready: true, orgs, projects: entry.projects, years: entry.years, source: "archive", generated: file?.generated ?? "" });
        return;
      }
      const topics = topicId ? topicOrgsOf(topicId) : [];
      if (topics.length) {
        const orgs = topics.map((t) => {
          const l = link({ name: t.login, login: t.login });
          return {
            name: t.login, n: t.n, years: [2026], url: GITHUB(t.login), category: "",
            ...l, href: l.to, evidence: "topics" as const,
          };
        });
        setState({ ready: true, orgs, projects: orgs.reduce((s, o) => s + o.n, 0), years: [2026], source: "topics", generated: "" });
        return;
      }
      setState({ ...EMPTY, ready: true });
    });
    return () => { go = false; };
  }, [id, topicId]);

  return state;
}
