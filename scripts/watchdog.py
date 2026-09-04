#!/usr/bin/env python3
"""GitHub Follower Watchdog — hourly follower delta recorder.

Stdlib-only (no pip install) so the CI job stays a bare ubuntu runner +
`python3`. It fetches the watched account's follower list from the GitHub
REST API, diffs it against ``data/current.json``, appends the delta to
``data/history.jsonl`` and rewrites ``data/current.json`` — but ONLY when
the follower set actually changed, so a no-change hour stays a no-op in
git (no commit, no Pages redeploy).

Data layout (records live in git, written by CI only):
  data/current.json   {"schema":1,"watch":...,"profile":{...},
                       "updated_at":...,"followers":[{"login","id"},...]}
  data/history.jsonl  one JSON event per line, append-only:
                       {"ts":...,"type":"bootstrap","count":N}
                       {"ts":...,"type":"follow"|"unfollow","login":...,"id":...}

Watch target resolution order (the fork story — AGENTS.md §0 of README):
  1. ``WATCH_USER`` env — watch any public account instead of yourself.
  2. Owner part of ``GITHUB_REPOSITORY`` — the CI default, so a fork
     automatically watches the fork owner's own followers.
  3. Owner parsed from the ``origin`` remote — local development runs.

Writes are ordered current-first-then-history: a crash between the two
leaves the snapshot advanced with one missing timeline line, never
duplicated events (a re-diff against the new current produces nothing).
"""

from __future__ import annotations

import json
import os
import re
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any

API_ROOT = "https://api.github.com"
PER_PAGE = 100
MAX_PAGES = 100  # hard cap: 10,000 followers per run (bounded work, AGENTS.md §9)
HTTP_TIMEOUT = 20
RETRY_DELAYS = (1, 3)  # bounded retries, never an unbounded loop

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
CURRENT_PATH = DATA_DIR / "current.json"
HISTORY_PATH = DATA_DIR / "history.jsonl"

SCHEMA = 1


def resolve_target(cli_arg: str | None) -> str:
    """Pick the GitHub account to watch (CLI arg → env → CI repo owner → remote)."""
    if cli_arg:
        return cli_arg
    env_user = os.environ.get("WATCH_USER", "").strip()
    if env_user:
        return env_user

    repo = os.environ.get("GITHUB_REPOSITORY", "").strip()
    if "/" in repo:
        return repo.split("/", 1)[0]

    try:
        url = subprocess.run(
            ["git", "config", "--get", "remote.origin.url"],
            cwd=ROOT, capture_output=True, text=True, check=True,
        ).stdout.strip()
        match = re.search(r"github\.com[:/]([^/]+)/", url)
        if match:
            return match.group(1)
    except (subprocess.CalledProcessError, OSError):
        pass

    sys.exit("error: cannot determine the account to watch — set WATCH_USER")


def _fail_no_write(message: str) -> None:
    sys.exit(f"error: {message}; no data was written (last good state kept)")


def api_get(path: str, token: str | None) -> Any:
    """GET a GitHub API endpoint with bounded retries; abort on hard errors."""
    url = path if path.startswith("http") else f"{API_ROOT}{path}"
    headers = {
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "github-follower-watchdog",
    }
    if token:
        headers["Authorization"] = f"Bearer {token}"

    last: Exception | None = None
    for attempt in range(len(RETRY_DELAYS) + 1):
        if attempt:
            time.sleep(RETRY_DELAYS[attempt - 1])
        request = urllib.request.Request(url, headers=headers)
        try:
            with urllib.request.urlopen(request, timeout=HTTP_TIMEOUT) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as exc:
            if exc.code == 403 and exc.headers.get("x-ratelimit-remaining") == "0":
                reset = int(exc.headers.get("x-ratelimit-reset", "0"))
                _fail_no_write(
                    f"rate limited by the GitHub API (resets {time.ctime(reset)})"
                )
            if exc.code in (404, 401):
                _fail_no_write(f"HTTP {exc.code} for {url} — {exc.reason}")
            last = exc  # 403 secondary limit / 429 / 5xx → retry
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
            last = exc  # network hiccup → retry

    _fail_no_write(f"giving up on {url} after retries: {last}")


