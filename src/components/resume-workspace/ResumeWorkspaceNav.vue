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
  <aside class="resume-workflow-rail">
    <div class="px-1 pb-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">审阅流程</div>
    <div class="space-y-1">
      <div v-for="(item, index) in items" :key="item.key" class="relative">
        <div v-if="index < items.length - 1" class="absolute left-[1.35rem] top-12 h-[calc(100%-2rem)] w-px bg-white/10" />
        <button
          type="button"
          class="resume-workflow-item"
          :class="item.key === currentStep ? 'border border-cyan-300/10 bg-slate-900/60 shadow-[0_18px_44px_-34px_rgba(15,23,42,0.9)]' : 'hover:bg-slate-900/38'"
          @click="emit('select', item.key)"
        >
          <span
            class="resume-workflow-index"
            :class="item.status === 'done'
              ? 'border-emerald-300/25 bg-emerald-400/10 text-emerald-100'
              : item.status === 'active'
                ? 'border-cyan-300/32 bg-cyan-300/10 text-cyan-100'
                : 'border-white/8 bg-slate-900/45 text-slate-300'"
          >
            {{ String(index + 1).padStart(2, "0") }}
          </span>

          <span class="min-w-0 flex-1">
            <span class="block truncate text-sm font-medium" :class="item.key === currentStep ? 'text-slate-50' : 'text-slate-200'">{{ item.label }}</span>
            <span class="mt-1 block text-xs text-slate-400">
              {{ item.status === "done" ? "已完成" : item.status === "active" ? "当前步骤" : "待处理" }}
            </span>
          </span>

          <span
            class="resume-workflow-tag"
            :class="item.status === 'done'
              ? 'bg-emerald-400/10 text-emerald-100'
              : item.status === 'active'
                ? 'bg-cyan-300/10 text-cyan-100'
                : 'bg-slate-900/55 text-slate-400'"
          >
            {{ item.status === "done" ? "已完成" : item.status === "active" ? "进行中" : "待处理" }}
          </span>
        </button>
      </div>
    </div>
  </aside>
</template>
