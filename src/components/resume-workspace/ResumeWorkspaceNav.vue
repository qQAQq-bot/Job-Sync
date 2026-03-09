<script setup lang="ts">
import type { ResumeWorkspaceNavItem, ResumeWorkspaceStepKey } from "../../lib/resumeWorkspace";

defineProps<{
  items: ResumeWorkspaceNavItem[];
  currentStep: ResumeWorkspaceStepKey;
}>();

const emit = defineEmits<{
  (e: "select", step: ResumeWorkspaceStepKey): void;
}>();
</script>

<template>
  <aside class="ui-panel-muted p-3">
    <div class="px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-content-muted">工作流</div>
    <div class="space-y-1">
      <button
        v-for="item in items"
        :key="item.key"
        type="button"
        class="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors duration-150"
        :class="item.key === currentStep ? 'bg-card-hover/80 text-content-primary ring-1 ring-border-glow/20' : 'text-content-secondary hover:bg-card-hover/60 hover:text-content-primary'"
        @click="emit('select', item.key)"
      >
        <span class="truncate">{{ item.label }}</span>
        <span
          class="ui-badge px-2 py-0.5"
          :class="item.status === 'done' ? 'bg-emerald-400/10 text-emerald-300 ring-emerald-400/20' : item.status === 'active' ? 'bg-border-glow/10 text-cyan-300 ring-border-glow/20' : ''"
        >
          {{ item.status === "done" ? "已完成" : item.status === "active" ? "当前" : "待处理" }}
        </span>
      </button>
    </div>
  </aside>
</template>
