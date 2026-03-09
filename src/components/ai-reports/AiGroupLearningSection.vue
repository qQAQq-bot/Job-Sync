<script setup lang="ts">
import type { Component } from "vue";
import { computed } from "vue";
import { Check, GraduationCap, Rocket, Timer, TrendingUp } from "lucide-vue-next";

import type { AiGroupReport, AiLearningItem } from "../../lib/aiReport.ts";

const props = defineProps<{
  report: AiGroupReport;
}>();

type Tone = "success" | "warning" | "accent";

type LearningColumn = {
  key: keyof AiGroupReport["learningPlan"];
  title: string;
  subtitle: string;
  icon: Component;
  tone: Tone;
};

const columns: LearningColumn[] = [
  { key: "p0", title: "P0", subtitle: "立刻做", icon: Rocket, tone: "success" },
  { key: "p1", title: "P1", subtitle: "1-3 个月", icon: Timer, tone: "warning" },
  { key: "p2", title: "P2", subtitle: "3-12 个月", icon: TrendingUp, tone: "accent" },
];

const learning = computed(() => props.report.learningPlan);

function itemsOf(key: LearningColumn["key"]): AiLearningItem[] {
  return learning.value[key] ?? [];
}

function toneText(tone: Tone): string {
  if (tone === "success") return "text-accent-success";
  if (tone === "warning") return "text-accent-warning";
  return "text-accent";
}

function tonePill(tone: Tone): string {
  if (tone === "success") return "bg-accent-success/10 ring-1 ring-accent-success/25 text-accent-success";
  if (tone === "warning") return "bg-accent-warning/10 ring-1 ring-accent-warning/25 text-accent-warning";
  return "bg-accent/10 ring-1 ring-accent/25 text-accent";
}

function toneBorder(tone: Tone): string {
  if (tone === "success") return "border-accent-success/35";
  if (tone === "warning") return "border-accent-warning/35";
  return "border-accent/35";
}
</script>

<template>
  <section
    id="ai-group-learning"
    class="scroll-mt-24 space-y-3 rounded-xl bg-card/60 p-4 ring-1 ring-white/[0.06]"
  >
    <header class="flex flex-wrap items-center justify-between gap-2">
      <div class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-content-muted">
        <GraduationCap class="h-4 w-4 text-accent" aria-hidden="true" />
        <span>学习计划</span>
      </div>
      <span class="text-xs text-content-muted">按优先级分层推进</span>
    </header>

    <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      <div
        v-for="col in columns"
        :key="col.key"
        class="rounded-xl bg-white/[0.03] p-4 ring-1 ring-white/[0.06] border-t-2"
        :class="toneBorder(col.tone)"
      >
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-2">
            <component :is="col.icon" class="h-4 w-4" :class="toneText(col.tone)" aria-hidden="true" />
            <div class="text-xs font-semibold text-content-primary">
              <span class="tabular-nums">{{ col.title }}</span>
              <span class="ml-1 text-content-muted">· {{ col.subtitle }}</span>
            </div>
          </div>
          <span class="rounded-full bg-white/[0.06] px-2 py-0.5 text-[11px] text-content-muted ring-1 ring-white/[0.06]">
            {{ itemsOf(col.key).length }} 项
          </span>
        </div>

        <div class="mt-3 space-y-3">
          <div
            v-for="(it, idx) in itemsOf(col.key)"
            :key="idx"
            class="rounded-xl bg-gradient-to-br from-white/[0.04] to-white/[0.02] p-3 ring-1 ring-white/[0.08] border-l-2"
            :class="toneBorder(col.tone)"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <div class="truncate text-sm font-semibold text-content-primary">{{ it.topic }}</div>
                <div class="mt-1 break-words text-sm leading-relaxed text-content-secondary">{{ it.why }}</div>
              </div>
              <span
                class="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-semibold tabular-nums"
                :class="tonePill(col.tone)"
                aria-hidden="true"
              >
                {{ idx + 1 }}
              </span>
            </div>

            <div class="mt-3 rounded-lg bg-black/20 p-3 ring-1 ring-white/[0.06]">
              <div class="text-xs font-semibold text-content-muted">预期产出</div>
              <ul class="mt-2 space-y-1.5 text-sm text-content-secondary">
                <li v-for="(t, i) in it.expectedOutput" :key="i" class="flex items-start gap-2">
                  <Check class="mt-0.5 h-4 w-4 shrink-0 text-accent-success" aria-hidden="true" />
                  <span class="min-w-0 break-words">{{ t }}</span>
                </li>
              </ul>
            </div>
          </div>

          <div
            v-if="itemsOf(col.key).length === 0"
            class="rounded-xl bg-black/20 px-3 py-6 text-center text-sm text-content-muted ring-1 ring-white/[0.06]"
          >
            （暂无）
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
