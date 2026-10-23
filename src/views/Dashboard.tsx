"use client"
/* == Dashboard.tsx - the overview page of the board =============
   Greeting, what needs attention, the live archive index, the four
   issue stages, next steps, then the three board pages and a preview
   of what you follow. Every number is either your own board state or
   a row from the GitHub crawl.                                     == */
import { Link } from "@/lib/router";
import { btn } from "../components/ui";
import { fmt } from "../lib/util";
import { ISSUE_SIGNALS } from "../data/issueSignals";
import { useDash } from "../lib/dash/useDash";
import type { Dash } from "../lib/dash/useDash";
import { Card, DashGate, DashHead, DashShell, Ic, StatRow } from "../lib/dash/shell";
import { AttentionList } from "../lib/dash/issues";
import { DP, FEATURES, ISSUE_STAGES, STAGE_LABEL, greet } from "../lib/dash/shared";

export default function Dashboard() {
  const d = useDash();
  return (
    <DashGate dash={d}>
      <DashShell dash={d} active="/dashboard">
        <Overview d={d} />
      </DashShell>
    </DashGate>
  );
}

function Overview({ d }: { d: Dash }) {
  const user = d.user!;
  const first = user.name.split(" ")[0];
  const stages = ISSUE_STAGES.map((s) => [s, d.byStage(s).length] as const);
  const topRepos = d.savedRepos.slice(0, 4);
  const suggested = ISSUE_SIGNALS.filter((s) => !d.ledger[s.url]).slice(0, 3);

  return (
    <>
      <DashHead
        title={`${greet()}, ${first}`}
        sub={d.issues.length
          ? `${d.issues.length} issue${d.issues.length === 1 ? "" : "s"} on your ledger · ${d.saved.length} repositor${d.saved.length === 1 ? "y" : "ies"} followed · ${d.savedOrgs.length} organization${d.savedOrgs.length === 1 ? "" : "s"}`
          : `Following ${d.saved.length} repositor${d.saved.length === 1 ? "y" : "ies"} and ${d.savedOrgs.length} organization${d.savedOrgs.length === 1 ? "" : "s"} - nothing tracked yet`}
        action={
          <>
            <Link to="/dashboard/issues" className={btn("primary", "sm")}>Track an issue</Link>
            <Link to="/skills" className={btn("outline", "sm")}>Browse catalog</Link>
          </>
        }
      />

      <AttentionList d={d} limit={3} />

      <section className="bg-coffee text-foam border border-bean rounded-[18px] px-5 py-4 flex items-center gap-6 flex-wrap">
        <span className="font-mono text-[9.5px] font-bold tracking-[.16em] uppercase text-accent shrink-0">The index now</span>
        {([
          [fmt(d.index.issues), "open issues"],
          [fmt(d.index.issueRepos), "repositories crawled"],
          [fmt(d.index.catalog), "repos indexed"],
          [String(d.index.orgs), "organizations"],
        ] as [string, string][]).map(([v, l], i) => (
          <span key={l} className={"flex items-baseline gap-2" + (i ? " border-l border-bean pl-6 max-[820px]:border-0 max-[820px]:pl-0" : "")}>
            <b className="font-mono text-[16px] text-white">{v}</b>
            <span className="text-[12px] text-steam">{l}</span>
          </span>
        ))}
        <span className="ml-auto font-mono text-[10px] text-steam max-[820px]:hidden">crawled {d.index.crawledAt}</span>
      </section>

      <section aria-label="Issue stages" className="grid grid-cols-4 gap-3.5 max-[760px]:grid-cols-2">
        {stages.map(([s, n]) => (
          <Link key={s} to="/dashboard/issues"
            className="bg-card border border-line rounded-[18px] p-5 shadow-soft hover:border-accent/45 transition-colors">
            <span className="font-mono text-[9.5px] font-bold uppercase tracking-[.14em] text-dim">{STAGE_LABEL[s]}</span>
            <b className="block font-display text-[30px] font-extrabold tracking-[-.025em] mt-2">{n}</b>
            <span className="text-cocoa text-[12px]">
              {s === "working" ? "open pull requests to write" : s === "done" ? "closed out" : s === "interested" ? "scoping it out" : "on the shelf"}
            </span>
          </Link>
        ))}
      </section>

      <Card>
        <div className="flex items-baseline gap-3 flex-wrap">
          <h2 className="panel-h-lg">Next steps</h2>
          <span className="font-mono text-[11px] text-dim ml-auto">{d.stepsDone} of {d.steps.length} done</span>
        </div>
        <div className="h-1.5 rounded-full bg-clay overflow-hidden mt-3 mb-4">
          <i className="block h-full rounded-full grow-x transition-all duration-500"
            style={{ width: `${d.pct}%`, background: "linear-gradient(90deg, var(--color-accent), var(--color-ember))" }} />
        </div>
        <div className="grid gap-1">
          {d.steps.map(([on, l, to]) => (
            <Link key={l} to={to} className="group flex items-center gap-3.5 px-2 py-2.5 rounded-xl hover:bg-cream transition-colors">
              <span className={"w-[22px] h-[22px] grid place-items-center rounded-[7px] border shrink-0 transition-colors " + (on ? "bg-leaf border-leaf text-accentfg" : "border-line bg-paper text-transparent")}>
                <Ic d={DP.check} size={11} />
              </span>
              <span className={"text-[14px] font-semibold " + (on ? "text-dim line-through decoration-line" : "text-ink")}>{l}</span>
              {!on && (
                <span className="ml-auto font-mono text-[10px] uppercase tracking-[.1em] text-accent opacity-0 group-hover:opacity-100 transition-opacity">
                  Do it
                </span>
              )}
            </Link>
          ))}
        </div>
      </Card>

      <Card>
        <div className="flex items-baseline gap-3 flex-wrap mb-4">
          <h2 className="panel-h-lg">The board, page by page</h2>
          <span className="font-mono text-[11px] text-dim ml-auto">three pages</span>
        </div>
        <div className="grid grid-cols-3 gap-3 max-[900px]:grid-cols-1">
          {FEATURES.map((f) => (
            <Link key={f.id} to={`/dashboard/${f.id}`}
              className="group flex flex-col gap-2 bg-cream border border-line rounded-[16px] p-4 hover:border-accent/50 hover:-translate-y-px transition-all">
              <span className="flex items-center gap-2.5 min-w-0">
                <span className="w-[30px] h-[30px] grid place-items-center rounded-[9px] bg-card border border-line text-accent shrink-0">
                  <Ic d={DP[f.icon] ?? DP.star} size={15} />
                </span>
                <b className="card-title text-[13.5px] truncate flex-1">{f.title}</b>
              </span>
              <span className="text-cocoa text-[12.5px] leading-[1.5] line-clamp-2">{f.desc}</span>
              <span className="mt-auto font-mono text-[10px] uppercase tracking-[.1em] text-dim group-hover:text-accent transition-colors flex items-center gap-1.5">
                Open <Ic d={DP.arrow} size={12} />
              </span>
            </Link>
          ))}
        </div>
      </Card>

      {topRepos.length > 0 && (
        <Card>
          <div className="flex items-baseline gap-3 flex-wrap mb-3">
            <h2 className="panel-h-lg">Following</h2>
            <Link to="/dashboard/repos" className="ml-auto font-mono text-[10.5px] uppercase tracking-[.1em] text-dim hover:text-accent">
              All {d.savedRepos.length}
            </Link>
          </div>
          <div className="grid gap-2.5">
            {topRepos.map((r) => (
              <div key={r.repo} className="flex items-start gap-3.5 px-4 py-3 rounded-[14px] bg-cream border border-liness">
                <div className="min-w-0 flex-1">
                  <Link to={`/repo/${encodeURIComponent(r.repo)}`} className="block text-[13.5px] font-semibold truncate hover:text-accent transition-colors">
                    {r.repo}
                  </Link>
                  <p className="card-desc mt-1 line-clamp-1">{r.desc}</p>
                  <StatRow items={[["Stars", fmt(r.stars)], ["Open issues", fmt(r.issues)], ["Last update", r.updated]]} />
                </div>
                <button onClick={() => d.toggleSaved(r.repo)} aria-label={"Unfollow " + r.repo}
                  className="w-[28px] h-[28px] grid place-items-center rounded-[8px] text-accent hover:text-brick transition-colors cursor-pointer shrink-0">
                  <Ic d={DP.x} size={13} />
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {suggested.length > 0 && (
        <Card>
          <div className="flex items-baseline gap-3 flex-wrap mb-3">
            <h2 className="panel-h-lg flex items-center gap-2.5">
              <Ic d={DP.spark} size={15} /> Open issues you have not taken
            </h2>
            <Link to="/dashboard/issues" className="ml-auto font-mono text-[10.5px] uppercase tracking-[.1em] text-dim hover:text-accent">
              See more
            </Link>
          </div>
          <div className="grid gap-2.5">
            {suggested.map((s) => (
              <div key={s.url} className="flex items-center gap-3.5 px-4 py-3 rounded-[14px] bg-cream border border-liness">
                <div className="min-w-0 flex-1">
                  <span className="font-mono text-[11px] text-dim">{s.repo} · #{s.number}</span>
                  <a href={s.url} target="_blank" rel="noreferrer noopener"
                    className="block text-[13.5px] font-semibold mt-1 hover:text-accent transition-colors">{s.title}</a>
                </div>
                <button onClick={() => d.trackIssue(s.url)}
                  className="shrink-0 font-mono text-[10px] font-bold uppercase px-3 py-2 rounded-[9px] border border-line bg-card text-cocoa hover:border-accent hover:text-accent transition-colors cursor-pointer">
                  Track
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}
    </>
  );
}
