<script setup lang="ts">
defineProps<{
  tauri: boolean;
  loginExists: boolean | null;
  loginLoading: boolean;
  sidecarRunning: boolean;
  loginStatus?: string;
  loginMessage?: string;
  loginError?: string | null;
}>();

defineEmits<{
  (e: "start-login"): void;
  (e: "refresh-login"): void;
}>();
</script>

<template>
  <div class="ui-crawl-panel shrink-0 p-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex items-center gap-2">
        <span class="inline-block h-2 w-2 rounded-full" :class="loginExists === true ? 'bg-emerald-400' : loginExists === false ? 'bg-red-400' : 'bg-white/20'" />
        <span class="text-sm font-medium text-content-primary">{{ loginExists === true ? '已登录' : loginExists === false ? '未登录' : '未知' }}</span>
        <span v-if="loginStatus" class="text-xs text-content-muted">({{ loginStatus }})</span>
      </div>
      <div class="flex items-center gap-2">
        <button class="ui-btn-primary px-3 py-1.5 text-xs" :disabled="!tauri || loginLoading || sidecarRunning" @click="$emit('start-login')">{{ loginLoading ? '打开中…' : '打开浏览器登录' }}</button>
        <button class="ui-btn-secondary px-3 py-1.5 text-xs" :disabled="!tauri" @click="$emit('refresh-login')">刷新状态</button>
      </div>
    </div>
    <div v-if="loginMessage" class="mt-2 text-xs text-content-muted">{{ loginMessage }}</div>
    <div v-if="loginError" class="mt-2 text-xs text-accent-danger">{{ loginError }}</div>
  </div>
</template>
