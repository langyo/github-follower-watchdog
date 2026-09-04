import { createRouter, createWebHistory } from "vue-router";

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL || "/"),
  routes: [
    {
      path: "/",
      name: "watch",
      component: () => import("@/views/WatchView"),
    },
    {
      // The site is a single page; unknown paths (stale deep links, SPA
      // fallbacks) come home instead of rendering an empty shell.
      path: "/:pathMatch(.*)*",
      redirect: "/",
    },
  ],
});
