<script setup lang="ts">
import type { LogLine } from "../../lib/runtime";

defineProps<{
  keyword?: string;
  currentPage?: number;
  capturedJobList: number;
  capturedJobDetail: number;
  logs: LogLine[];
  sidecarRunning: boolean;
  error?: string | null;
}>();

defineEmits<{
  (e: "clear-logs"): void;
}>();
</script>

<template>
  <div class="grid shrink-0 grid-cols-2 gap-3 lg:grid-cols-4">
    <div class="ui-crawl-stat p-4"><div class="text-xs font-medium text-content-muted">关键词</div><div class="mt-1 text-2xl font-semibold text-accent">{{ keyword ?? '-' }}</div></div>
    <div class="ui-crawl-stat p-4"><div class="text-xs font-medium text-content-muted">当前页</div><div class="mt-1 text-2xl font-semibold text-cyan-400">{{ currentPage ?? '-' }}</div></div>
    <div class="ui-crawl-stat p-4"><div class="text-xs font-medium text-content-muted">列表已采</div><div class="mt-1 text-2xl font-semibold text-emerald-400">{{ capturedJobList }}</div></div>
    <div class="ui-crawl-stat p-4"><div class="text-xs font-medium text-content-muted">详情已采</div><div class="mt-1 text-2xl font-semibold text-amber-400">{{ capturedJobDetail }}</div></div>
  </div>

  <div class="ui-log-panel">
    <div class="ui-log-panel-header">
      <div class="space-y-1">
        <div class="text-sm font-semibold text-content-primary">运行日志</div>
        <div class="text-xs text-content-muted">最近 500 条</div>
      </div>
      <div class="flex items-center gap-2">
        <span class="ui-badge" :class="sidecarRunning ? 'bg-emerald-400/10 text-emerald-300 ring-emerald-400/20' : ''">
          <span class="inline-block h-1.5 w-1.5 rounded-full" :class="sidecarRunning ? 'bg-emerald-400' : 'bg-content-muted/60'" />
          {{ sidecarRunning ? '运行中' : '空闲' }}
        </span>
        <button class="ui-btn-secondary px-3 py-1.5 text-xs" @click="$emit('clear-logs')">清空日志</button>
      </div>
    </div>
    <div class="ui-log-surface">
      <div v-for="(line, index) in logs" :key="index" class="ui-log-row">
        <span class="ui-log-time">{{ line.ts }}</span>
        <span class="mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full" :class="line.level === 'error' ? 'bg-rose-400' : 'bg-cyan-300/80'" />
        <span class="ui-log-message">{{ line.message }}</span>
      </div>
    </div>
  </div>

  <div v-if="error" class="ui-status-danger shrink-0 p-4 text-sm">{{ error }}</div>
</template>
