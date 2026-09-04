export default {
  nav: {
    language: "Language",
    trend: "Trend",
    timeline: "Timeline",
    followers: "Followers",
    github: "GitHub",
  },
  hero: {
    badge: "Open source · hourly watch",
    tagline: "Every follower change, on the record",
    lede: "GitHub Follower Watchdog checks your followers every hour from a GitHub Actions cron, records every follow and unfollow into an append-only log kept in git, and republishes this page through GitHub Pages.",
    updated: "Updated {when}",
    since: "tracking since {when}",
    viewProfile: "View profile",
    viewRepo: "GitHub",
  },
  stats: {
    current: "Followers now",
    gained: "Gained",
    lost: "Lost",
    net: "Net",
  },
  trend: {
    title: "Follower trend",
    desc: "Cumulative follower count since tracking started",
  },
  timeline: {
    title: "Timeline",
    follow: "{name} followed you",
    unfollow: "{name} unfollowed you",
    bootstrap: "Tracking started with {count} followers",
    empty: "No changes recorded yet — the next check runs on the hour",
    more: "Showing the latest {shown} of {total} events — the full log lives in the git history",
  },
  followers: {
    title: "Current followers",
  },
  states: {
    loading: "Fetching the watch records…",
    nodataTitle: "No records yet",
    nodataDesc: "The watchdog has not run yet. Trigger the Watch workflow (or wait for the next hourly run), then refresh this page.",
    errorTitle: "Could not load the records",
    retry: "Retry",
  },
  footer: {
    license: "Licensed under the MIT License",
    made: "Powered by GitHub Actions & Pages",
  },
} as const;
