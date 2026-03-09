<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";
import { ChevronLeft, ChevronRight, RefreshCw, Trash2, X } from "lucide-vue-next";

import type { AiReportMeta, KindFilter } from "../../lib/aiReportsMeta.ts";

const open = defineModel<boolean>("open", { required: true });
const query = defineModel<string>("query", { default: "" });
const kind = defineModel<KindFilter>("kind", { default: "all" });

const props = defineProps<{
  loading: boolean;
  reports: AiReportMeta[];
  selectedId: number | null;
  page: number;
  hasMore: boolean;
}>();

const emit = defineEmits<{
  (e: "select", meta: AiReportMeta): void;
  (e: "refresh"): void;
  (e: "clear"): void;
  (e: "prev"): void;
  (e: "next"): void;
}>();

const queryEl = ref<HTMLInputElement | null>(null);
let restoreOverflow: (() => void) | null = null;

const filteredReports = computed(() => {
  const q = query.value.trim().toLowerCase();
  return props.reports.filter((r) => {
    if (kind.value !== "all" && r.kind !== kind.value) return false;
    if (!q) return true;
    const hay = `${r.title} ${r.encrypt_job_id}`.toLowerCase();
    return hay.includes(q);
  });
});

function lockScroll(): void {
  const targets: Array<{ el: HTMLElement; overflow: string }> = [];

  const root = document.documentElement;
  targets.push({ el: root, overflow: root.style.overflow });
  root.style.overflow = "hidden";

  const main = document.querySelector("main");
  if (main instanceof HTMLElement) {
    targets.push({ el: main, overflow: main.style.overflow });
    main.style.overflow = "hidden";
  }

  restoreOverflow = () => {
    for (const t of targets) {
      t.el.style.overflow = t.overflow;
    }
  };
}

function unlockScroll(): void {
  if (!restoreOverflow) return;
  restoreOverflow();
  restoreOverflow = null;
}

function closeDrawer(): void {
  open.value = false;
}

function onKeydown(e: KeyboardEvent): void {
  if (!open.value) return;
  if (e.key === "Escape") closeDrawer();
}

async function focusQuery(): Promise<void> {
  await nextTick();
  queryEl.value?.focus();
}

function selectReport(meta: AiReportMeta): void {
  closeDrawer();
  emit("select", meta);
}

watch(open, async (isOpen) => {
  if (isOpen) {
    lockScroll();
    window.addEventListener("keydown", onKeydown);
    await focusQuery();
    return;
  }
  unlockScroll();
  window.removeEventListener("keydown", onKeydown);
});

