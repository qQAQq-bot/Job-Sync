import { createRouter, createWebHashHistory } from "vue-router";

import Ai from "./pages/Ai.vue";
import AiReports from "./pages/AiReports.vue";
import Crawl from "./pages/Crawl.vue";
import Jobs from "./pages/Jobs.vue";
import Settings from "./pages/Settings.vue";
import ResumeWorkspace from "./pages/ResumeWorkspace.vue";

export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: "/", redirect: "/crawl" },
    { path: "/crawl", component: Crawl },
    { path: "/jobs", component: Jobs },
    { path: "/export", redirect: "/jobs" },
    { path: "/ai", component: Ai },
    { path: "/resume-workspace", component: ResumeWorkspace },
    { path: "/ai-reports", component: AiReports },
    { path: "/settings", component: Settings },
  ],
});
