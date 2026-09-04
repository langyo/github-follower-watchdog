import { defineComponent } from "vue";
import { RouterView } from "vue-router";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import { initWatch } from "@/data/store";
import "./App.scss";

export default defineComponent({
  name: "SiteApp",
  setup() {
    // The watch records are fetched once for the whole shell — the nav's
    // profile link, the footer's copyright line and the view all share it.
    initWatch();
    return () => (
      <div class="site">
        <SiteNav />
        <div class="site__nav-spacer" />
        <main class="site__main">
          <RouterView />
        </main>
        <SiteFooter />
      </div>
    );
  },
});
