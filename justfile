# GitHub Follower Watchdog — hourly follower watch, git-recorded and
# Pages-published. Every recipe is linewise so it runs under
# `windows-shell` (bash.exe) on Windows and the default sh on Unix.

set windows-shell := ["C:/Program Files/Git/usr/bin/bash.exe", "-c"]
set shell := ["bash", "-c"]

default:
    @just --list

# ── watch ─────────────────────────────────────────────────────────────
#   just watch              → one watchdog run against the resolved target
#   just watch somebody     → one run against an explicit account
# Locally the target falls back to the origin remote owner; GITHUB_TOKEN
# is optional but lifts the API rate limit from 60 to 5000/hour.

watch user='':
    python scripts/watchdog.py {{user}}

# ── dev / build ───────────────────────────────────────────────────────
#   just dev                → Vite dev server for the Pages site
#   just build              → typecheck + production build (site/dist)
#   just preview            → serve the built site locally

dev:
    pnpm -C site dev

build:
    pnpm -C site build

preview:
    pnpm -C site preview

typecheck:
    pnpm -C site typecheck

# ── lint-msg ──────────────────────────────────────────────────────────
#   just lint-msg              → check commit subjects on master..HEAD (AGENTS.md §1)
#   just lint-msg origin/dev   → check against another base

lint-msg base='master':
    @git log --no-merges --format='%s' {{base}}..HEAD | python scripts/commit_msg_lint.py check --stdin-subjects

# ── init / clean ──────────────────────────────────────────────────────

init:
    pnpm -C site install

clean:
    -rm -rf site/dist
