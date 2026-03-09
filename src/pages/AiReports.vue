<script setup lang="ts">
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-vue-next";

import AiGroupReportView from "../components/ai-reports/AiGroupReportViewSplit.vue";
import AiJsonPanel from "../components/ai-reports/AiJsonPanel.vue";
import AiReportsDrawer from "../components/ai-reports/AiReportsDrawer.vue";
import AiResumeReportView from "../components/ai-reports/AiResumeReportView.vue";
import AiScoreBadge from "../components/ai-reports/AiScoreBadge.vue";
import { useAiReportsPage } from "../lib/useAiReportsPage";

const {
  tauri,
  loading,
  error,
  reports,
  query,
  kind,
  drawerOpen,
  page,
  hasMore,
  selectedId,
  reportLoading,
  reportError,
  selectedRaw,
  selectedMeta,
  selectedGroup,
  selectedResume,
  drillBackMeta,
  prevMeta,
  nextMeta,
  formatTs,
  loadReportsPage,
  openDrawer,
  selectReport,
  openResumeReportForJob,
  drillBackToGroup,
  openPrev,
  openNext,
  clearReports,
} = useAiReportsPage();
</script>

<template>
  <section class="space-y-5">
    <header class="space-y-3">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div class="space-y-1">
          <h1 class="text-xl font-semibold text-content-primary">AI 报告</h1>
          <p class="text-sm text-content-secondary">查看已生成的综合报告与报告（来自本地缓存）。</p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <button
            class="ui-btn-primary"
            :disabled="!tauri"
            @click="openDrawer"
          >
            {{ selectedMeta ? "更换报告" : "选择报告" }}
          </button>

          <div class="ui-toolbar inline-flex items-center gap-1 p-1">
            <button
              type="button"
              class="ui-icon-btn h-9 w-9 bg-transparent ring-0 hover:bg-card-hover/60"
              :disabled="!prevMeta"
              title="上一条"
              aria-label="上一条"
              @click="openPrev"
            >
              <ChevronLeft class="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              class="ui-icon-btn h-9 w-9 bg-transparent ring-0 hover:bg-card-hover/60"
              :disabled="!nextMeta"
              title="下一条"
              aria-label="下一条"
              @click="openNext"
            >
              <ChevronRight class="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <button
            class="ui-btn-secondary"
            :disabled="!tauri || loading"
            @click="loadReportsPage(page)"
          >
            {{ loading ? "刷新中…" : "刷新" }}
          </button>
        </div>
      </div>
    </header>

    <div v-if="!tauri" class="ui-status-warning p-4 text-sm">
      当前是浏览器模式（非 Tauri）。AI 报告不可用。
    </div>

    <div v-if="error" class="ui-status-danger p-4 text-sm">
      <pre class="whitespace-pre-wrap">{{ error }}</pre>
    </div>

    <section class="min-w-0 space-y-4">
      <div class="text-[10px] font-semibold uppercase tracking-[0.24em] text-content-muted">当前报告</div>

      <div v-if="selectedMeta" class="ui-panel p-5">
        <div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div class="min-w-0 space-y-3">
            <div class="flex flex-wrap items-center gap-2 text-xs text-content-muted">
              <span class="ui-badge">
                {{ selectedMeta.kind === "group" ? "综合" : "报告" }}
              </span>
              <span v-if="selectedMeta.jobs_count" class="ui-badge">
                {{ selectedMeta.jobs_count }} 个职位
              </span>
              <span class="truncate">{{ formatTs(selectedMeta.created_at) }}</span>
            </div>

            <div class="truncate text-lg font-semibold text-content-primary">{{ selectedMeta.title }}</div>

            <div class="flex flex-wrap items-center gap-3 text-xs text-content-muted">
              <button
                v-if="drillBackMeta"
                type="button"
                class="ui-btn-secondary px-3 py-1.5 text-xs"
                @click="drillBackToGroup"
              >
                <ArrowLeft class="h-3.5 w-3.5" aria-hidden="true" />
                返回综合
              </button>
              <span class="truncate">{{ selectedMeta.encrypt_job_id }}</span>
            </div>
          </div>

          <AiScoreBadge
            v-if="typeof selectedMeta.match_score === 'number'"
            class="shrink-0 self-start"
            :score="selectedMeta.match_score"
          />
        </div>
      </div>

      <div v-else class="ui-panel p-6 text-sm text-content-secondary">
        还没有选中报告。点击顶部「选择报告」打开列表。
      </div>

      <div v-if="reportError" class="ui-status-danger p-4 text-sm">
        <pre class="whitespace-pre-wrap">{{ reportError }}</pre>
      </div>

      <div v-else-if="reportLoading" class="ui-panel p-4 text-sm text-content-secondary">
        正在加载报告内容…
      </div>

      <div v-else-if="selectedGroup">
        <AiGroupReportView
          :report="selectedGroup"
          :raw="selectedRaw"
          @open-resume-report="openResumeReportForJob"
        />
      </div>

      <div v-else-if="selectedResume">
        <AiResumeReportView :report="selectedResume" :raw="selectedRaw" />
      </div>

      <div v-else-if="selectedRaw" class="space-y-3">
        <div class="ui-status-warning p-4 text-sm text-amber-300">
          返回结构无法识别，已展示原始 JSON。
        </div>
        <AiJsonPanel :value="selectedRaw" />
      </div>
    </section>

    <AiReportsDrawer
      v-model:open="drawerOpen"
      v-model:query="query"
      v-model:kind="kind"
      :loading="loading"
      :reports="reports"
      :selected-id="selectedId"
      :page="page"
      :has-more="hasMore"
      @select="selectReport"
      @refresh="loadReportsPage(page)"
      @clear="clearReports"
      @prev="loadReportsPage(page - 1)"
      @next="loadReportsPage(page + 1)"
    />
  </section>
</template>
