<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import { Check, ChevronDown, Copy } from "lucide-vue-next";

import { useCopy } from "../../lib/useCopy.ts";

type BoosterTab = "deliverables" | "resume";

type Booster = {
  title: string;
  why: string;
  deliverables: string[];
  resumeBullets: string[];
};

const props = defineProps<{
  booster: Booster;
  index: number;
}>();

const { copy, copyLabel } = useCopy();

const tab = ref<BoosterTab>("deliverables");
const whyExpanded = ref(false);
const whyExpandable = ref(false);
const whyEl = ref<HTMLElement | null>(null);

function joinBullets(lines: string[]): string {
  return lines.filter(Boolean).map((s) => `- ${s}`).join("\n");
}

function recalcWhyExpandable(): void {
  const el = whyEl.value;
  if (!el) return;
  if (whyExpanded.value) return;
  whyExpandable.value = el.scrollHeight > el.clientHeight + 1;
}

async function toggleWhy(): Promise<void> {
  whyExpanded.value = !whyExpanded.value;
  if (whyExpanded.value) return;
  await nextTick();
  recalcWhyExpandable();
}

function copyKey(suffix: string): string {
  return `booster_${props.index}_${suffix}`;
}

let resizeRaf = 0;
function scheduleRecalc(): void {
  window.cancelAnimationFrame(resizeRaf);
  resizeRaf = window.requestAnimationFrame(() => {
    recalcWhyExpandable();
  });
}

function onWindowResize(): void {
  scheduleRecalc();
}

watch(
  () => props.booster,
  async () => {
    tab.value = "deliverables";
    whyExpanded.value = false;
    whyExpandable.value = false;
    await nextTick();
    scheduleRecalc();
  },
  { immediate: true },
);

onMounted(() => {
  window.addEventListener("resize", onWindowResize, { passive: true });
});

onUnmounted(() => {
  window.removeEventListener("resize", onWindowResize);
  window.cancelAnimationFrame(resizeRaf);
});
</script>

