<script setup lang="ts">
import ResumeBasicProfileForm from "./ResumeBasicProfileForm.vue";
import type { ResumeBasicProfile } from "../../lib/resumeWorkspace";

defineProps<{
  sourceMode: "text" | "file";
  originalResumeText: string;
  originalResumeFile?: string | null;
  contextText: string;
  basicProfile: ResumeBasicProfile;
  diagnosing: boolean;
}>();

const emit = defineEmits<{
  (e: "update:sourceMode", value: "text" | "file"): void;
  (e: "update:originalResumeText", value: string): void;
  (e: "update:contextText", value: string): void;
  (e: "update:profileField", field: keyof ResumeBasicProfile, value: string): void;
  (e: "pickPdfFile"): void;
  (e: "saveDraft"): void;
  (e: "runDiagnosis"): void;
}>();
</script>

<template>
  <section class="space-y-5">
    <div class="resume-paper-panel">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div class="max-w-2xl">
          <div class="resume-paper-title">原始简历</div>
          <div class="resume-paper-heading">导入待审稿件</div>
          <p class="mt-3 resume-paper-copy">
            先录入原始简历与基础资料，再补充当前情况说明。AI 诊断会基于这份原稿生成审阅建议。
          </p>
        </div>
        <span class="resume-paper-chip">
          {{ sourceMode === "text" ? "文本稿源" : "PDF 稿源" }}
        </span>
      </div>

      <div class="resume-paper-segmented mt-5">
        <button
          type="button"
          class="resume-paper-segment"
          :class="sourceMode === 'text' ? 'resume-paper-segment--active' : ''"
          @click="emit('update:sourceMode', 'text')"
        >
          粘贴文本
        </button>
        <button
          type="button"
          class="resume-paper-segment"
          :class="sourceMode === 'file' ? 'resume-paper-segment--active' : ''"
          @click="emit('update:sourceMode', 'file')"
        >
          PDF 文件
        </button>
      </div>

      <textarea
        v-if="sourceMode === 'text'"
        :value="originalResumeText"
        class="resume-paper-textarea mt-5 h-72"
        placeholder="粘贴原始简历正文"
        @input="emit('update:originalResumeText', ($event.target as HTMLTextAreaElement).value)"
      />

      <div v-else class="mt-5 space-y-4">
        <button type="button" class="resume-paper-btn-secondary" @click="emit('pickPdfFile')">选择 PDF 文件</button>
        <div class="resume-paper-file-card">
          <div class="resume-paper-label">当前稿件</div>
          <div class="mt-2 text-sm leading-6 text-content-secondary">
            {{ originalResumeFile || "还没有选择 PDF 文件。" }}
          </div>
        </div>
      </div>
    </div>

    <ResumeBasicProfileForm
      :profile="basicProfile"
      @update:field="(field, value) => emit('update:profileField', field, value)"
    />

    <div class="resume-paper-panel-soft">
      <div class="max-w-2xl">
        <div class="resume-paper-title">审阅上下文</div>
        <div class="mt-2 text-lg font-semibold tracking-[-0.02em] text-content-primary">补充当前情况与目标方向</div>
        <p class="mt-2 resume-paper-copy">
          例如当前工作状态、目标岗位方向、需要重点突出的经历、希望回避的问题点等。
        </p>
      </div>

      <textarea
        :value="contextText"
        class="resume-paper-textarea mt-4 h-32"
        placeholder="例如：希望重点突出 B 端项目经验、正在转向 AI 产品方向、希望简历更偏结果导向。"
        @input="emit('update:contextText', ($event.target as HTMLTextAreaElement).value)"
      />

      <div class="mt-5 flex flex-wrap items-center gap-3">
        <button type="button" class="resume-paper-btn-secondary" @click="emit('saveDraft')">保存草稿</button>
        <button type="button" class="resume-paper-btn-primary" :disabled="diagnosing" @click="emit('runDiagnosis')">
          {{ diagnosing ? "诊断中…" : "开始 AI 诊断" }}
        </button>
      </div>
    </div>
  </section>
</template>
