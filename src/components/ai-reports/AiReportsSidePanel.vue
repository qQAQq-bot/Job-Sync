<script setup lang="ts">
import { computed, ref } from "vue";
import { FileText, Layers, RefreshCw, Trash2 } from "lucide-vue-next";

import type { AiReportMeta, KindFilter } from "../../lib/aiReportsMeta.ts";

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

const groupedReports = computed(() => {
  if (kind.value !== "all") {
    return [
      {
        label: kind.value === "group" ? "综合" : "报告",
        items: props.reports,
      },
    ];
  }

  const group = props.reports.filter((r) => r.kind === "group");
  const resume = props.reports.filter((r) => r.kind === "resume");
  return [
    { label: "综合", items: group },
    { label: "报告", items: resume },
  ].filter((g) => g.items.length > 0);
});

function selectReport(meta: AiReportMeta): void {
  emit("select", meta);
}

function kindLabel(v: AiReportMeta["kind"]): string {
  return v === "group" ? "综合" : "报告";
}

function kindIcon(v: AiReportMeta["kind"]) {
  return v === "group" ? Layers : FileText;
}

function focusSearch(): void {
  queryEl.value?.focus();
}
</script>

<template>
  <aside class="ui-panel sticky top-4">
    <header class="flex items-center justify-between gap-2 border-b border-border/10 px-4 py-3">
      <div class="min-w-0">
        <div class="truncate text-sm font-semibold text-content-primary">报告列表</div>
        <div class="mt-0.5 text-xs text-content-muted">
          第 {{ page }} 页 · {{ reports.length }} 条
        </div>
      </div>
      <div class="flex items-center gap-2">
        <button
          type="button"
          class="ui-icon-btn h-9 w-9"
          :disabled="loading"
          :title="loading ? '刷新中…' : '刷新'"
          aria-label="刷新"
          @click="emit('refresh')"
        >
          <RefreshCw class="h-4 w-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          class="ui-icon-btn h-9 w-9 text-accent-danger hover:bg-red-500/10 hover:text-accent-danger"
          :disabled="loading || reports.length === 0"
          :title="reports.length === 0 ? '暂无可清空的报告' : '清空全部报告'"
          aria-label="清空全部报告"
          @click="emit('clear')"
        >
          <Trash2 class="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </header>

    <div class="space-y-3 p-4">
      <div class="space-y-2">
        <div class="flex items-center justify-between gap-2">
          <div class="text-[10px] font-semibold uppercase tracking-[0.24em] text-content-muted">筛选</div>
          <button type="button" class="text-xs text-content-muted transition-colors hover:text-content-primary" @click="focusSearch">
            聚焦
          </button>
        </div>
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
      </div>

      <div class="ui-toolbar flex items-center justify-between gap-2 px-3 py-2">
        <div class="text-xs text-content-muted">翻页</div>
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="ui-btn-secondary px-3 py-1.5 text-xs"
            :disabled="page <= 1 || loading"
            @click="emit('prev')"
          >
            上一页
          </button>
          <button
            type="button"
            class="ui-btn-secondary px-3 py-1.5 text-xs"
            :disabled="!hasMore || loading"
            @click="emit('next')"
          >
            下一页
          </button>
        </div>
      </div>
    </div>

    <div class="max-h-[60vh] space-y-4 overflow-auto px-4 pb-4">
      <div
        v-if="!loading && reports.length === 0"
        class="ui-panel-muted p-4 text-sm text-content-muted"
      >
        暂无匹配的报告。可尝试：
        <ul class="mt-2 list-disc space-y-1 pl-5 text-xs text-content-muted">
          <li>清空搜索关键词</li>
          <li>切换到「全部 / 综合 / 报告」</li>
          <li>翻到上一页或下一页</li>
        </ul>
      </div>

      <section v-for="g in groupedReports" :key="g.label" class="space-y-2">
        <div class="flex items-center justify-between gap-2">
          <div class="text-[10px] font-semibold uppercase tracking-[0.24em] text-content-muted">{{ g.label }}</div>
          <div class="text-[11px] text-content-muted">{{ g.items.length }} 条</div>
        </div>

        <button
          v-for="r in g.items"
          :key="r.id"
          type="button"
          class="group w-full rounded-2xl bg-card-alt/65 px-4 py-3 text-left ring-1 ring-border/10 transition-colors hover:bg-card-hover/70 focus:outline-none focus-visible:ring-4 focus-visible:ring-border-glow/10"
          :class="selectedId === r.id ? 'bg-card-hover/90 ring-border-glow/25' : ''"
          :aria-selected="selectedId === r.id"
          @click="selectReport(r)"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <div class="flex items-center gap-2">
                <component :is="kindIcon(r.kind)" class="h-4 w-4 shrink-0 text-content-muted" aria-hidden="true" />
                <div class="truncate text-sm font-semibold text-content-primary">{{ r.title }}</div>
              </div>
              <div class="mt-1 flex flex-wrap items-center gap-2 text-xs text-content-muted">
                <span class="ui-badge">
                  {{ kindLabel(r.kind) }}
                </span>
                <span v-if="r.jobs_count" class="ui-badge">
                  {{ r.jobs_count }} 个职位
                </span>
                <span class="truncate">{{ new Date(r.created_at).toLocaleString() }}</span>
              </div>
              <div
                class="mt-1 truncate text-xs text-content-muted opacity-0 transition-opacity group-hover:opacity-100"
                :class="selectedId === r.id ? '!opacity-100' : ''"
              >
                {{ r.encrypt_job_id }}
              </div>
            </div>
            <div
              v-if="typeof r.match_score === 'number'"
              class="ui-badge shrink-0 px-2.5 py-1 tabular-nums"
            >
              {{ Math.round(r.match_score) }}
            </div>
          </div>
        </button>
      </section>
    </div>
  </aside>
</template>
