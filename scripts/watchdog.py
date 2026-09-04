#!/usr/bin/env python3
"""GitHub Follower Watchdog — hourly follower delta recorder.

Stdlib-only (no pip install) so the CI job stays a bare ubuntu runner +
`python3`. It fetches the watched account's follower list from the GitHub
REST API, diffs it against ``data/current.json``, appends the delta to
``data/history.jsonl`` and rewrites ``data/current.json`` — but ONLY when
the follower set actually changed, so a no-change hour stays a no-op in
git (no commit, no Pages redeploy).

A second, *bounded* phase enriches the roster with per-account facts
(profile counters + last-year contribution total) into
``data/accounts.json``; the site turns those facts into the bot/real
score. Every phase has hard caps — AGENTS.md §9:
  schedule          WATCH_INTERVAL_HOURS: scheduled hours outside the
                    every-Nth-slot gate exit in seconds without touching
                    the API (manual/push runs are never gated)
  followers pages   MAX_PAGES (100) x PER_PAGE (100) = 10,000 rows
  retries           RETRY_DELAYS (1, 3) → 3 attempts, never unbounded
  enrichment        WATCH_ENRICH_CAP (default 40, max 200) accounts/run,
                    refreshed after WATCH_ENRICH_STALE_DAYS (default 30)

Data layout (records live in git, written by CI only):
  data/current.json   {"schema":1,"watch":...,"profile":{...},
                       "updated_at":...,"followers":[{"login","id"},...]}
  data/history.jsonl  one JSON event per line, append-only:
                       {"ts":...,"type":"bootstrap","count":N}
                       {"ts":...,"type":"follow"|"unfollow","login":...,"id":...}
  data/accounts.json  {"schema":2,"watch":<owner>,"accounts":{"<login>":{...}}}
                       facts: followers, following, public_repos,
                       created_at, contributions (last year, nullable),
                       profile_fields (present public profile bits),
                       missing (true once the account vanished).
                       Written only when a fact actually changed, so
                       quiet hours stay commit-free; stale entries are
                       re-sampled randomly at the cap rate.

Fork takeover (why accounts.json carries a watch stamp): a fresh fork
inherits the upstream records. The first run under a new owner detects
the mismatch in both stamps and fully overwrites — fresh timeline, a
history log truncated to its own bootstrap line, an empty scored-roster
file. That bootstrap run only establishes the follower list; profile
scoring starts on the next run and proceeds in cap-sized batches, so an
API failure mid-batch simply stops the phase and the remaining accounts
are picked up on a later run.

Watch target resolution order (the fork story — README "Quick start"):
  1. CLI argument (``just watch <login>``).
  2. ``WATCH_USER`` env — watch any public account instead of yourself.
  3. Owner part of ``GITHUB_REPOSITORY`` — the CI default, so a fork
     automatically watches the fork owner's own followers.
  4. Owner parsed from the ``origin`` remote — local development runs.

Writes are ordered current-first-then-history: a crash between the two
leaves the snapshot advanced with one missing timeline line, never
duplicated events (a re-diff against the new current produces nothing).

Enrichment is best-effort by design: any API failure there skips the
phase for this run instead of failing the snapshot (the core product
must not go dark because a profiling endpoint hiccupped).
"""

from __future__ import annotations

import calendar
import http.client
import json
import os
import random
import re
import subprocess
import sys
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Any

API_ROOT = "https://api.github.com"
PER_PAGE = 100
MAX_PAGES = 100  # hard cap: 10,000 followers per run (bounded work, AGENTS.md §9)
HTTP_TIMEOUT = 20
RETRY_DELAYS = (1, 3)  # bounded retries, never an unbounded loop

ENRICH_CAP_DEFAULT = 40  # steady-state: one GraphQL batch + ~8s of parallel REST
ENRICH_CAP_MAX = 200  # manual backfill ceiling (workflow_dispatch input)
ENRICH_STALE_DAYS_DEFAULT = 30  # eligible for a facts refresh after this long
ENRICH_STALE_DAYS_MAX = 365
ENRICH_WORKERS = 8  # parallel profile fetches (core REST, well within limits)
INTERVAL_HOURS_MAX = 168  # schedule gate ceiling: at most weekly
GQL_BATCH = 40  # ~6 nodes/alias → ~250 rate-limit points per batch

CONTRIBUTION_FIELDS = (
    "totalCommitContributions",
    "totalIssueContributions",
    "totalPullRequestContributions",
    "totalPullRequestReviewContributions",
)
PROFILE_FIELDS = ("name", "bio", "company", "location", "blog")

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
CURRENT_PATH = DATA_DIR / "current.json"
HISTORY_PATH = DATA_DIR / "history.jsonl"
ACCOUNTS_PATH = DATA_DIR / "accounts.json"

