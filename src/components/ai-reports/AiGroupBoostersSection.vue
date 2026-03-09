<script setup lang="ts">
import type { AiGroupReport } from "../../lib/aiReport.ts";
import AiGroupBoosterCard from "./AiGroupBoosterCard.vue";

defineProps<{
  report: AiGroupReport;
}>();
</script>

<template>
  <section
    id="ai-group-boosters"
    class="scroll-mt-24 space-y-3 rounded-xl bg-card/60 p-4 ring-1 ring-white/[0.06]"
  >
    <div class="flex items-center justify-between gap-2">
      <div class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-content-muted">
        <span class="inline-flex h-4 w-4 items-center justify-center text-accent" aria-hidden="true">✦</span>
        <span>加分项目</span>
      </div>
      <span class="text-xs text-content-muted">{{ report.projectBoosters.length }} 个</span>
    </div>

    <div class="grid gap-3">
      <AiGroupBoosterCard
        v-for="(booster, index) in report.projectBoosters"
        :key="`${index}-${booster.title}`"
        :booster="booster"
        :index="index"
      />
    </div>
  </section>
</template>
