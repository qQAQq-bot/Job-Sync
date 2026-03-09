<script setup lang="ts">
import { computed } from "vue";
import type { Component } from "vue";
import { RouterLink, RouterView, useRoute } from "vue-router";
import { Bot, Database, FileText, Scan, Settings } from "lucide-vue-next";

import TitleBar from "./components/layout/TitleBar.vue";

interface NavItem {
  to: string;
  label: string;
  icon: Component;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    label: "数据",
    items: [
      { to: "/crawl", label: "采集", icon: Scan },
      { to: "/jobs", label: "职位库", icon: Database },
    ],
  },
  {
    label: "AI",
    items: [
      { to: "/ai", label: "职位分析", icon: Bot },
      { to: "/resume-workspace", label: "简历优化", icon: FileText },
      { to: "/ai-reports", label: "分析结果", icon: FileText },
    ],
  },
  {
    label: "系统",
    items: [{ to: "/settings", label: "设置", icon: Settings }],
  },
];

const navItemClass =
  "group relative flex items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-sm text-content-secondary transition-colors duration-200 hover:border-border/10 hover:bg-card-hover/70 hover:text-content-primary focus:outline-none focus-visible:ring-4 focus-visible:ring-border-glow/10 before:content-[''] before:absolute before:left-1.5 before:top-1/2 before:h-6 before:w-1 before:-translate-y-1/2 before:rounded-full before:bg-border-glow/80 before:opacity-0 before:transition-opacity";

const navItemExactActiveClass =
  "border-border-glow/20 bg-card-hover/90 text-content-primary shadow-sm before:opacity-100 [&_.nav-icon]:text-cyan-300 [&_.nav-label]:font-semibold";

const route = useRoute();
const contentMaxWidthClass = computed(() => (route.path === "/ai-reports" || route.path === "/jobs" ? "max-w-6xl" : "max-w-5xl"));
</script>

<template>
  <div class="flex h-screen flex-col bg-base">
    <TitleBar />

    <div class="relative flex-1 overflow-hidden">
      <div class="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.03] via-transparent to-transparent" />

      <!-- Ambient orbs -->
      <div
        class="ambient-orb left-[-12%] top-[-18%] h-[460px] w-[460px] animate-orb-1 opacity-[0.08]"
        style="background: radial-gradient(circle, rgb(var(--color-orb-indigo)) 0%, transparent 70%)"
      />
      <div
        class="ambient-orb bottom-[-14%] right-[-8%] h-[420px] w-[420px] animate-orb-2 opacity-[0.07]"
        style="background: radial-gradient(circle, rgb(var(--color-orb-cyan)) 0%, transparent 70%)"
      />
      <div
        class="ambient-orb right-[12%] top-[42%] h-[320px] w-[320px] animate-orb-3 opacity-[0.05]"
        style="background: radial-gradient(circle, rgb(var(--color-orb-amber)) 0%, transparent 70%)"
      />

      <!-- Content -->
      <div class="relative z-10 flex h-full gap-0">
        <!-- Sidebar -->
        <aside
          class="flex w-64 shrink-0 flex-col border-r border-border/10 bg-surface/90 backdrop-blur-xl"
        >
          <header class="px-4 pb-4 pt-5">
            <div class="ui-panel-muted flex items-center gap-3 px-3 py-3">
              <div
                class="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-border-glow/10 text-cyan-300 ring-1 ring-border-glow/15"
                aria-hidden="true"
              >
                <Bot class="h-5 w-5" />
              </div>
              <div class="min-w-0">
                <div class="truncate text-sm font-semibold tracking-wide text-content-primary">Job Sync</div>
                <div class="mt-1 truncate text-xs text-content-muted">职位采集与 AI 报告工作台</div>
              </div>
            </div>
          </header>

          <nav class="flex flex-1 flex-col gap-5 overflow-y-auto px-3 pb-5" aria-label="导航">
            <section v-for="g in navGroups" :key="g.label" class="space-y-2">
              <div class="px-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-content-muted">
                {{ g.label }}
              </div>
              <div class="space-y-1">
                <RouterLink
                  v-for="it in g.items"
                  :key="it.to"
                  :to="it.to"
                  :class="navItemClass"
                  :exact-active-class="navItemExactActiveClass"
                >
                  <component :is="it.icon" class="nav-icon h-4 w-4 shrink-0 text-content-muted transition-colors group-hover:text-content-secondary" aria-hidden="true" />
                  <span class="nav-label min-w-0 truncate">{{ it.label }}</span>
                </RouterLink>
              </div>
            </section>
          </nav>
        </aside>

        <!-- Main content -->
        <main
          class="min-w-0 flex-1 overflow-y-auto bg-surface/40 px-6 py-6"
        >
          <div :class="['ui-panel mx-auto w-full p-6', contentMaxWidthClass]">
            <RouterView v-slot="{ Component }">
              <KeepAlive>
                <component :is="Component" />
              </KeepAlive>
            </RouterView>
          </div>
        </main>
      </div>
    </div>
  </div>
</template>