SCHEMA = 1
ACCOUNTS_SCHEMA = 2  # schema 2 stamps the owning watch user on the file


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


def _http_json(url: str, token: str | None, *, payload: bytes | None = None):
    """One HTTP round trip → parsed JSON. Raises on transport/HTTP errors."""
    headers = {
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "github-follower-watchdog",
    }
    if token:
        headers["Authorization"] = f"Bearer {token}"
    request = urllib.request.Request(url, data=payload, headers=headers)
    with urllib.request.urlopen(request, timeout=HTTP_TIMEOUT) as resp:
        return json.loads(resp.read().decode("utf-8"))


def api_get(path: str, token: str | None) -> Any:
    """GET a GitHub API endpoint with bounded retries; abort on hard errors."""
    url = path if path.startswith("http") else f"{API_ROOT}{path}"

    last: Exception | None = None
    for attempt in range(len(RETRY_DELAYS) + 1):
        if attempt:
            time.sleep(RETRY_DELAYS[attempt - 1])
        try:
            return _http_json(url, token)
        except urllib.error.HTTPError as exc:
            if exc.code == 403 and exc.headers.get("x-ratelimit-remaining") == "0":
                reset = int(exc.headers.get("x-ratelimit-reset", "0"))
                _fail_no_write(
                    f"rate limited by the GitHub API (resets {time.ctime(reset)})"
                )
            if exc.code in (404, 401):
                _fail_no_write(f"HTTP {exc.code} for {url} — {exc.reason}")
            last = exc  # 403 secondary limit / 429 / 5xx → retry
        except (urllib.error.URLError, http.client.HTTPException, TimeoutError,
                OSError, json.JSONDecodeError) as exc:
            last = exc  # connection reset / incomplete read / hiccup → retry

    _fail_no_write(f"giving up on {url} after retries: {last}")


def api_get_soft(path: str, token: str | None) -> tuple[dict[str, Any] | None, str]:
    """Bounded-retry GET for the enrichment phase: never fatal.

    Returns (payload, "") on success, (None, reason) on failure — a 404
    (account deleted) and rate exhaustion are both caller-handled.
    """
    url = path if path.startswith("http") else f"{API_ROOT}{path}"

    last: Exception | None = None
    for attempt in range(len(RETRY_DELAYS) + 1):
        if attempt:
            time.sleep(RETRY_DELAYS[attempt - 1])
        try:
            return _http_json(url, token), ""
        except urllib.error.HTTPError as exc:
            if exc.code == 404:
                return None, "not-found"
            if exc.code == 403 and exc.headers.get("x-ratelimit-remaining") == "0":
                return None, "rate-limited"
            last = exc
        except (urllib.error.URLError, http.client.HTTPException, TimeoutError,
                OSError, json.JSONDecodeError) as exc:
            last = exc
    return None, f"unreachable ({last})"


def graphql_contributions(logins: list[str], token: str | None) -> dict[str, int]:
    """Last-year contribution totals, aliased-batched (GQL_BATCH per query)."""
    if not token:
        return {}
    totals: dict[str, int] = {}
    for start in range(0, len(logins), GQL_BATCH):
        batch = logins[start:start + GQL_BATCH]
        aliases = " ".join(
            f'u{i}: user(login: {json.dumps(login)}) {{'
            f' contributionsCollection {{ {" ".join(CONTRIBUTION_FIELDS)} }} }}'
            for i, login in enumerate(batch)
        )
        body = json.dumps({"query": f"query {{ {aliases} }}"}).encode("utf-8")
        data: dict[str, Any] | None = None
        for attempt in range(len(RETRY_DELAYS) + 1):
            if attempt:
                time.sleep(RETRY_DELAYS[attempt - 1])
            try:
                request = urllib.request.Request(
                    f"{API_ROOT}/graphql", data=body,
                    headers={
                        "Authorization": f"Bearer {token}",
                        "User-Agent": "github-follower-watchdog",
                        "Content-Type": "application/json",
                    },
                )
                with urllib.request.urlopen(request, timeout=HTTP_TIMEOUT) as resp:
                    data = json.loads(resp.read().decode("utf-8")).get("data")
                break
            except (urllib.error.URLError, urllib.error.HTTPError,
                    http.client.HTTPException, TimeoutError, OSError,
                    json.JSONDecodeError):
                data = None  # retry / give up quietly — enrichment is optional
        if not data:
            break  # GraphQL unavailable this run → contributions stay null
        for i, login in enumerate(batch):
            node = data.get(f"u{i}") or {}
            collection = node.get("contributionsCollection")
            if collection:
                totals[login] = sum(int(collection.get(f, 0) or 0) for f in CONTRIBUTION_FIELDS)
    return totals


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


