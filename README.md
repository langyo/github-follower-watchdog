<h1 align="center">GitHub Follower Watchdog</h1>

<p align="center"><strong>Hourly follower watch for your GitHub profile — CI-native, git-recorded, Pages-published</strong></p>

<div align="center">

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/langyo/github-follower-watchdog/blob/master/LICENSE)
[![GitHub](https://img.shields.io/badge/github-langyo%2Fgithub--follower--watchdog-blue.svg)](https://github.com/langyo/github-follower-watchdog)

</div>

<div align="center">

**English** ·
[简体中文](./docs/zh-CN/guides/README-github-follower-watchdog.md) ·
[繁體中文](./docs/zh-TW/guides/README-github-follower-watchdog.md) ·
[日本語](./docs/ja/guides/README-github-follower-watchdog.md) ·
[한국어](./docs/ko/guides/README-github-follower-watchdog.md) ·
[Français](./docs/fr/guides/README-github-follower-watchdog.md) ·
[Español](./docs/es/guides/README-github-follower-watchdog.md) ·
[Русский](./docs/ru/guides/README-github-follower-watchdog.md) ·
[العربية](./docs/ar/guides/README-github-follower-watchdog.md)

</div>

GitHub Follower Watchdog is a zero-server follower monitor that lives entirely inside a repository. It runs in three moves:

1. **Hourly check** — a GitHub Actions cron runs a stdlib-only Python script (no `pip install`, no setup step) that pages through the public followers API and finishes in seconds.

2. **Git-recorded deltas** — every run diffs the fresh list against `data/current.json` and appends follow/unfollow events to the append-only log `data/history.jsonl`. Only real changes produce a commit (`🔄 Sync follower snapshot.`); a quiet hour writes nothing at all, so the git history *is* the change log.

3. **Pages-published dashboard** — every change redeploys a single-page dashboard (Vue 3 · TSX · SCSS · vue-i18n, 8 languages, dark & light) showing the follower-count trend, the follow/unfollow timeline and the current roster.

On top of the raw list, the watchdog **profiles each follower within strict rate-limit budgets** (contribution volume, follower/following balance, public repos, profile completeness, account age) and the dashboard turns those facts into a transparent 0–100 score that separates likely-real humans from suspect mass-follower bots.

Fork it and it becomes **yours**: the watched account is resolved from the repository owner, the inherited records reset on the fork's first run, and the same workflow enables and deploys GitHub Pages for the fork automatically.

## Quick start

Everything below takes about two minutes after forking.

1. **Fork the repository** — any name works; the rest of this guide assumes you kept `github-follower-watchdog`.

2. **Enable Actions on your fork** — open `https://github.com/<you>/github-follower-watchdog/actions` in a browser. GitHub disables workflows on fresh forks by default; click **I understand my workflows, go ahead and enable them**.

3. **Run the first check** — still on that Actions page, pick **Watch** in the left sidebar → **Run workflow** → **Run workflow**. (You can raise *Max accounts to enrich* here if you want the bot/real scores to fill in faster.) The first run records your current followers as the baseline and publishes your site.

4. **Open your dashboard** — `https://<you>.github.io/github-follower-watchdog/`. From then on it refreshes itself every hour, whenever something changed.

If the first run stops at the *Configure Pages* step — GitHub occasionally refuses to let the workflow token create the site — open `https://github.com/<you>/github-follower-watchdog/settings/pages`, set **Source → GitHub Actions**, and run **Watch** once more.

**Filling the scores faster (optional but recommended).** The Actions token lives under tighter rate limits than your own, and CI enriches at most `WATCH_ENRICH_CAP` (default 40) accounts per hourly run. With a small roster that is a gentle warm-up — with a thousand followers it means roughly 25 hours of CI runs grinding through throttled backfill requests before every card carries a score. Do the first pass on your own machine instead, even before enabling anything:

```bash
git clone https://github.com/<you>/github-follower-watchdog
cd github-follower-watchdog && npm --prefix site install
export GITHUB_TOKEN=$(gh auth token)   # your own token: 5000 req/hour
WATCH_ENRICH_CAP=200 just watch        # rerun until it reports "no changes"
```

Then commit the produced `data/` records on a branch, open a PR and merge it — the next hourly run adopts the file and only refreshes what went stale.

**Tuning the cadence (saving CI quota).** The cron fires hourly, but every knob that decides how much actually runs is a plain repository variable — set once under **Settings → Secrets and variables → Actions → Variables** (`vars.*`), no workflow edits needed:

| Variable | Default | Meaning |
| --- | --- | --- |
| `WATCH_INTERVAL_HOURS` | `1` | Minimum hours between scheduled checks. With `6`, the hours in between exit in seconds without touching the API — no records, no build, no deploy. Manual **Run workflow** runs always check immediately. |
| `WATCH_ENRICH_CAP` | `40` | Accounts profiled per run (max 200; the Run-workflow input overrides it). |
| `WATCH_ENRICH_STALE_DAYS` | `30` | Days before a follower's profile facts get refreshed. |
| `WATCH_USER` | fork owner | Watch any other public account instead of yourself. |

`WATCH_INTERVAL_HOURS=6`, for example, cuts scheduled API traffic by roughly 83% while the trend, timeline and scores stay current four times a day.

**Where the data lives.** `data/current.json` is the latest roster, `data/history.jsonl` is the append-only follow/unfollow log, and `data/accounts.json` holds the per-follower facts behind the scores. All three are written only by CI and committed to your fork, so `git log -- data/` is the complete audit trail — no external service, no database, nothing to trust but git.

**Watching someone else.** Set `WATCH_USER` in `.github/workflows/watch.yml` (or pass the account as the `just watch <login>` argument locally) to monitor any public account instead of your own.

## How it works

- `scripts/watchdog.py` — the whole fetcher: bounded pagination, atomic writes, current-first-then-history ordering (a crashed run can lose one timeline line, never duplicate events), and a hard "no data written on any API failure" rule for the snapshot. A second best-effort phase enriches up to `WATCH_ENRICH_CAP` (default 40, max 200) accounts per run via the REST user endpoint plus one batched GraphQL query, and writes only when a fact actually changed. It stops itself on API failures and resumes the remaining accounts next run; a fresh fork records the roster first and starts scoring on the following run.
- `data/current.json` + `data/history.jsonl` + `data/accounts.json` — the records; **written by CI only** (AGENTS.md §5).
- `.github/workflows/watch.yml` — hourly cron + manual + push: watchdog → commit if changed → build the site → deploy Pages. No-change hours skip the build and finish in ~20s; the change path stays around a minute. (GitHub disables scheduled workflows after 60 days of repo inactivity — the data commits themselves count as activity.)
- `site/` — the dashboard. Vite + Vue 3 in TSX (no `.vue` SFCs) + SCSS + vue-i18n, 8 languages. The records are copied verbatim into the bundle as public assets and fetched at runtime, so a data-only change never requires an app rebuild; scoring runs entirely client-side in `site/src/data/scoring.ts`.

## The scoring model

The score is deliberately explainable — points add up for the classic human signals, then two penalties multiply down the classic bot shapes:

| Signal | Points |
| --- | --- |
| Following/followers balance (0 following, or ratio ≤ 2) | up to +25 |
| Contributions in the last year (GraphQL) | up to +30 |
| Public repos | up to +15 |
| Profile completeness (name, bio, company, location, blog) | up to +10 |
| Account age | up to +15 |
| Mass-following shape (following ≥ 500, followers < 50) | × 0.5 |
| Empty account shape (no contributions, no repos) | × 0.6 |

**Real** (≥ 60), **uncertain** (30–59) and **suspect** (< 30) groups are filterable on the dashboard. Facts refresh gradually (a randomly sampled slice of stale profiles, ~40 accounts per hour) so the picture stays current without ever hitting a rate limit.

## Local development

```bash
npm --prefix site install   # once
just watch                  # one watchdog run (target: origin owner, or pass a login)
just dev                    # site dev server on :5174
just build                  # typecheck + production build
just lint-msg               # commit subjects on master..HEAD (AGENTS.md §1)
```

`GITHUB_TOKEN` is optional for a plain follower check, but account enrichment (the scores) only runs with a token in the environment — `export GITHUB_TOKEN=$(gh auth token)`.

## Documentation

The translated READMEs live under [`docs/`](./docs) (`docs/<lang>/guides/README-github-follower-watchdog.md`, 8 languages beside this one). Repository rules for AI agents and human contributors alike are in [`AGENTS.md`](./AGENTS.md).

Source: [langyo/github-follower-watchdog](https://github.com/langyo/github-follower-watchdog).
