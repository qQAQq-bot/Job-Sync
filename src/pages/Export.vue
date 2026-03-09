<script setup lang="ts">
import { ref } from "vue";

import { invoke, isTauri } from "../lib/tauri";

const tauri = isTauri();
const loading = ref(false);
const error = ref<string | null>(null);
const lastPath = ref<string | null>(null);

async function exportCsv(): Promise<void> {
  error.value = null;
  if (!tauri) return;
  loading.value = true;
  try {
    lastPath.value = await invoke<string>("export_jobs_csv");
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e);
  } finally {
    loading.value = false;
  }
}

async function exportJson(): Promise<void> {
  error.value = null;
  if (!tauri) return;
  loading.value = true;
  try {
    lastPath.value = await invoke<string>("export_jobs_json");
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e);
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <section class="space-y-5">
    <header class="space-y-1">
      <h1 class="text-xl font-semibold text-content-primary">导出</h1>
      <p class="text-sm text-content-secondary">导出本地职位库数据到 CSV / JSON。</p>
    </header>

    <div
      v-if="!tauri"
      class="rounded-lg bg-amber-500/10 p-4 text-sm text-amber-400 ring-1 ring-white/[0.06]"
    >
      当前是浏览器模式（非 Tauri）。导出命令不可用。
    </div>

    <div class="flex flex-wrap gap-2">
      <button
        class="rounded-lg bg-accent/80 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
        :disabled="!tauri || loading"
        @click="exportCsv"
      >
        导出 CSV
      </button>
      <button
        class="rounded-lg bg-white/[0.06] px-4 py-2 text-sm font-medium text-content-secondary ring-1 ring-white/[0.06] transition-colors hover:bg-white/[0.10] hover:text-content-primary disabled:cursor-not-allowed disabled:opacity-60"
        :disabled="!tauri || loading"
        @click="exportJson"
      >
        导出 JSON
      </button>
    </div>

    <div
      v-if="lastPath"
      class="rounded-lg bg-card-alt/50 p-4 text-sm text-content-secondary ring-1 ring-white/[0.06]"
    >
      已生成文件：<span class="font-mono text-content-primary">{{ lastPath }}</span>
    </div>

    <div
      v-if="error"
      class="rounded-lg bg-red-500/10 p-4 text-sm text-accent-danger ring-1 ring-white/[0.06]"
    >
      {{ error }}
    </div>
  </section>
</template>