def load_json(path: Path) -> dict[str, Any] | None:
    try:
        doc = json.loads(path.read_text(encoding="utf-8"))
        return doc if isinstance(doc, dict) else None
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


def load_accounts(user: str) -> tuple[dict[str, Any], bool, str]:
    """Load data/accounts.json, enforcing ownership (fork takeover).

    Returns (accounts, changed, note). A file stamped with another watch
    user is a fork inheritance: reset to empty so the new owner's roster
    is scored from scratch. A legacy unstamped file (schema 1) is adopted
    and stamped on the next write instead of discarded.
    """
    doc = load_json(ACCOUNTS_PATH)
    if doc is None:
        return {}, False, ""
    raw = doc.get("accounts")
    accounts = raw if isinstance(raw, dict) else {}
    if "watch" not in doc:
        return accounts, True, "adopted and stamped (was pre-schema-2)"
    if doc["watch"] != user:
        print(
            f"accounts.json belongs to {doc['watch']!r} — resetting it for {user!r}; "
            "scoring restarts from scratch"
        )
        return {}, True, "reset for new watch target"
    return accounts, False, ""


def enrich_accounts(
    accounts: dict[str, Any], followers: list[dict[str, Any]], token: str | None, cap: int
) -> tuple[dict[str, Any], bool, int]:
    """Refresh per-account facts within the run cap; write-only-on-change.

    Eligible = never-seen accounts (always first) + facts older than
    ENRICH_STALE_DAYS, sampled randomly so refresh work spreads evenly.
    ``checked_at`` is only persisted when a fact changed, so unchanged
    accounts stay eligible (cheap to recheck, no git churn). Returns the
    new map, whether anything changed (→ commit) and how many were fetched.
    """
    if cap <= 0 or not followers:
        return accounts, False, 0

    now = time.time()
    stale_seconds = resolve_enrich_stale_days() * 86400
    missing: list[str] = []
    stale: list[str] = []
    for follower in followers:
        login = follower["login"]
        entry = accounts.get(login)
        if entry is None:
            missing.append(login)
            continue
        checked = entry.get("checked_at")
        try:
            age = now - calendar.timegm(time.strptime(checked, "%Y-%m-%dT%H:%M:%SZ"))
        except (TypeError, ValueError):
            age = stale_seconds + 1
        if age > stale_seconds:
            stale.append(login)
    random.shuffle(stale)
    targets = (missing + stale)[:cap]
    if not targets:
        return accounts, False, 0

    contributions = graphql_contributions(targets, token)

    # Profiles fetch in parallel (a small bounded pool keeps the phase at
    # seconds, not minutes); results apply in order so the abort-on-rate-
    # limit logic stays deterministic.
    def soft_fetch(login: str) -> tuple[str, dict[str, Any] | None, str]:
        payload, reason = api_get_soft(f"/users/{login}", token)
        return login, payload, reason

    changed = False
    fetched = 0
    aborted = ""
    failures = 0  # consecutive unreachable fetches → stop, resume next run
    # Waves bounded at GQL_BATCH keep the eager-submit blast radius of an
    # abort to a single wave instead of the whole cap.
    with ThreadPoolExecutor(max_workers=ENRICH_WORKERS) as pool:
        for start in range(0, len(targets), GQL_BATCH):
            wave = targets[start:start + GQL_BATCH]
            for login, payload, reason in pool.map(soft_fetch, wave):
                if payload is None:
                    if reason == "not-found":
                        previous = accounts.get(login)
                        # Only the first disappearance writes; repeat 404s keep the
                        # old checked_at so the entry never churns git on its own.
                        if previous is None or not previous.get("missing"):
                            accounts[login] = {"checked_at": _iso_now(), "missing": True}
                            changed = True
                        fetched += 1
                        failures = 0
                    elif reason == "rate-limited":
                        aborted = "API rate limit reached"
                        break
                    else:
                        # Transient/unreachable: skip this account, but if a
                        # whole run of them fail in a row the API is effectively
                        # down — stop the phase; the remaining accounts are
                        # still eligible and get scanned on a later run.
                        failures += 1
                        if failures >= ENRICH_WORKERS:
                            aborted = "API unreachable — remaining accounts resume next run"
                            break
                    continue
                fetched += 1
                failures = 0
                previous = accounts.get(login) or {}
                if login in contributions:
                    # Fresh GraphQL number; when a batch failed this run, carry
                    # the previous total forward instead of demoting to null
                    # (a spurious "change" plus a visible score dip).
                    total = contributions[login]
                else:
                    total = previous.get("contributions")
                entry = {
                    "checked_at": _iso_now(),
                    "followers": int(payload.get("followers") or 0),
                    "following": int(payload.get("following") or 0),
                    "public_repos": int(payload.get("public_repos") or 0),
                    "created_at": payload.get("created_at") or "",
                    "contributions": total,
                    "profile_fields": [f for f in PROFILE_FIELDS if payload.get(f)],
                }
                if previous is None or {k: v for k, v in previous.items() if k != "checked_at"} != {
                    k: v for k, v in entry.items() if k != "checked_at"
                }:
                    accounts[login] = entry
                    changed = True
            if aborted:
                break
    if aborted:
        print(f"enrichment stopped early — {aborted}")

    return accounts, changed, fetched


