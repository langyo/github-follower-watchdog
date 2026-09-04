import { computed, defineComponent, ref } from "vue";
import { useI18n } from "vue-i18n";
import {
  AlertTriangle, ArrowUpRight, Inbox, RefreshCw, TrendingUp,
  UserMinus, UserPlus, Users,
} from "@lucide/vue";
import { initWatch, status, watch as watchData } from "@/data/store";
import { avatarUrl, profileUrl } from "@/data/load";
import {
  scoreFacts, GROUP_ORDER, type AccountFacts, type Scored, type ScoreGroup,
} from "@/data/scoring";
import GithubMark from "@/components/GithubMark";
import Sparkline from "@/components/Sparkline";
import { LinkButton, Reveal } from "@/components/ui";
import "./WatchView.scss";

const GITHUB_REPO = "https://github.com/langyo/github-follower-watchdog";
const TIMELINE_CAP = 200;

const TIME_DIVISIONS = [
  { amount: 60, unit: "second" },
  { amount: 60, unit: "minute" },
  { amount: 24, unit: "hour" },
  { amount: 7, unit: "day" },
  { amount: 4.34524, unit: "week" },
  { amount: 12, unit: "month" },
  { amount: Number.POSITIVE_INFINITY, unit: "year" },
] as const;

function relTime(iso: string, locale: string): string {
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  let duration = (new Date(iso).getTime() - Date.now()) / 1000;
  for (const division of TIME_DIVISIONS) {
    if (Math.abs(duration) < division.amount) {
      return rtf.format(Math.round(duration), division.unit as Intl.RelativeTimeFormatUnit);
    }
    duration /= division.amount;
  }
  return "";
}

function absTime(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" })
    .format(new Date(iso));
}