onBeforeUnmount(() => {
  unlockScroll();
  window.removeEventListener("keydown", onKeydown);
});
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-50" :class="open ? '' : 'pointer-events-none'">
      <div
        class="absolute inset-0 bg-black/45 backdrop-blur-sm transition-opacity duration-200 motion-reduce:transition-none"
        :class="open ? 'opacity-100' : 'opacity-0'"
        @click="closeDrawer"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="选择报告"
        class="absolute inset-y-0 right-0 flex w-full flex-col bg-surface-elevated/92 ring-1 ring-border/10 backdrop-blur-xl transition-transform duration-200 motion-reduce:transition-none sm:w-[400px]"
        :class="open ? 'translate-x-0' : 'translate-x-full'"
        @click.stop
      >
        <header class="flex items-center justify-between gap-2 border-b border-border/10 px-4 py-3">
          <div class="min-w-0">
            <div class="truncate text-sm font-semibold text-content-primary">选择报告</div>
            <div class="mt-0.5 text-xs text-content-muted">
              第 {{ page }} 页 · {{ filteredReports.length }} 条
            </div>
          </div>
          <div class="flex items-center gap-2">
            <button
              type="button"
              class="ui-btn-secondary inline-flex items-center gap-2 px-3 py-1.5 text-xs"
              :disabled="loading"
              @click="emit('refresh')"
            >
              <RefreshCw class="h-4 w-4" aria-hidden="true" />
              {{ loading ? "刷新中…" : "刷新" }}
            </button>
            <button
              type="button"
              class="ui-icon-btn text-accent-danger hover:bg-red-500/10 hover:text-accent-danger"
              :disabled="loading || reports.length === 0"
              :title="reports.length === 0 ? '暂无可清空的报告' : '清空全部报告'"
              aria-label="清空全部报告"
              @click="emit('clear')"
            >
              <Trash2 class="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              class="ui-icon-btn"
              aria-label="关闭"
              @click="closeDrawer"
            >
              <X class="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </header>

        <div class="space-y-2.5 p-4">
          <input
            ref="queryEl"
            v-model="query"
            class="ui-input w-full"
            placeholder="搜索：标题 / encrypt_job_id"
          />

          <div class="inline-flex w-full rounded-xl bg-card/80 p-1 ring-1 ring-border/10">
            <button
              class="flex-1 rounded-md px-3 py-1 text-xs font-medium transition-all"
              :class="kind === 'all' ? 'bg-accent/90 text-white shadow-sm' : 'text-content-secondary hover:bg-card-hover/60 hover:text-content-primary'"
              @click="kind = 'all'"
            >
              全部
            </button>
            <button
              class="flex-1 rounded-md px-3 py-1 text-xs font-medium transition-all"
              :class="kind === 'group' ? 'bg-accent/90 text-white shadow-sm' : 'text-content-secondary hover:bg-card-hover/60 hover:text-content-primary'"
              @click="kind = 'group'"
            >
              综合
            </button>
            <button
              class="flex-1 rounded-md px-3 py-1 text-xs font-medium transition-all"
              :class="kind === 'resume' ? 'bg-accent/90 text-white shadow-sm' : 'text-content-secondary hover:bg-card-hover/60 hover:text-content-primary'"
              @click="kind = 'resume'"
            >
              报告
            </button>
          </div>

          <div class="ui-toolbar flex items-center justify-between gap-2 px-3 py-2">
            <div class="text-xs text-content-muted">翻页</div>
            <div class="flex items-center gap-2">
              <button
                type="button"
                class="ui-btn-secondary inline-flex items-center gap-1 px-2.5 py-1.5 text-xs"
                :disabled="page <= 1 || loading"
                @click="emit('prev')"
              >
                <ChevronLeft class="h-4 w-4" aria-hidden="true" />
                上一页
              </button>
              <button
                type="button"
                class="ui-btn-secondary inline-flex items-center gap-1 px-2.5 py-1.5 text-xs"
                :disabled="!hasMore || loading"
                @click="emit('next')"
              >
                下一页
                <ChevronRight class="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>

        <div class="flex-1 space-y-2 overflow-auto px-4 pb-4">
          <div
            v-if="!loading && filteredReports.length === 0"
            class="ui-panel-muted p-4 text-sm text-content-muted"
          >
            暂无匹配的报告。
          </div>

          <button
            v-for="r in filteredReports"
            :key="r.id"
            type="button"
            class="w-full rounded-xl bg-card-alt/60 px-4 py-2.5 text-left ring-1 ring-border/10 transition-colors hover:bg-card-hover/65 focus:outline-none focus-visible:ring-4 focus-visible:ring-border-glow/10"
            :class="selectedId === r.id ? 'bg-card-hover/90 ring-border-glow/25' : ''"
            :aria-selected="selectedId === r.id"
            @click="selectReport(r)"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <div class="truncate text-sm font-semibold text-content-primary">{{ r.title }}</div>
                <div class="mt-1 flex flex-wrap items-center gap-2 text-xs text-content-muted">
                  <span class="ui-badge">
                    {{ r.kind === "group" ? "综合" : "报告" }}
                  </span>
                  <span v-if="r.jobs_count" class="ui-badge">
                    {{ r.jobs_count }} 个职位
                  </span>
                  <span class="truncate">{{ new Date(r.created_at).toLocaleString() }}</span>
                </div>
                <div class="mt-1 truncate text-[11px] text-content-muted opacity-80">{{ r.encrypt_job_id }}</div>
              </div>
              <div
                v-if="typeof r.match_score === 'number'"
                class="ui-badge shrink-0 px-2.5 py-1 tabular-nums"
              >
                {{ Math.round(r.match_score) }}
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