def _iso_now() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def resolve_enrich_cap(token: str | None) -> int:
    """Cap from WATCH_ENRICH_CAP, bounded; 0 disables (e.g. no token)."""
    if not token:
        return 0
    try:
        cap = int(os.environ.get("WATCH_ENRICH_CAP") or ENRICH_CAP_DEFAULT)
    except ValueError:
        cap = ENRICH_CAP_DEFAULT
    return max(0, min(cap, ENRICH_CAP_MAX))


def _env_int(name: str, default: int, maximum: int) -> int:
    try:
        return max(1, min(maximum, int(os.environ.get(name) or default)))
    except ValueError:
        return default


def resolve_enrich_stale_days() -> int:
    return _env_int("WATCH_ENRICH_STALE_DAYS", ENRICH_STALE_DAYS_DEFAULT, ENRICH_STALE_DAYS_MAX)


def resolve_interval_hours() -> int:
    return _env_int("WATCH_INTERVAL_HOURS", 1, INTERVAL_HOURS_MAX)


def main() -> int:
    cli_arg = sys.argv[1] if len(sys.argv) > 1 else None
    user = resolve_target(cli_arg)
    token = os.environ.get("GITHUB_TOKEN", "").strip() or None

    # Schedule self-throttle: the cron stays hourly, but on scheduled runs
    # outside every Nth UTC hour the run exits here — no API calls, no
    # records, no build, no deploy. Manual dispatches and master pushes are
    # never gated (the workflow only sets WATCH_SCHEDULED on schedule).
    if os.environ.get("WATCH_SCHEDULED", "").strip().lower() == "true":
        interval = resolve_interval_hours()
        if interval > 1:
            hour = time.gmtime().tm_hour
            if hour % interval != 0:
                slots = ", ".join(str(h) for h in range(0, 24, interval))
                print(
                    f"interval {interval}h — UTC {hour:02d}:00 is not a due slot "
                    f"(due at {slots} UTC); nothing fetched"
                )
                return 0

    profile = fetch_profile(user, token)
    followers = fetch_followers(user, token)
    now = _iso_now()

    prev = load_json(CURRENT_PATH)
    if prev is not None and prev.get("watch") != user:
        # A fork inherits the upstream records; the first run under a new
        # owner starts a fresh timeline instead of drowning it in "unfollows".
        print(
            f"watch target changed ({prev.get('watch')!r} -> {user!r}); "
            "starting a fresh timeline"
        )
        prev = None

    fresh_log = prev is None  # ownership takeover or very first run
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

    # A bootstrap run only establishes the roster — scoring starts on the
    # next run, so the most critical run stays fast and minimal-risk.
    accounts, accounts_reset, accounts_note = load_accounts(user)
    if accounts_note:
        print(f"accounts.json: {accounts_note}")
    cap = resolve_enrich_cap(token)
    if fresh_log:
        cap = 0
        print("roster only this run — profile scoring starts on the next run")
    elif cap == 0 and not token:
        print("enrichment skipped — set GITHUB_TOKEN to collect account facts")
    accounts, accounts_changed, enriched = enrich_accounts(accounts, followers, token, cap)

    if not fresh_log and not events and not accounts_changed and not accounts_reset:
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
    if events:
        if fresh_log:
            # New ownership: the log restarts from this run's bootstrap line
            # instead of appending to the inherited upstream history.
            HISTORY_PATH.write_text(
                "".join(
                    json.dumps(e, ensure_ascii=False, separators=(",", ":")) + "\n"
                    for e in events
                ),
                encoding="utf-8",
            )
        else:
            append_history(events)
    if accounts_reset or accounts_changed:
        write_json_atomic(
            ACCOUNTS_PATH,
            {"schema": ACCOUNTS_SCHEMA, "watch": user, "accounts": accounts},
        )

    if prev is None:
        print(f"bootstrap — recorded {len(followers)} followers for {user}")
    else:
        for event in events:
            arrow = "+" if event["type"] == "follow" else "-"
            print(f"{arrow} {event['login']}")
    if enriched:
        gained = sum(1 for e in events if e["type"] == "follow")
        lost = sum(1 for e in events if e["type"] == "unfollow")
        print(
            f"summary — +{gained} -{lost} · total {len(followers)} followers · "
            f"{enriched} account profiles refreshed"
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