<template>
  <article
    class="space-y-3 rounded-xl bg-gradient-to-br from-white/[0.04] to-white/[0.02] p-4 ring-1 ring-white/[0.08] transition-colors hover:bg-white/[0.04]"
  >
    <header class="flex items-start justify-between gap-3">
      <div class="min-w-0 flex items-start gap-3">
        <div
          class="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent ring-1 ring-white/[0.06]"
          aria-hidden="true"
        >
          <span class="text-xs font-semibold tabular-nums">{{ index + 1 }}</span>
        </div>
        <div class="min-w-0">
          <div class="truncate text-sm font-semibold text-content-primary">{{ booster.title }}</div>
          <div class="mt-1 flex flex-wrap items-center gap-2 text-xs text-content-muted">
            <span class="rounded-full bg-white/[0.06] px-2 py-0.5 ring-1 ring-white/[0.06]">
              交付物 {{ booster.deliverables.length }}
            </span>
            <span class="rounded-full bg-white/[0.06] px-2 py-0.5 ring-1 ring-white/[0.06]">
              简历要点 {{ booster.resumeBullets.length }}
            </span>
          </div>
        </div>
      </div>

      <div class="hidden shrink-0 items-center gap-2 md:flex">
        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-lg bg-white/[0.06] px-3 py-1.5 text-xs font-medium text-content-secondary ring-1 ring-white/[0.06] transition-colors hover:bg-white/[0.10] hover:text-content-primary"
          :aria-label="`复制 ${booster.title} 的交付物`"
          @click="copy(copyKey('deliverables'), joinBullets(booster.deliverables))"
        >
          <Copy class="h-4 w-4" aria-hidden="true" />
          {{ copyLabel(copyKey("deliverables"), "复制交付物") }}
        </button>
        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-lg bg-white/[0.06] px-3 py-1.5 text-xs font-medium text-content-secondary ring-1 ring-white/[0.06] transition-colors hover:bg-white/[0.10] hover:text-content-primary"
          :aria-label="`复制 ${booster.title} 的简历写法`"
          @click="copy(copyKey('resume'), joinBullets(booster.resumeBullets))"
        >
          <Copy class="h-4 w-4" aria-hidden="true" />
          {{ copyLabel(copyKey("resume"), "复制简历写法") }}
        </button>
      </div>
    </header>

    <div class="rounded-lg bg-accent/10 p-3 ring-1 ring-accent/20">
      <div class="flex items-start gap-3">
        <div class="mt-1 h-5 w-1.5 shrink-0 rounded-full bg-accent/40" aria-hidden="true" />
        <div class="min-w-0 flex-1">
          <div class="text-xs font-semibold text-content-muted">为什么做</div>
          <p
            ref="whyEl"
            class="mt-1 whitespace-pre-wrap text-sm text-content-secondary"
            :class="whyExpanded ? '' : 'booster-clamp-3'"
          >
            {{ booster.why }}
          </p>
        </div>
        <button
          v-if="whyExpandable || whyExpanded"
          type="button"
          class="inline-flex shrink-0 items-center gap-1 rounded-lg bg-white/[0.06] px-2.5 py-1.5 text-xs font-medium text-content-secondary ring-1 ring-white/[0.06] transition-colors hover:bg-white/[0.10] hover:text-content-primary"
          :aria-label="`${whyExpanded ? '收起' : '展开'} ${booster.title} 的说明`"
          @click="toggleWhy"
        >
          <span>{{ whyExpanded ? "收起" : "展开" }}</span>
          <ChevronDown
            class="h-4 w-4 transition-transform duration-200 motion-reduce:transition-none"
            :class="whyExpanded ? 'rotate-180' : ''"
            aria-hidden="true"
          />
        </button>
      </div>
    </div>

    <!-- Desktop: 两列并排 -->
    <div class="hidden gap-3 md:grid md:grid-cols-2">
      <div class="rounded-lg bg-black/20 p-3 ring-1 ring-white/[0.06]">
        <div class="flex items-center justify-between gap-2">
          <div class="text-xs font-semibold text-content-muted">交付物</div>
          <button
            type="button"
            class="inline-flex items-center gap-2 rounded-lg bg-white/[0.06] px-3 py-1.5 text-xs font-medium text-content-secondary ring-1 ring-white/[0.06] transition-colors hover:bg-white/[0.10] hover:text-content-primary"
            :aria-label="`复制 ${booster.title} 的交付物`"
            @click="copy(copyKey('deliverables'), joinBullets(booster.deliverables))"
          >
            <Copy class="h-4 w-4" aria-hidden="true" />
            {{ copyLabel(copyKey("deliverables"), "复制") }}
          </button>
        </div>
        <ul class="mt-3 space-y-1.5 text-sm text-content-secondary">
          <li v-for="(t, i) in booster.deliverables" :key="i" class="flex items-start gap-2">
            <Check class="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" aria-hidden="true" />
            <span class="min-w-0">{{ t }}</span>
          </li>
        </ul>
      </div>

      <div class="rounded-lg bg-black/20 p-3 ring-1 ring-white/[0.06]">
        <div class="flex items-center justify-between gap-2">
          <div class="text-xs font-semibold text-content-muted">简历写法</div>
          <button
            type="button"
            class="inline-flex items-center gap-2 rounded-lg bg-white/[0.06] px-3 py-1.5 text-xs font-medium text-content-secondary ring-1 ring-white/[0.06] transition-colors hover:bg-white/[0.10] hover:text-content-primary"
            :aria-label="`复制 ${booster.title} 的简历写法`"
            @click="copy(copyKey('resume'), joinBullets(booster.resumeBullets))"
          >
            <Copy class="h-4 w-4" aria-hidden="true" />
            {{ copyLabel(copyKey("resume"), "复制") }}
          </button>
        </div>
        <ul class="mt-3 space-y-2 text-sm text-content-secondary">
          <li
            v-for="(t, i) in booster.resumeBullets"
            :key="i"
            class="rounded-md border-l-2 border-accent/40 bg-white/[0.04] px-3 py-2 ring-1 ring-white/[0.06]"
          >
            {{ t }}
          </li>
        </ul>
      </div>
    </div>

    <!-- Mobile: 顶部分段按钮 -->
    <div class="space-y-3 md:hidden">
      <div class="inline-flex w-full rounded-lg bg-card/60 p-1 ring-1 ring-white/[0.06]">
        <button
          type="button"
          class="flex-1 rounded-md px-3 py-1 text-xs font-medium transition-all"
          :class="tab === 'deliverables' ? 'bg-accent/80 text-white shadow-sm' : 'text-content-secondary hover:text-content-primary'"
          @click="tab = 'deliverables'"
        >
          交付物
        </button>
        <button
          type="button"
          class="flex-1 rounded-md px-3 py-1 text-xs font-medium transition-all"
          :class="tab === 'resume' ? 'bg-accent/80 text-white shadow-sm' : 'text-content-secondary hover:text-content-primary'"
          @click="tab = 'resume'"
        >
          简历写法
        </button>
      </div>

      <div v-if="tab === 'deliverables'" class="rounded-lg bg-black/20 p-3 ring-1 ring-white/[0.06]">
        <div class="flex items-center justify-between gap-2">
          <div class="text-xs font-semibold text-content-muted">交付物</div>
          <button
            type="button"
            class="inline-flex items-center gap-2 rounded-lg bg-white/[0.06] px-3 py-1.5 text-xs font-medium text-content-secondary ring-1 ring-white/[0.06] transition-colors hover:bg-white/[0.10] hover:text-content-primary"
            :aria-label="`复制 ${booster.title} 的交付物`"
            @click="copy(copyKey('deliverables'), joinBullets(booster.deliverables))"
          >
            <Copy class="h-4 w-4" aria-hidden="true" />
            {{ copyLabel(copyKey("deliverables"), "复制") }}
          </button>
        </div>
        <ul class="mt-3 space-y-1.5 text-sm text-content-secondary">
          <li v-for="(t, i) in booster.deliverables" :key="i" class="flex items-start gap-2">
            <Check class="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" aria-hidden="true" />
            <span class="min-w-0">{{ t }}</span>
          </li>
        </ul>
      </div>

      <div v-else class="rounded-lg bg-black/20 p-3 ring-1 ring-white/[0.06]">
        <div class="flex items-center justify-between gap-2">
          <div class="text-xs font-semibold text-content-muted">简历写法</div>
          <button
            type="button"
            class="inline-flex items-center gap-2 rounded-lg bg-white/[0.06] px-3 py-1.5 text-xs font-medium text-content-secondary ring-1 ring-white/[0.06] transition-colors hover:bg-white/[0.10] hover:text-content-primary"
            :aria-label="`复制 ${booster.title} 的简历写法`"
            @click="copy(copyKey('resume'), joinBullets(booster.resumeBullets))"
          >
            <Copy class="h-4 w-4" aria-hidden="true" />
            {{ copyLabel(copyKey("resume"), "复制") }}
          </button>
        </div>
        <ul class="mt-3 space-y-2 text-sm text-content-secondary">
          <li
            v-for="(t, i) in booster.resumeBullets"
            :key="i"
            class="rounded-md border-l-2 border-accent/40 bg-white/[0.04] px-3 py-2 ring-1 ring-white/[0.06]"
          >
            {{ t }}
          </li>
        </ul>
      </div>
    </div>
  </article>
</template>

<style scoped>
.booster-clamp-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  white-space: normal;
}
</style>