export default defineComponent({
  name: "WatchView",
  setup() {
    const { t, locale } = useI18n();

    const data = computed(() => watchData.value);

    const stats = computed(() => {
      const d = data.value;
      if (!d) return null;
      return [
        { key: "current", value: d.current.followers.length, tone: "" },
        { key: "gained", value: d.gained, tone: "is-up" },
        { key: "lost", value: d.lost, tone: "is-down" },
        { key: "net", value: d.gained - d.lost, tone: d.gained - d.lost >= 0 ? "is-up" : "is-down" },
      ];
    });

    // Newest first; only the latest slice renders — the full log lives in
    // git history (data/history.jsonl), not in the DOM.
    const timeline = computed(() => {
      const d = data.value;
      if (!d) return [];
      return [...d.events].reverse().slice(0, TIMELINE_CAP);
    });
    const hiddenEvents = computed(() => {
      const d = data.value;
      return d ? Math.max(0, d.events.length - TIMELINE_CAP) : 0;
    });

    const followers = computed(() => data.value?.current.followers ?? []);

    // Per-follower scoring from the enrichment facts (data/accounts.json);
    // accounts the watchdog has not profiled yet — and ones that vanished
    // from GitHub — stay unassessed instead of presenting absence as fact.
    const scores = computed(() => {
      const map = new Map<string, { facts?: AccountFacts; scored: Scored | null }>();
      for (const follower of followers.value) {
        const facts = data.value?.accounts[follower.login];
        const scored = facts && !facts.missing ? scoreFacts(facts) : null;
        map.set(follower.login, { facts, scored });
      }
      return map;
    });

    const groupCounts = computed(() => {
      const counts: Record<ScoreGroup, number> = {
        all: followers.value.length, real: 0, uncertain: 0, suspect: 0, unassessed: 0,
      };
      for (const follower of followers.value) {
        const info = scores.value.get(follower.login);
        counts[info?.scored ? info.scored.cls : "unassessed"] += 1;
      }
      return counts;
    });

    const assessedCount = computed(
      () => followers.value.length - groupCounts.value.unassessed,
    );

    const activeGroup = ref<ScoreGroup>("all");
    const visibleFollowers = computed(() => {
      if (activeGroup.value === "all") return followers.value;
      return followers.value.filter((follower) => {
        const info = scores.value.get(follower.login);
        return (info?.scored ? info.scored.cls : "unassessed") === activeGroup.value;
      });
    });

    function followerTip(login: string): string {
      const info = scores.value.get(login);
      if (!info?.facts || !info.scored) {
        return info?.facts?.missing
          ? t("followers.tip.missing")
          : t("followers.tip.nofacts");
      }
      const f = info.facts;
      const since = f.created_at
        ? new Intl.DateTimeFormat(locale.value, { dateStyle: "medium" })
            .format(new Date(f.created_at))
        : t("followers.tip.unknown");
      return [
        `${t("followers.tip.score")}: ${info.scored.score}`,
        `${t("followers.tip.contribs")}: ${f.contributions ?? t("followers.tip.unknown")}`,
        `${t("followers.tip.repos")}: ${f.public_repos ?? 0}`,
        `${t("followers.tip.following")}: ${f.following ?? 0}`,
        `${t("followers.tip.followers")}: ${f.followers ?? 0}`,
        `${t("followers.tip.since")}: ${since}`,
      ].join(" · ");
    }

    return () => (
      <div class="watch">
        {/* ── HERO — the watched account at a glance ─────────── */}
        <section class="hero">
          <div class="aurora" />
          <div class="hero__content container">
            <Reveal>
              <div class="hero__badge accent-pill">
                <span class="hero__signal" />
                {t("hero.badge")}
              </div>
            </Reveal>

            <Reveal delay={80}>
              <h1 class="hero__title">
                <span class="gradient-text">Follower Watchdog</span>
              </h1>
            </Reveal>

            <Reveal delay={160}>
              <p class="hero__tagline">{t("hero.tagline")}</p>
            </Reveal>

            <Reveal delay={240}>
              <p class="hero__lede">{t("hero.lede")}</p>
            </Reveal>

            {data.value && (
              <Reveal delay={300}>
                <div class="hero__profile glass-panel">
                  <img
                    class="hero__avatar"
                    src={data.value.current.profile.avatar_url ||
                      `https://github.com/${data.value.current.watch}.png`}
                    alt={data.value.current.watch}
                    width={56}
                    height={56}
                  />
                  <div class="hero__profile-main">
                    <span class="hero__profile-name">
                      {data.value.current.profile.name || data.value.current.watch}
                    </span>
                    <span class="hero__profile-meta">
                      {t("hero.updated", { when: relTime(data.value.current.updated_at, locale.value) })}
                      {" · "}
                      {t("hero.since", { when: relTime(data.value.since, locale.value) })}
                    </span>
                  </div>
                </div>
              </Reveal>
            )}

            <Reveal delay={360}>
              <div class="hero__actions">
                {data.value && (
                  <LinkButton href={profileUrl(data.value.current.watch)} variant="primary" external>
                    <GithubMark size={14} />
                    {t("hero.viewProfile")}
                  </LinkButton>
                )}
                <LinkButton href={GITHUB_REPO} variant="secondary" external>
                  {t("hero.viewRepo")}
                </LinkButton>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── Non-ready states ─────────────────────────────────── */}
        {status.value !== "ready" && (
          <section class="states container">
            {status.value === "loading" && (
              <div class="glass-panel states__panel">
                <RefreshCw size={18} class="animate-spin" />
                <span>{t("states.loading")}</span>
              </div>
            )}
            {status.value === "nodata" && (
              <div class="glass-panel states__panel">
                <Inbox size={18} />
                <strong>{t("states.nodataTitle")}</strong>
                <span>{t("states.nodataDesc")}</span>
              </div>
            )}
            {status.value === "error" && (
              <div class="glass-panel states__panel">
                <AlertTriangle size={18} />
                <strong>{t("states.errorTitle")}</strong>
                <button type="button" class="btn btn--secondary btn--sm" onClick={() => void initWatch()}>
                  <RefreshCw size={13} />
                  {t("states.retry")}
                </button>
              </div>
            )}
          </section>
        )}

        {status.value === "ready" && data.value && stats.value && (
          <>
            {/* ── TREND — stats + sparkline ──────────────────── */}
            <section id="trend" class="trend section-bg">
              <div class="container">
                <div class="trend__stats">
                  {stats.value.map((stat, i) => (
                    <Reveal key={stat.key} delay={i * 70}>
                      <div class={["trend__stat glass-panel", stat.tone].join(" ")}>
                        <span class="trend__stat-value">
                          {stat.value > 0 && stat.key === "net" ? "+" : ""}
                          {stat.value.toLocaleString(locale.value)}
                        </span>
                        <span class="trend__stat-label">{t(`stats.${stat.key}`)}</span>
                      </div>
                    </Reveal>
                  ))}
                </div>

                <Reveal delay={280}>
                  <div class="trend__chart glass-panel">
                    <div class="trend__chart-head">
                      <span class="trend__chart-title">
                        <TrendingUp size={15} />
                        {t("trend.title")}
                      </span>
                      <span class="trend__chart-desc">{t("trend.desc")}</span>
                    </div>
                    <Sparkline points={data.value.series} />
                    <div class="trend__chart-range">
                      <span title={absTime(data.value.since, locale.value)}>
                        {absTime(data.value.since, locale.value)}
                      </span>
                      <span>{absTime(new Date().toISOString(), locale.value)}</span>
                    </div>
                  </div>
                </Reveal>
              </div>
            </section>

            {/* ── TIMELINE — append-only change log ──────────── */}
            <section id="timeline" class="timeline">
              <div class="container">
                <Reveal>
                  <div class="section-head">
                    <h2 class="section-head__title">{t("timeline.title")}</h2>
                  </div>
                </Reveal>

                {timeline.value.length === 0 && (
                  <Reveal delay={80}>
                    <div class="glass-panel timeline__empty">
                      <Inbox size={16} />
                      <span>{t("timeline.empty")}</span>
                    </div>
                  </Reveal>
                )}

                <div class="timeline__list">
                  {timeline.value.map((event, i) => (
                    <Reveal key={`${event.ts}-${event.login ?? "bootstrap"}-${i}`} delay={Math.min(i, 12) * 25}>
                      {event.type === "bootstrap" ? (
                        <div class="timeline__row glass-panel is-bootstrap">
                          <span class="timeline__icon timeline__icon--base"><Users size={15} /></span>
                          <span class="timeline__text">
                            {t("timeline.bootstrap", { count: (event.count ?? 0).toLocaleString(locale.value) })}
                          </span>
                          <time
                            class="timeline__time"
                            datetime={event.ts}
                            title={absTime(event.ts, locale.value)}
                          >
                            {relTime(event.ts, locale.value)}
                          </time>
                        </div>
                      ) : (
                        <a
                          class="timeline__row glass-panel is-interactive"
                          href={profileUrl(event.login ?? "")}
                          target="_blank"
                          rel="noopener"
                        >
                          <img
                            class="timeline__avatar"
                            src={avatarUrl(event.id ?? 0, 64)}
                            alt={event.login}
                            loading="lazy"
                            width={28}
                            height={28}
                          />
                          <span
                            class={[
                              "timeline__icon",
                              event.type === "follow" ? "timeline__icon--up" : "timeline__icon--down",
                            ].join(" ")}
                          >
                            {event.type === "follow" ? <UserPlus size={14} /> : <UserMinus size={14} />}
                          </span>
                          <span class="timeline__text">
                            {t(event.type === "follow" ? "timeline.follow" : "timeline.unfollow", {
                              name: event.login ?? "",
                            })}
                          </span>
                          <time
                            class="timeline__time"
                            datetime={event.ts}
                            title={absTime(event.ts, locale.value)}
                          >
                            {relTime(event.ts, locale.value)}
                          </time>
                        </a>
                      )}
                    </Reveal>
                  ))}
                </div>

                {hiddenEvents.value > 0 && (
                  <p class="timeline__more">
                    {t("timeline.more", {
                      shown: TIMELINE_CAP.toLocaleString(locale.value),
                      total: data.value.events.length.toLocaleString(locale.value),
                    })}
                  </p>
                )}
              </div>
            </section>

            {/* ── FOLLOWERS — the current roster, scored ──────── */}
            <section id="followers" class="followers section-bg">
              <div class="container">
                <Reveal>
                  <div class="section-head">
                    <h2 class="section-head__title">{t("followers.title")}</h2>
                    <span class="section-head__count accent-pill">
                      {followers.value.length.toLocaleString(locale.value)}
                    </span>
                  </div>
                </Reveal>

                <Reveal delay={60}>
                  <div class="followers__bar">
                    <div class="followers__groups" role="group">
                      {(["all", ...GROUP_ORDER] as const).map((group) => (
                        <button
                          key={group}
                          type="button"
                          class={[
                            "followers__group",
                            `is-${group}`,
                            activeGroup.value === group ? "is-active" : "",
                          ].join(" ")}
                          onClick={() => (activeGroup.value = group)}
                        >
                          {t(`followers.groups.${group}`)}
                          <span class="followers__group-count">
                            {groupCounts.value[group].toLocaleString(locale.value)}
                          </span>
                        </button>
                      ))}
                    </div>
                    <span class="followers__assessed">
                      {t("followers.assessed", {
                        assessed: assessedCount.value.toLocaleString(locale.value),
                        total: followers.value.length.toLocaleString(locale.value),
                      })}
                    </span>
                  </div>
                </Reveal>

                {visibleFollowers.value.length === 0 ? (
                  <div class="glass-panel followers__empty">
                    <Inbox size={16} />
                    <span>{t("followers.emptyGroup")}</span>
                  </div>
                ) : (
                  <div class="followers__grid">
                    {visibleFollowers.value.map((follower, i) => {
                      const info = scores.value.get(follower.login);
                      const cls = info?.scored ? info.scored.cls : "unassessed";
                      return (
                        <Reveal key={follower.login} delay={Math.min(i % 8, 6) * 30}>
                          <a
                            class="follower glass-panel is-interactive"
                            href={profileUrl(follower.login)}
                            target="_blank"
                            rel="noopener"
                            title={followerTip(follower.login)}
                          >
                            <img
                              class="follower__avatar"
                              src={avatarUrl(follower.id, 96)}
                              alt={follower.login}
                              loading="lazy"
                              width={40}
                              height={40}
                            />
                            <span class="follower__login">{follower.login}</span>
                            <span class={["follower__score", `is-${cls}`].join(" ")}>
                              {info?.scored ? info.scored.score : "–"}
                            </span>
                            <ArrowUpRight size={13} class="follower__go" />
                          </a>
                        </Reveal>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>
          </>
        )}
      </div>
    );
  },
});
