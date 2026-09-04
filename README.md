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

Fork it and it becomes **yours**: the watched account is resolved from the repository owner, the inherited records reset on the fork's first run, and the same workflow enables and deploys GitHub Pages for the fork automatically. The frontend architecture, build infrastructure and repository conventions are adapted from [wowsp](https://github.com/langyo/wowsp).

## Quick start

1. Fork the repository.
2. Enable **Actions** on your fork — GitHub disables workflows on fresh forks by default (Repository → Actions → "I understand my workflows, go ahead and enable them").
3. Trigger the **Watch** workflow once via **Run workflow** — that first run records your current followers as the baseline and publishes your Pages site.
4. Open `https://<you>.github.io/github-follower-watchdog/` — from then on it refreshes itself every hour.

If that first run fails at *Configure Pages* — GitHub occasionally refuses to let the workflow token create the site — enable it once via **Settings → Pages → Source: GitHub Actions** and run the workflow again.

To watch any other public account instead of yourself, set `WATCH_USER` in `.github/workflows/watch.yml`.

## How it works

- `scripts/watchdog.py` — the whole fetcher: bounded pagination, atomic writes, current-first-then-history ordering (a crashed run can lose one timeline line, never duplicate events), and a hard "no data written on any API failure" rule.
- `data/current.json` + `data/history.jsonl` — the records; **written by CI only** (AGENTS.md §5), one append + one squash-style commit per change.
- `.github/workflows/watch.yml` — hourly cron + manual + push: watchdog → commit if changed → build the site → deploy Pages. No-change hours skip the build and finish in ~20s; the change path stays well under a minute. (GitHub disables scheduled workflows after 60 days of repo inactivity — the data commits themselves count as activity.)
- `site/` — the dashboard. Vite + Vue 3 in TSX (no `.vue` SFCs) + SCSS + vue-i18n, after the wowsp website architecture. The records are copied verbatim into the bundle as public assets and fetched at runtime, so a data-only change never requires an app rebuild.

## Local development

```bash
npm --prefix site install   # once
just watch                  # one watchdog run (target: origin owner, or pass a login)
just dev                    # site dev server on :5174
just build                  # typecheck + production build
just lint-msg               # commit subjects on master..HEAD (AGENTS.md §1)
```

`GITHUB_TOKEN` is optional locally — it lifts the API rate limit from 60 to 5000 requests/hour.

## Documentation

The translated READMEs live under [`docs/`](./docs) (`docs/<lang>/guides/README-github-follower-watchdog.md`, 8 languages beside this one). Repository rules for AI agents and human contributors alike are in [`AGENTS.md`](./AGENTS.md).

Source: [langyo/github-follower-watchdog](https://github.com/langyo/github-follower-watchdog).

## Status

🎉 **Ready** — the hourly watch, git-recorded history and Pages dashboard are live; the workflow also self-enables Pages on fresh forks. The roadmap is intentionally short: more page locales, and a webhook-based instant mode are the only ideas on the list.
