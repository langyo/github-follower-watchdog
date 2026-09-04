import { computed, defineComponent, onMounted, onUnmounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { Languages, Activity } from "@lucide/vue";
import { LOCALE_OPTIONS, type Locale } from "@/locales";
import { watch as watchData } from "@/data/store";
import { profileUrl } from "@/data/load";
import GithubMark from "@/components/GithubMark";
import { LinkButton } from "@/components/ui";
import "./SiteNav.scss";

const GITHUB_REPO = "https://github.com/langyo/github-follower-watchdog";

export default defineComponent({
  name: "SiteNav",
  setup() {
    const { t, locale } = useI18n();

    const scrolled = ref(false);

    function onScroll() {
      scrolled.value = window.scrollY > 8;
    }

    onMounted(() => {
      onScroll();
      window.addEventListener("scroll", onScroll, { passive: true });
    });
    onUnmounted(() => window.removeEventListener("scroll", onScroll));

    const current = computed(
      () => LOCALE_OPTIONS.find((l) => l.code === locale.value) ?? LOCALE_OPTIONS[0],
    );

    const langOpen = ref(false);
    const langAnchor = ref<HTMLElement | null>(null);

    function select(code: string) {
      langOpen.value = false;
      locale.value = code as Locale;
      if (typeof document !== "undefined") document.documentElement.lang = code;
      try {
        localStorage.setItem("gfw-site-locale", code);
      } catch {
        /* ignore */
      }
    }

    function onDocClick(e: MouseEvent) {
      if (langOpen.value && langAnchor.value && !langAnchor.value.contains(e.target as Node)) {
        langOpen.value = false;
      }
    }
    function onKeydown(e: KeyboardEvent) {
      if (e.key === "Escape") langOpen.value = false;
    }
    onMounted(() => {
      document.addEventListener("click", onDocClick);
      document.addEventListener("keydown", onKeydown);
    });
    onUnmounted(() => {
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onKeydown);
    });

    // Profile CTA once the records land; the repo link until then.
    const ctaHref = computed(() =>
      watchData.value ? profileUrl(watchData.value.current.watch) : GITHUB_REPO,
    );

    return () => (
      <header class={["site-nav", scrolled.value ? "is-scrolled" : ""].join(" ")}>
        <div class="site-nav__inner">
          <a href={`${import.meta.env.BASE_URL}`} class="site-nav__brand">
            <span class="site-nav__mark">
              <Activity size={18} />
            </span>
            <span class="site-nav__name">Follower Watchdog</span>
          </a>

          <nav class="site-nav__links">
            <a href="#trend" class="site-nav__link">{t("nav.trend")}</a>
            <a href="#timeline" class="site-nav__link">{t("nav.timeline")}</a>
            <a href="#followers" class="site-nav__link">{t("nav.followers")}</a>
            <a href={GITHUB_REPO} target="_blank" rel="noopener" class="site-nav__link">
              <GithubMark size={12} style="vertical-align: -2px; margin-right: 4px;" />
              {t("nav.github")}
            </a>
          </nav>

          <div class="site-nav__side">
            <span class="site-nav__lang" ref={langAnchor}>
              <button
                type="button"
                class="site-nav__lang-btn"
                aria-label={t("nav.language")}
                aria-expanded={langOpen.value}
                onClick={() => (langOpen.value = !langOpen.value)}
              >
                <Languages size={14} />
                <span class="site-nav__lang-code">{current.value.native}</span>
              </button>
              {langOpen.value && (
                <ul class="site-nav__lang-menu glass-panel" role="menu">
                  {LOCALE_OPTIONS.map((opt) => (
                    <li key={opt.code} role="none">
                      <button
                        type="button"
                        role="menuitem"
                        class={[
                          "site-nav__lang-item",
                          opt.code === locale.value ? "is-active" : "",
                        ].join(" ")}
                        onClick={() => select(opt.code)}
                      >
                        <span>{opt.label}</span>
                        {opt.code === locale.value && <span class="site-nav__lang-check">✓</span>}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </span>
            <LinkButton href={ctaHref.value} variant="secondary" size="sm" external class="site-nav__cta">
              <GithubMark size={13} />
              {t("nav.github")}
            </LinkButton>
          </div>
        </div>
      </header>
    );
  },
});
