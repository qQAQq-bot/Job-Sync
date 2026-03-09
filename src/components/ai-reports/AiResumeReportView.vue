<script setup lang="ts">
import { computed, ref } from "vue";

import type { AiResumeReport } from "../../lib/aiReport.ts";
import AiJsonPanel from "./AiJsonPanel.vue";
import AiScoreBadge from "./AiScoreBadge.vue";

const props = defineProps<{
  report: AiResumeReport;
  raw?: unknown;
}>();

const copiedKey = ref<string | null>(null);

const keywordsText = computed(() => props.report.keywordSuggestions.join(", "));

async function copy(key: string, text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    copiedKey.value = key;
    window.setTimeout(() => {
      if (copiedKey.value === key) copiedKey.value = null;
    }, 1200);
  } catch {
    // ignore
  }
}

function copyLabel(key: string, label: string): string {
  return copiedKey.value === key ? "已复制" : label;
}

function joinBullets(lines: string[]): string {
  return lines.filter(Boolean).map((s) => `- ${s}`).join("\n");
}
</script>

<template>
  <section class="space-y-3">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div class="text-xs font-semibold uppercase tracking-wider text-content-muted">报告概览</div>
      <AiScoreBadge :score="report.matchScore" />
    </div>

    <div class="grid gap-3 md:grid-cols-2">
      <div class="rounded-xl bg-card/60 p-4 ring-1 ring-white/[0.06]">
        <div class="text-xs font-semibold text-content-muted">优势</div>
        <ul class="mt-2 list-disc space-y-1 pl-5 text-sm text-content-secondary">
          <li v-for="(t, i) in report.strengths" :key="i">{{ t }}</li>
        </ul>
      </div>
      <div class="rounded-xl bg-card/60 p-4 ring-1 ring-white/[0.06]">
        <div class="text-xs font-semibold text-content-muted">差距</div>
        <ul class="mt-2 list-disc space-y-1 pl-5 text-sm text-content-secondary">
          <li v-for="(t, i) in report.gaps" :key="i">{{ t }}</li>
        </ul>
      </div>
    </div>

    <div class="rounded-xl bg-card/60 p-4 ring-1 ring-white/[0.06]">
      <div class="flex items-center justify-between gap-3">
        <div class="text-xs font-semibold uppercase tracking-wider text-content-muted">关键词建议</div>
        <button
          type="button"
          class="rounded-lg bg-white/[0.06] px-3 py-1.5 text-xs font-medium text-content-secondary ring-1 ring-white/[0.06] transition-colors hover:bg-white/[0.10] hover:text-content-primary"
          @click="copy('keywords', keywordsText)"
        >
          {{ copyLabel("keywords", "复制") }}
        </button>
      </div>
      <div class="mt-2 flex flex-wrap gap-2">
        <span
          v-for="(k, i) in report.keywordSuggestions"
          :key="i"
          class="rounded-full bg-white/[0.06] px-2.5 py-1 text-xs text-content-secondary ring-1 ring-white/[0.06]"
        >
          {{ k }}
        </span>
      </div>
    </div>

    <div v-if="report.resumeRewrite" class="rounded-xl bg-card/60 p-4 ring-1 ring-white/[0.06] space-y-3">
      <div class="text-xs font-semibold uppercase tracking-wider text-content-muted">简历改写建议</div>

      <div v-if="report.resumeRewrite.summaryRewrite" class="rounded-lg bg-accent/10 p-3 ring-1 ring-accent/20">
        <div class="text-xs font-semibold text-content-muted">Summary（建议改写）</div>
        <div class="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-content-secondary">
          {{ report.resumeRewrite.summaryRewrite }}
        </div>
      </div>

      <div
        v-if="report.resumeRewrite.experienceBulletsRewrite && report.resumeRewrite.experienceBulletsRewrite.length"
        class="rounded-lg bg-white/[0.03] p-3 ring-1 ring-white/[0.06]"
      >
        <div class="flex items-center justify-between gap-3">
          <div class="text-xs font-semibold text-content-muted">Experience Bullets（建议改写）</div>
          <button
            type="button"
            class="rounded-lg bg-white/[0.06] px-3 py-1.5 text-xs font-medium text-content-secondary ring-1 ring-white/[0.06] transition-colors hover:bg-white/[0.10] hover:text-content-primary"
            @click="copy('exp_bullets', joinBullets(report.resumeRewrite.experienceBulletsRewrite ?? []))"
          >
            {{ copyLabel("exp_bullets", "复制") }}
          </button>
        </div>
        <ul class="mt-2 list-disc space-y-1 pl-5 text-sm text-content-secondary">
          <li v-for="(t, i) in report.resumeRewrite.experienceBulletsRewrite" :key="i">{{ t }}</li>
        </ul>
      </div>
    </div>

    <div class="rounded-xl bg-card/60 p-4 ring-1 ring-white/[0.06]">
      <div class="text-xs font-semibold uppercase tracking-wider text-content-muted">风险提示</div>
      <ul class="mt-2 list-disc space-y-1 pl-5 text-sm text-content-secondary">
        <li v-for="(t, i) in report.riskNotes" :key="i">{{ t }}</li>
      </ul>
    </div>

    <AiJsonPanel :value="raw ?? report" />
  </section>
</template>