def fetch_profile(user: str, token: str | None) -> dict[str, Any]:
    profile = api_get(f"/users/{user}", token)
    if not isinstance(profile, dict) or "login" not in profile:
        _fail_no_write(f"unexpected profile payload for {user!r}")
    return {
        "login": profile["login"],
        "name": profile.get("name") or "",
        "avatar_url": profile.get("avatar_url") or "",
    }


def fetch_followers(user: str, token: str | None) -> list[dict[str, Any]]:
    """Page through /users/{user}/followers (bounded by MAX_PAGES)."""
    followers: list[dict[str, Any]] = []
    for page in range(1, MAX_PAGES + 1):
        batch = api_get(
            f"/users/{user}/followers?per_page={PER_PAGE}&page={page}", token
        )
        if not isinstance(batch, list):
            _fail_no_write(f"unexpected followers payload on page {page}")
        if not batch:
            break
        followers.extend({"login": item["login"], "id": item["id"]} for item in batch)
        if len(batch) < PER_PAGE:
            break
    else:
        _fail_no_write(
            f"more than {MAX_PAGES * PER_PAGE} followers — raise MAX_PAGES"
        )
    followers.sort(key=lambda f: f["login"].lower())
    return followers


def load_current() -> dict[str, Any] | None:
    try:
        current = json.loads(CURRENT_PATH.read_text(encoding="utf-8"))
        return current if isinstance(current, dict) else None
    except (OSError, json.JSONDecodeError):
        return None


def write_json_atomic(path: Path, payload: dict[str, Any]) -> None:
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    os.replace(tmp, path)


def append_history(events: list[dict[str, Any]]) -> None:
    with HISTORY_PATH.open("a", encoding="utf-8") as fh:
        for event in events:
            fh.write(json.dumps(event, ensure_ascii=False, separators=(",", ":")) + "\n")


def main() -> int:
    cli_arg = sys.argv[1] if len(sys.argv) > 1 else None
    user = resolve_target(cli_arg)
    token = os.environ.get("GITHUB_TOKEN", "").strip() or None

    profile = fetch_profile(user, token)
    followers = fetch_followers(user, token)
    now = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

    prev = load_current()
    if prev is not None and prev.get("watch") != user:
        # A fork keeps the upstream data files; the first run on a new owner
        # starts a fresh timeline instead of drowning it in "unfollows".
        print(
            f"watch target changed ({prev.get('watch')!r} -> {user!r}); "
            "starting a fresh timeline"
        )
        prev = None

    if prev is None:
        events: list[dict[str, Any]] = [
            {"ts": now, "type": "bootstrap", "count": len(followers)}
        ]
    else:
        old = {f["login"]: f for f in prev.get("followers", [])}
        new = {f["login"]: f for f in followers}
        gained = [new[login] for login in sorted(set(new) - set(old))]
        lost = [old[login] for login in sorted(set(old) - set(new))]
        events = (
            [{"ts": now, "type": "follow", **f} for f in gained]
            + [{"ts": now, "type": "unfollow", **f} for f in lost]
        )

    if prev is not None and not events:
        print(f"no changes — {len(followers)} followers, nothing written")
        return 0

    current = {
        "schema": SCHEMA,
        "watch": user,
        "profile": profile,
        "updated_at": now,
        "followers": followers,
    }

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    write_json_atomic(CURRENT_PATH, current)
    append_history(events)

    if prev is None:
        print(f"bootstrap — recorded {len(followers)} followers for {user}")
    else:
        for event in events:
            arrow = "+" if event["type"] == "follow" else "-"
            print(f"{arrow} {event['login']}")
        gained = sum(1 for e in events if e["type"] == "follow")
        lost = sum(1 for e in events if e["type"] == "unfollow")
        print(f"summary — +{gained} -{lost} · total {len(followers)} followers")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
