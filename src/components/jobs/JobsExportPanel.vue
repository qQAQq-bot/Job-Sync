<script setup lang="ts">
import { computed, ref } from "vue";
import { AlertTriangle, CheckCircle2, Copy, Download, FileJson2, FileSpreadsheet, Loader2 } from "lucide-vue-next";

import { invoke, isTauri } from "../../lib/tauri.ts";
import { useCopy } from "../../lib/useCopy.ts";

type ExportFormat = "csv" | "json";

const tauri = isTauri();
const loading = ref(false);
const loadingFormat = ref<ExportFormat | null>(null);
const lastFormat = ref<ExportFormat | null>(null);
const lastPath = ref<string | null>(null);
const error = ref<string | null>(null);

const { copy, copyLabel } = useCopy();

const canExport = computed(() => tauri && !loading.value);

function formatLabel(format: ExportFormat): string {
  return format === "csv" ? "CSV" : "JSON";
}

async function runExport(format: ExportFormat): Promise<void> {
  if (!tauri) return;
  if (loading.value) return;

  error.value = null;
  loading.value = true;
  loadingFormat.value = format;

  try {
    const cmd = format === "csv" ? "export_jobs_csv" : "export_jobs_json";
    const path = await invoke<string>(cmd);
    lastPath.value = path;
    lastFormat.value = format;
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e);
  } finally {
    loading.value = false;
    loadingFormat.value = null;
  }
}

async function copyExportPath(): Promise<void> {
  if (!lastPath.value) return;
  await copy("export_path", lastPath.value);
}
</script>

<template>
  <section id="jobs-export" class="ui-panel p-4">
    <header class="flex flex-wrap items-start justify-between gap-3">
      <div class="flex items-start gap-2">
        <div
          class="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-border-glow/10 ring-1 ring-border-glow/15"
          aria-hidden="true"
        >
          <Download class="h-4 w-4 text-accent" />
        </div>
        <div class="min-w-0">
          <div class="text-sm font-semibold text-content-primary">导出职位库</div>
          <div class="mt-0.5 text-xs text-content-muted">生成 CSV / JSON 文件（本地）</div>
        </div>
      </div>

      <span
        v-if="!tauri"
        class="rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-400 ring-1 ring-amber-500/20"
      >
        浏览器模式不可用
      </span>
      <span
        v-else
        class="ui-badge"
      >
        Tauri
      </span>
    </header>

    <div class="mt-4 grid gap-3 sm:grid-cols-2">
      <button
        type="button"
        class="group relative overflow-hidden rounded-2xl bg-card-alt/65 p-4 text-left ring-1 ring-border/10 transition-colors hover:bg-card-hover/70 focus:outline-none focus-visible:ring-4 focus-visible:ring-border-glow/10 disabled:cursor-not-allowed disabled:opacity-60"
        :disabled="!canExport"
        @click="runExport('csv')"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="flex min-w-0 items-start gap-3">
            <div
              class="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/20"
              aria-hidden="true"
            >
              <FileSpreadsheet class="h-4 w-4" />
            </div>
            <div class="min-w-0">
              <div class="flex items-center gap-2">
                <div class="text-sm font-semibold text-content-primary">CSV（表格）</div>
                <span class="ui-badge">
                  推荐
                </span>
              </div>
              <div class="mt-1 text-xs leading-relaxed text-content-muted">
                适合 Excel / 表格工具查看、筛选、统计分析。
              </div>
            </div>
          </div>

          <div class="flex shrink-0 items-center gap-2 pt-0.5">
            <span
              v-if="loading && loadingFormat === 'csv'"
              class="ui-badge h-8 w-8 justify-center px-0"
              aria-label="导出中"
            >
              <Loader2 class="h-4 w-4 animate-spin text-content-secondary" aria-hidden="true" />
            </span>
            <span
              v-else
              class="ui-badge h-8 px-3 group-hover:bg-card-hover/80 group-hover:text-content-primary"
            >
              导出
            </span>
          </div>
        </div>
      </button>

      <button
        type="button"
        class="group relative overflow-hidden rounded-2xl bg-card-alt/65 p-4 text-left ring-1 ring-border/10 transition-colors hover:bg-card-hover/70 focus:outline-none focus-visible:ring-4 focus-visible:ring-border-glow/10 disabled:cursor-not-allowed disabled:opacity-60"
        :disabled="!canExport"
        @click="runExport('json')"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="flex min-w-0 items-start gap-3">
            <div
              class="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-300 ring-1 ring-violet-500/20"
              aria-hidden="true"
            >
              <FileJson2 class="h-4 w-4" />
            </div>
            <div class="min-w-0">
              <div class="text-sm font-semibold text-content-primary">JSON（原始）</div>
              <div class="mt-1 text-xs leading-relaxed text-content-muted">
                适合脚本处理、做备份、做二次同步。
              </div>
            </div>
          </div>

          <div class="flex shrink-0 items-center gap-2 pt-0.5">
            <span
              v-if="loading && loadingFormat === 'json'"
              class="ui-badge h-8 w-8 justify-center px-0"
              aria-label="导出中"
            >
              <Loader2 class="h-4 w-4 animate-spin text-content-secondary" aria-hidden="true" />
            </span>
            <span
              v-else
              class="ui-badge h-8 px-3 group-hover:bg-card-hover/80 group-hover:text-content-primary"
            >
              导出
            </span>
          </div>
        </div>
      </button>
    </div>

    <div
      v-if="lastPath"
      class="ui-status-success mt-4 p-3"
    >
      <div class="flex flex-wrap items-start justify-between gap-2">
        <div class="flex items-center gap-2 text-xs font-semibold text-accent-success">
          <CheckCircle2 class="h-4 w-4" aria-hidden="true" />
          <span>已导出 {{ lastFormat ? formatLabel(lastFormat) : "" }}</span>
        </div>
        <button
          type="button"
          class="ui-btn-secondary px-3 py-1.5 text-xs"
          @click="copyExportPath"
        >
          <Copy class="h-4 w-4" aria-hidden="true" />
          {{ copyLabel("export_path", "复制路径") }}
        </button>
      </div>
      <div class="mt-2 break-all font-mono text-xs text-content-secondary">{{ lastPath }}</div>
    </div>

    <div
      v-if="error"
      class="ui-status-danger mt-4 p-3 text-sm"
      role="alert"
    >
      <div class="flex items-start gap-2">
        <AlertTriangle class="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <div class="min-w-0">
          <div class="text-xs font-semibold">导出失败</div>
          <div class="mt-1 break-words text-xs text-content-secondary">{{ error }}</div>
        </div>
      </div>
    </div>
  </section>
</template>
