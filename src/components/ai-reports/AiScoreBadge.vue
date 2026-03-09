<script setup lang="ts">
import { computed } from "vue";

import { clampScore, scoreTone } from "../../lib/aiReport.ts";

const props = withDefaults(
  defineProps<{
    score: number;
    label?: string;
  }>(),
  {
    label: "匹配度",
  },
);

const safeScore = computed(() => clampScore(props.score));
const tone = computed(() => scoreTone(safeScore.value));

const badgeClass = computed(() => {
  if (tone.value === "success") return "bg-emerald-500/10 text-emerald-300 ring-emerald-500/20";
  if (tone.value === "warning") return "bg-amber-500/10 text-amber-300 ring-amber-500/20";
  return "bg-red-500/10 text-red-300 ring-red-500/20";
});

const barClass = computed(() => {
  if (tone.value === "success") return "bg-emerald-400";
  if (tone.value === "warning") return "bg-amber-400";
  return "bg-red-400";
});
</script>

<template>
  <div class="inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-semibold ring-1" :class="badgeClass">
    <span class="text-[11px] opacity-90">{{ label }}</span>
    <span class="tabular-nums">{{ safeScore }}</span>
    <span class="text-[11px] opacity-80">/ 100</span>
    <span class="mx-0.5 h-3 w-px bg-white/10" aria-hidden="true" />
    <span class="relative h-1.5 w-14 overflow-hidden rounded-full bg-white/10" aria-hidden="true">
      <span class="absolute inset-y-0 left-0 rounded-full" :class="barClass" :style="{ width: `${safeScore}%` }" />
    </span>
  </div>
</template>

