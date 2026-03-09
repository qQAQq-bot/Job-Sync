<script setup lang="ts">
import { Copy } from "lucide-vue-next";

import type { AiGroupReport } from "../../lib/aiReport.ts";
import { useCopy } from "../../lib/useCopy.ts";

defineProps<{
  report: AiGroupReport;
}>();

const { copy, copyLabel } = useCopy();

function joinBullets(lines: string[]): string {
  return lines.filter(Boolean).map((s) => `- ${s}`).join("\n");
}
</script>

<template>
  <section
    id="ai-group-resume"
    class="scroll-mt-24 space-y-4 rounded-xl bg-card/60 p-4 ring-1 ring-white/[0.06]"
  >
    <div class="text-xs font-semibold uppercase tracking-wider text-content-muted">简历策略</div>

    <div class="rounded-lg bg-accent/10 p-3 ring-1 ring-accent/20">
      <div class="text-xs font-semibold text-content-muted">定位</div>
      <div class="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-content-secondary">{{ report.resumeStrategy.positioning }}</div>
    </div>

    <div class="grid gap-3 md:grid-cols-2">
      <div class="rounded-lg bg-white/[0.03] p-3 ring-1 ring-white/[0.06]">
        <div class="text-xs font-semibold text-content-muted">必须突出</div>
        <ul class="mt-2 list-disc space-y-1 pl-5 text-sm text-content-secondary">
          <li v-for="(t, i) in report.resumeStrategy.mustHighlight" :key="i">{{ t }}</li>
        </ul>
      </div>
      <div class="rounded-lg bg-white/[0.03] p-3 ring-1 ring-white/[0.06]">
        <div class="flex items-center justify-between gap-3">
          <div class="text-xs font-semibold text-content-muted">可直接贴简历的 Bullets</div>
          <button
            type="button"
            class="inline-flex items-center gap-2 rounded-lg bg-white/[0.06] px-3 py-1.5 text-xs font-medium text-content-secondary ring-1 ring-white/[0.06] transition-colors hover:bg-white/[0.10] hover:text-content-primary"
            @click="copy('resume_bullets', joinBullets(report.resumeStrategy.bullets))"
          >
            <Copy class="h-4 w-4" aria-hidden="true" />
            {{ copyLabel("resume_bullets", "复制") }}
          </button>
        </div>
        <ul class="mt-2 list-disc space-y-1 pl-5 text-sm text-content-secondary">
          <li v-for="(t, i) in report.resumeStrategy.bullets" :key="i">{{ t }}</li>
        </ul>
      </div>
    </div>
  </section>
</template>
