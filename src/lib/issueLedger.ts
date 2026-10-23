"use client"
/* ══ issueLedger.ts — the board's issue list, in one place ═══════════
   One localStorage key, `cyrus.issues.v1`, holds every issue a visitor is
   tracking and the stage it sits at. The finder and the board both write
   through here, so an issue tracked on /issues shows up on /dashboard/issues
   with the title it was tracked under rather than a bare "owner/repo #123".

   What is stored is what GitHub's snapshot said on the day it was read:
   stage, the date you added it, and the row's own metadata. Never an
   assignment - only a maintainer can make that true, and the board says so.
   ═══════════════════════════════════════════════════════════════════ */
import { useCallback } from "react";
import { useStored } from "./util";
import { parseIssueUrl, type IssueStage } from "./dash/shared";

/** What the crawl knew about the issue when it was tracked. */
export type IssueMeta = {
  repo: string;
  number: number;
  title: string;
  lang?: string | null;
  stars?: number;
  labels?: string[];
  beginner?: boolean;
  updated?: string;
};

export type LedgerEntry = { stage: IssueStage; added: string; meta?: IssueMeta };
export type Ledger = Record<string, LedgerEntry>;

export const LEDGER_KEY = "cyrus.issues.v1";

export function useIssueLedger() {
  const [ledger, setLedger, ready] = useStored<Ledger>(LEDGER_KEY, {});

  /** false until this browser's stored board has been read; see useStored */
  const has = useCallback((url: string) => Boolean(ledger[url]), [ledger]);
  const stageOf = useCallback((url: string): IssueStage => ledger[url]?.stage ?? "saved", [ledger]);

  /** Add an issue. Returns false when the link is not a GitHub issue or is
   *  already on the board, so callers can say so instead of pretending. */
  const add = useCallback(
    (raw: string, meta?: IssueMeta) => {
      const parsed = parseIssueUrl(raw);
      if (!parsed || ledger[parsed.url]) return false;
      setLedger({ ...ledger, [parsed.url]: { stage: "saved", added: new Date().toISOString().slice(0, 10), meta } });
      return true;
    },
    [ledger, setLedger],
  );

  const toggle = useCallback(
    (raw: string, meta?: IssueMeta) => {
      const parsed = parseIssueUrl(raw);
      if (!parsed) return false;
      const next = { ...ledger };
      const had = Boolean(next[parsed.url]);
      if (had) delete next[parsed.url];
      else next[parsed.url] = { stage: "saved" as IssueStage, added: new Date().toISOString().slice(0, 10), meta };
      setLedger(next);
      return !had;
    },
    [ledger, setLedger],
  );

  const setStage = useCallback(
    (url: string, stage: IssueStage) =>
      setLedger({ ...ledger, [url]: { ...(ledger[url] ?? { added: new Date().toISOString().slice(0, 10) }), stage } }),
    [ledger, setLedger],
  );

  const remove = useCallback(
    (url: string) => {
      const next = { ...ledger };
      delete next[url];
      setLedger(next);
    },
    [ledger, setLedger],
  );

  const clear = useCallback(() => setLedger({}), [setLedger]);

  return { ledger, setLedger, ready, has, stageOf, add, toggle, setStage, remove, clear };
}
