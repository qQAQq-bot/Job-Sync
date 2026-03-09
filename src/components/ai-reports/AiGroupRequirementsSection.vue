<script setup lang="ts">
import { Copy } from "lucide-vue-next";

import type { AiGroupReport } from "../../lib/aiReport.ts";
import { useCopy } from "../../lib/useCopy.ts";

defineProps<{
  report: AiGroupReport;
}>();

const { copy, copyLabel } = useCopy();
</script>

<template>
  <section
    id="ai-group-requirements"
    class="scroll-mt-24 space-y-4 rounded-xl bg-card/60 p-4 ring-1 ring-white/[0.06]"
  >
    <div class="text-xs font-semibold uppercase tracking-wider text-content-muted">共同要求</div>

    <div class="grid gap-3 md:grid-cols-2">
      <div class="rounded-lg bg-white/[0.03] p-3 ring-1 ring-white/[0.06]">
        <div class="text-xs font-semibold text-content-muted">Must Have</div>
        <ul class="mt-2 list-disc space-y-1 pl-5 text-sm text-content-secondary">
          <li v-for="(t, i) in report.commonRequirements.mustHave" :key="i">{{ t }}</li>
        </ul>
      </div>
      <div class="rounded-lg bg-white/[0.03] p-3 ring-1 ring-white/[0.06]">
        <div class="text-xs font-semibold text-content-muted">Nice To Have</div>
        <ul class="mt-2 list-disc space-y-1 pl-5 text-sm text-content-secondary">
          <li v-for="(t, i) in report.commonRequirements.niceToHave" :key="i">{{ t }}</li>
        </ul>
      </div>
    </div>

    <div class="rounded-lg bg-white/[0.03] p-3 ring-1 ring-white/[0.06]">
      <div class="text-xs font-semibold text-content-muted">职责</div>
      <ul class="mt-2 list-disc space-y-1 pl-5 text-sm text-content-secondary">
        <li v-for="(t, i) in report.commonRequirements.responsibilities" :key="i">{{ t }}</li>
      </ul>
    </div>

    <div class="rounded-lg bg-white/[0.03] p-3 ring-1 ring-white/[0.06]">
      <div class="flex items-center justify-between gap-3">
        <div class="text-xs font-semibold text-content-muted">关键词</div>
        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-lg bg-white/[0.06] px-3 py-1.5 text-xs font-medium text-content-secondary ring-1 ring-white/[0.06] transition-colors hover:bg-white/[0.10] hover:text-content-primary"
          @click="copy('keywords', report.commonRequirements.keywords.join(', '))"
        >
          <Copy class="h-4 w-4" aria-hidden="true" />
          {{ copyLabel("keywords", "复制") }}
        </button>
      </div>
      <div class="mt-2 flex flex-wrap gap-2">
        <span
          v-for="(k, i) in report.commonRequirements.keywords"
          :key="i"
          class="rounded-full bg-white/[0.06] px-2.5 py-1 text-xs text-content-secondary ring-1 ring-white/[0.06]"
        >
          {{ k }}
        </span>
      </div>
    </div>
  </section>
</template>
