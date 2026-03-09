<script setup lang="ts">
import { open } from "@tauri-apps/plugin-dialog";

const props = defineProps<{
  tauri: boolean;
}>();

const contextText = defineModel<string>("contextText", { default: "" });
const resumeMode = defineModel<"text" | "file">("resumeMode", { default: "text" });
const resumeText = defineModel<string>("resumeText", { default: "" });
const resumeFilePath = defineModel<string>("resumeFilePath", { default: "" });

function switchResumeMode(newMode: "text" | "file"): void {
  if (resumeMode.value === newMode) return;
  if (newMode === "text") {
    resumeFilePath.value = "";
  } else {
    resumeText.value = "";
  }
  resumeMode.value = newMode;
}

async function pickPdfFile(): Promise<void> {
  if (!props.tauri) return;
  const selected = await open({
    title: "选择 PDF 简历",
    filters: [{ name: "PDF", extensions: ["pdf"] }],
  });
  if (typeof selected === "string") {
    resumeFilePath.value = selected;
  }
}
</script>

<template>
  <div class="space-y-5">
    <label class="block space-y-1">
      <div class="text-xs font-medium text-content-muted">当前情况说明（可选）</div>
      <textarea
        v-model="contextText"
        class="ui-textarea h-20 w-full"
        placeholder="例如：在职/离职、期望城市与薪资、当前技能栈、想转型方向、面试时间窗口、是否接受加班/出差…"
      />
    </label>

    <div class="space-y-3 rounded-2xl bg-card-alt/55 p-4 ring-1 ring-border/10">
      <div class="flex items-center gap-3">
        <div class="text-xs font-medium text-content-muted">简历输入</div>
        <div class="inline-flex rounded-xl bg-card/80 p-1 ring-1 ring-border/10">
          <button
            class="rounded-md px-3 py-1 text-xs font-medium transition-all"
            :class="
              resumeMode === 'text'
                ? 'bg-accent/90 text-white shadow-sm'
                : 'text-content-secondary hover:bg-card-hover/60 hover:text-content-primary'
            "
            @click="switchResumeMode('text')"
          >
            粘贴文本
          </button>
          <button
            class="rounded-md px-3 py-1 text-xs font-medium transition-all"
            :class="
              resumeMode === 'file'
                ? 'bg-accent/90 text-white shadow-sm'
                : 'text-content-secondary hover:bg-card-hover/60 hover:text-content-primary'
            "
            @click="switchResumeMode('file')"
          >
            选择文件
          </button>
        </div>
      </div>

      <div v-if="resumeMode === 'text'">
        <textarea
          v-model="resumeText"
          class="ui-textarea h-36 w-full"
          placeholder="粘贴简历（txt / md）"
        />
      </div>

      <div v-if="resumeMode === 'file'" class="space-y-2">
        <button
          class="ui-btn-secondary"
          :disabled="!tauri"
          @click="pickPdfFile"
        >
          选择 PDF 文件
        </button>
        <div v-if="resumeFilePath" class="ui-panel-muted flex items-center gap-2 px-3 py-2">
          <svg class="h-4 w-4 shrink-0 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
          <span class="truncate text-sm text-content-primary">{{ resumeFilePath }}</span>
          <button
            class="ml-auto shrink-0 text-xs text-content-muted transition-colors hover:text-accent-danger"
            @click="resumeFilePath = ''"
          >
            移除
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
