<script setup lang="ts">
import { onMounted } from "vue";
import { getCurrentWindow } from "@tauri-apps/api/window";

const appWindow = getCurrentWindow();

onMounted(() => {
  void appWindow.center().catch((err: unknown) => {
    console.warn("failed to center window", err);
  });
});

function minimize(): void {
  void appWindow.minimize();
}

function toggleMaximize(): void {
  void appWindow.toggleMaximize();
}

function close(): void {
  void appWindow.close();
}
</script>

<template>
  <div
    data-tauri-drag-region
    class="flex h-11 shrink-0 select-none items-center justify-between border-b border-border/10 bg-surface/95 px-4 backdrop-blur-xl"
  >
    <div data-tauri-drag-region class="flex min-w-0 items-center gap-3">
      <span class="inline-flex h-2.5 w-2.5 shrink-0 rounded-full bg-border-glow/80" />
      <span data-tauri-drag-region class="truncate text-xs font-semibold tracking-[0.24em] text-content-primary">
        JOB SYNC
      </span>
      <span class="rounded-full bg-white/[0.04] px-2 py-0.5 text-[10px] font-medium text-content-muted ring-1 ring-border/10">
        Desktop Workspace
      </span>
    </div>
    <div class="flex items-center gap-1">
      <button
        class="flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-content-muted transition-colors duration-200 hover:border-border/10 hover:bg-card-hover/75 hover:text-content-primary"
        @click="minimize"
      >
        <svg class="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
          <line x1="3" y1="8" x2="13" y2="8" />
        </svg>
      </button>
      <button
        class="flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-content-muted transition-colors duration-200 hover:border-border/10 hover:bg-card-hover/75 hover:text-content-primary"
        @click="toggleMaximize"
      >
        <svg class="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
          <rect x="3" y="3" width="10" height="10" rx="1" />
        </svg>
      </button>
      <button
        class="flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-content-muted transition-colors duration-200 hover:border-red-400/15 hover:bg-red-500/15 hover:text-red-200"
        @click="close"
      >
        <svg class="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
          <line x1="4" y1="4" x2="12" y2="12" />
          <line x1="12" y1="4" x2="4" y2="12" />
        </svg>
      </button>
    </div>
  </div>
</template>
