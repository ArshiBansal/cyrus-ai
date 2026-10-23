/* ══ seasons.ts — the program calendar as dated events ═══════════════
   PROGRAMS holds each season as phase windows positioned in the calendar
   year (month + fraction of that month). This turns those windows into
   real, all-day events: the span the board's calendar draws, the range a
   Google Calendar link needs, and the VEVENT block a .ics file needs.

   Where the dates come from: the phase windows are read off each
   organizer's own published calendar and rounded to the nearest few days,
   so a date here is good to within about three days. The calendar says
   that on the page; nobody should plan a visa around one of these.     ═ */
import { PROGRAMS } from "../data/orgs";

export interface SeasonEvent {
  id: string;
  program: string;
  pid: string;
  owner: string;
  phase: string;
  color: string;
  url: string;
  start: number; /* local midnight, first day of the window */
  end: number;   /* local midnight, the day AFTER the last day */
}

const MON_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const DAY = 864e5;

const daysIn = (y: number, m: number) =>
  m === 1 && ((y % 4 === 0 && y % 100 !== 0) || y % 400 === 0) ? 29 : MON_DAYS[m];

/** month-fraction (4.6 = mid-May) -> local midnight on that day */
function at(year: number, v: number): number {
  let m = Math.floor(v);
  let y = year;
  while (m >= 12) { m -= 12; y += 1; }
  const len = daysIn(y, m);
  const day = Math.min(len, Math.max(1, Math.round((v - Math.floor(v)) * len) + 1));
  return new Date(y, m, day).getTime();
}

/** every phase of every tracked program, for one cycle year */
export function seasonEvents(year: number): SeasonEvent[] {
  const out: SeasonEvent[] = [];
  for (const p of PROGRAMS) {
    for (const ph of p.phases) {
      const start = at(year, ph.s);
      const raw = at(year, ph.e);
      // a window that ends on the 1st of a month means "through the last day
      // of the month before", so push the exclusive end to the next midnight
      const end = raw <= start ? start + DAY : raw;
      out.push({
        id: `${p.id}-${ph.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${year}`,
        program: p.name, pid: p.id, owner: p.owner, phase: ph.label,
        color: ph.c, url: p.url, start, end,
      });
    }
  }
  return out.sort((a, b) => a.start - b.start || a.program.localeCompare(b.program));
}

export const programsOfSeason = () => PROGRAMS.map((p) => ({ id: p.id, name: p.name, owner: p.owner }));

/* ── calendar exports ─────────────────────────────────────────────
   Both formats use all-day semantics: a Google `dates=A/B` pair and an
   iCal DTEND are exclusive, so the raw span end is used as-is.       ═ */

const ymd = (ms: number) => {
  const d = new Date(ms);
  return [d.getFullYear(), d.getMonth() + 1, d.getDate()].map((n) => String(n).padStart(2, "0")).join("");
};

export const spanLabel = (e: SeasonEvent) => {
  const a = new Date(e.start); const b = new Date(e.end - DAY);
  const f = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  return a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()
    ? `${f(a)} - ${b.getDate()}`
    : `${f(a)} - ${f(b)}`;
};

export const yearOf = (ms: number) => new Date(ms).getFullYear();

/** the "add to calendar" draft link - opens Google with the window prefilled */
export function googleUrl(e: SeasonEvent): string {
  const q = new URLSearchParams({
    action: "TEMPLATE",
    text: `${e.program}: ${e.phase}`,
    dates: `${ymd(e.start)}/${ymd(e.end)}`,
    details: `${e.program} - ${e.phase}.\nDates read off ${e.owner}'s published calendar (rounded to the nearest few days) via cyrus.ai.\nProgram page: ${e.url}`,
    location: e.url,
  });
  return `https://calendar.google.com/calendar/render?${q.toString()}`;
}

/* RFC 5545: commas and semicolons are escaped, long lines fold at 75 octets */
const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/([,;])/g, "\\$1").replace(/\n/g, "\\n");
const fold = (line: string): string => (line.length <= 74 ? line : `${line.slice(0, 74)}\r\n ` + fold(line.slice(74)));

function vevent(e: SeasonEvent, stamp: string): string {
  return [
    "BEGIN:VEVENT",
    `UID:${e.id}@cyrus.ai`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${ymd(e.start)}`,
    `DTEND;VALUE=DATE:${ymd(e.end)}`,
    fold(`SUMMARY:${esc(`${e.program}: ${e.phase}`)}`),
    fold(`DESCRIPTION:${esc(`${e.program} - ${e.phase}. Dates read off ${e.owner}'s published calendar (rounded to the nearest few days) via cyrus.ai.`)}`),
    fold(`URL:${e.url}`),
    "TRANSP:TRANSPARENT",
    "END:VEVENT",
  ].join("\r\n");
}

/** a whole calendar of windows, ready to be handed to any calendar app */
export function ics(events: SeasonEvent[], name = "cyrus.ai season calendar"): string {
  const stamp = ymd(Date.now()) + "T000000Z";
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//cyrus.ai//open source seasons//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    fold(`X-WR-CALNAME:${esc(name)}`),
    ...events.map((e) => vevent(e, stamp)),
    "END:VCALENDAR",
  ].join("\r\n") + "\r\n";
}

/* ── month geometry for the grid ──────────────────────────────── */
export interface MonthCell { day: number; ms: number; inMonth: boolean }

/** 42 cells (6 weeks), Monday-first, covering the month that holds `ms` */
export function monthGrid(ms: number): MonthCell[] {
  const d = new Date(ms);
  const first = new Date(d.getFullYear(), d.getMonth(), 1);
  const lead = (first.getDay() + 6) % 7; // Mon=0 … Sun=6
  const cells: MonthCell[] = [];
  for (let i = 0; i < 42; i++) {
    const t = new Date(first.getTime() + (i - lead) * DAY);
    cells.push({ day: t.getDate(), ms: t.setHours(0, 0, 0, 0), inMonth: t.getMonth() === first.getMonth() });
  }
  return cells;
}

export const overlaps = (e: SeasonEvent, from: number, to: number) => e.start < to && e.end > from;
