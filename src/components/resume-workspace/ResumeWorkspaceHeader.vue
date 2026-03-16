<script setup lang="ts">
import UiSelect from "../ui/UiSelect.vue";
import type { ResumeWorkspaceMeta } from "../../lib/resumeWorkspace";

defineProps<{
  currentStepLabel: string;
  currentStepHint: string;
  workflowProgressCount: number;
  workflowProgressTotal: number;
  moduleConfirmedCount: number;
  moduleConfirmedTotal: number;
  activeWorkspaceId: string;
  activeWorkspaceTitle: string;
  activeWorkspaceUpdatedAt: string;
  activeWorkspaceSummary: string;
  workspaces: ResumeWorkspaceMeta[];
}>();

const emit = defineEmits<{
  (e: "switchWorkspace", workspaceId: string): void;
  (e: "createWorkspace"): void;
  (e: "renameWorkspace"): void;
  (e: "deleteWorkspace"): void;
}>();
</script>

<template>
  <header class="resume-review-header">
    <div class="space-y-3">
      <div class="resume-review-kicker">简历审阅台</div>
      <div>
        <h1 class="resume-review-title">简历工作区</h1>
        <p class="resume-review-subtitle">导入原始简历，先做 AI 诊断，再逐模块生成候选改写并确认最终稿。</p>
      </div>
    </div>

    <div class="resume-review-meta">
      <div class="resume-review-stat sm:col-span-2 xl:col-span-4">
        <div class="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div class="space-y-2">
            <div class="resume-review-stat-label">当前工作区</div>
            <div class="text-lg font-semibold tracking-[-0.02em] text-content-primary">{{ activeWorkspaceTitle }}</div>
            <div class="text-sm text-content-secondary">{{ activeWorkspaceSummary }}</div>
            <div class="text-xs text-content-muted">最近更新：{{ activeWorkspaceUpdatedAt }}</div>
          </div>

          <div class="flex flex-col gap-3 xl:w-[360px]">
            <UiSelect
              class="w-full"
              variant="workspace"
              :model-value="activeWorkspaceId"
              @update:model-value="emit('switchWorkspace', $event)"
            >
              <option v-for="workspace in workspaces" :key="workspace.id" :value="workspace.id">
                {{ workspace.title }}
              </option>
            </UiSelect>

            <div class="flex flex-wrap gap-2">
              <button type="button" class="ui-btn-secondary px-3 py-2 text-xs" @click="emit('createWorkspace')">新建工作区</button>
              <button type="button" class="ui-btn-secondary px-3 py-2 text-xs" @click="emit('renameWorkspace')">重命名</button>
              <button type="button" class="ui-btn-secondary px-3 py-2 text-xs" @click="emit('deleteWorkspace')">删除</button>
            </div>
          </div>
        </div>
      </div>

      <div class="resume-review-stat">
        <div class="resume-review-stat-label">当前阶段</div>
        <div class="resume-review-stat-value">{{ currentStepLabel }}</div>
      </div>
      <div class="resume-review-stat">
        <div class="resume-review-stat-label">流程进度</div>
        <div class="resume-review-stat-value">{{ workflowProgressCount }}/{{ workflowProgressTotal }}</div>
      </div>
      <div class="resume-review-stat">
        <div class="resume-review-stat-label">模块确认</div>
        <div class="resume-review-stat-value">{{ moduleConfirmedCount }}/{{ moduleConfirmedTotal }}</div>
      </div>
      <div class="resume-review-stat">
        <div class="resume-review-stat-label">任务提示</div>
        <div class="mt-1 text-sm leading-6 text-content-secondary">{{ currentStepHint }}</div>
      </div>
    </div>
  </header>
</template>
