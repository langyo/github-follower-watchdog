/** Watch-record loading and derivation.
 *
 * The runner (scripts/watchdog.py) keeps three files under `data/` (copied
 * verbatim into the Pages artifact by vite's publicDir):
 *
 *   current.json    the latest snapshot — watched profile + full follower list
 *   history.jsonl   append-only event log — one JSON object per line
 *   accounts.json   per-account facts (bounded enrichment) the score is
 *                   computed from — see data/scoring.ts
 *
 * Everything the page shows (stats, sparkline, timeline, scores) is
 * derived here, client-side, so publishing a new hour never rebuilds the
 * app bundle. */

import type { AccountFacts } from "./scoring";

export interface FollowerEntry {
  login: string;
  id: number;
}

export interface WatchEvent {
  ts: string;
  type: "follow" | "unfollow" | "bootstrap";
  login?: string;
  id?: number;
  count?: number;
}

export interface CurrentDoc {
  schema: number;
  watch: string;
  profile: {
    login: string;
    name: string;
    avatar_url: string;
  };
  updated_at: string;
  followers: FollowerEntry[];
}

export type AccountMap = Record<string, AccountFacts>;

export interface SeriesPoint {
  ts: string;
  count: number;
}

export interface WatchData {
  current: CurrentDoc;
  events: WatchEvent[];
  accounts: AccountMap;
  /** First recorded event timestamp (the bootstrap). */
  since: string;
  gained: number;
  lost: number;
  /** Cumulative follower count over time, always ending at "now". */
  series: SeriesPoint[];
}

/** Raised when current.json is absent — the watchdog has not run yet. */
export class NoDataError extends Error {
  constructor() {
    super("no watch records yet");
  }
}

export function avatarUrl(id: number, size = 96): string {
  return `https://avatars.githubusercontent.com/u/${id}?v=4&s=${size}`;
}

export function profileUrl(login: string): string {
  return `https://github.com/${login}`;
}

async function fetchDoc(name: string): Promise<Response> {
  return fetch(`${import.meta.env.BASE_URL}${name}`);
}

export async function loadWatchData(): Promise<WatchData> {
  const currentResp = await fetchDoc("current.json");
  if (!currentResp.ok) throw new NoDataError();
  const current = (await currentResp.json()) as CurrentDoc;

  const events: WatchEvent[] = [];
  const historyResp = await fetchDoc("history.jsonl");
  if (historyResp.ok) {
    const text = await historyResp.text();
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        events.push(JSON.parse(trimmed) as WatchEvent);
      } catch {
        /* tolerate a torn tail line from a mid-write snapshot */
      }
    }
  }

  // Optional file: absent until the first enrichment run produces it.
  let accounts: AccountMap = {};
  const accountsResp = await fetchDoc("accounts.json");
  if (accountsResp.ok) {
    try {
      const doc = (await accountsResp.json()) as { accounts?: AccountMap };
      accounts = doc.accounts ?? {};
    } catch {
      /* malformed enrichment file — degrade to unassessed */
    }
  }

  const gained = events.filter((e) => e.type === "follow").length;
  const lost = events.filter((e) => e.type === "unfollow").length;
  const since = events.length ? events[0].ts : current.updated_at;

  // Cumulative count series: bootstrap sets the floor, each event steps it,
  // and the current follower list closes it at "now".
  const series: SeriesPoint[] = [];
  let count = 0;
  for (const event of events) {
    if (event.type === "bootstrap") count = event.count ?? 0;
    else if (event.type === "follow") count += 1;
    else if (event.type === "unfollow") count -= 1;
    series.push({ ts: event.ts, count });
  }
  series.push({ ts: new Date().toISOString(), count: current.followers.length });

  return { current, events, accounts, since, gained, lost, series };
}
