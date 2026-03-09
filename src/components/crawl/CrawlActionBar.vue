<script setup lang="ts">
defineProps<{
  tauri: boolean;
  actionBusy: boolean;
  sidecarRunning: boolean;
}>();

defineEmits<{
  (e: "start"): void;
  (e: "stop"): void;
}>();
</script>

<template>
  <div class="flex flex-wrap items-center gap-3 border-t border-border/10 pt-4">
    <div class="flex items-center gap-2">
      <span class="inline-block h-2 w-2 rounded-full" :class="sidecarRunning ? 'bg-emerald-400 animate-pulse' : 'bg-white/20'" />
      <span class="text-xs text-content-muted">{{ sidecarRunning ? '运行中' : '空闲' }}</span>
    </div>
    <button class="ui-btn-primary" :disabled="!tauri || actionBusy || sidecarRunning" @click="$emit('start')">{{ actionBusy ? '执行中…' : sidecarRunning ? '运行中' : '开始' }}</button>
    <button class="ui-btn-secondary" :disabled="!tauri || actionBusy || !sidecarRunning" @click="$emit('stop')">停止</button>
  </div>
</template>
