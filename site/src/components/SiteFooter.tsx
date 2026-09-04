import { computed, defineComponent } from "vue";
import { useI18n } from "vue-i18n";
import GithubMark from "@/components/GithubMark";
import { watch as watchData } from "@/data/store";
import "./SiteFooter.scss";

const GITHUB_REPO = "https://github.com/langyo/github-follower-watchdog";

export default defineComponent({
  name: "SiteFooter",
  setup() {
    const { t } = useI18n();

    // The copyright follows the watched account — a fork's footer names
    // the fork owner, not the upstream author.
    const owner = computed(() => watchData.value?.current.watch ?? "langyo");

    return () => (
      <footer class="site-footer">
        <div class="site-footer__inner">
          <div class="site-footer__col site-footer__col--brand">
            <span class="site-footer__brand">Follower Watchdog</span>
            <span class="site-footer__muted">© 2026 {owner.value} · {t("footer.license")}</span>
            <span class="site-footer__muted">{t("footer.made")}</span>
          </div>
          <nav class="site-footer__col site-footer__links">
            <a href="#trend" class="site-footer__link">{t("nav.trend")}</a>
            <a href="#timeline" class="site-footer__link">{t("nav.timeline")}</a>
            <a href="#followers" class="site-footer__link">{t("nav.followers")}</a>
            <a href={GITHUB_REPO} target="_blank" rel="noopener" class="site-footer__link">
              <GithubMark size={12} style="vertical-align: -2px; margin-right: 4px;" />
              GitHub
            </a>
          </nav>
        </div>
      </footer>
    );
  },
});
