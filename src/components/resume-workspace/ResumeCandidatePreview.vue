<script setup lang="ts">
import { ChevronDown } from "lucide-vue-next";
import { ref, watch } from "vue";

import type { ResumeWorkspaceModuleDraft } from "../../lib/resumeWorkspace";

const props = defineProps<{
  label: string;
  moduleDraft: ResumeWorkspaceModuleDraft;
  busy: boolean;
  canGenerate: boolean;
}>();

const emit = defineEmits<{
  (e: "accept"): void;
  (e: "regenerate"): void;
}>();

const candidateOpen = ref(false);
const notesOpen = ref(false);
const checklistOpen = ref(false);

watch(
  () => [props.moduleDraft.candidate, props.moduleDraft.notes.length, props.moduleDraft.checklist.length] as const,
  () => {
    candidateOpen.value = false;
    notesOpen.value = false;
    checklistOpen.value = false;
  },
  { immediate: true },
);
</script>

<template>
  <section class="sticky top-6 space-y-4">
    <div class="resume-paper-aside">
      <div class="flex items-center justify-between gap-3">
        <div>
          <div class="resume-paper-title">候选改写</div>
          <div class="mt-2 text-xl font-semibold tracking-[-0.02em] text-content-primary">{{ label }}</div>
          <div class="mt-2 text-sm leading-6 text-content-muted">对照审阅 AI 候选稿，确认是否作为该模块的最终内容。</div>
        </div>
        <div class="flex items-center gap-2">
          <button class="resume-paper-btn-secondary px-3 py-2 text-xs" :disabled="busy || !canGenerate" @click="emit('regenerate')">
            {{ busy ? '生成中…' : '重新生成' }}
          </button>
          <button class="resume-paper-btn-primary px-3 py-2 text-xs" :disabled="!moduleDraft.candidate || busy" @click="emit('accept')">
            接受候选稿
          </button>
        </div>
      </div>

      <button
        type="button"
        class="mt-5 flex w-full items-center justify-between gap-3 rounded-2xl bg-card-hover/36 px-4 py-3 text-left"
        @click="candidateOpen = !candidateOpen"
      >
        <span class="font-medium text-content-primary">{{ props.moduleDraft.candidate ? "候选稿正文" : "候选稿状态" }}</span>
        <span class="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-content-muted">
          {{ candidateOpen ? "收起" : "展开" }}
          <ChevronDown class="h-4 w-4 transition-transform duration-200" :class="candidateOpen ? 'rotate-180' : ''" />
        </span>
      </button>

      <div v-if="props.moduleDraft.candidate && candidateOpen" class="resume-paper-document mt-4">
        {{ moduleDraft.candidate }}
      </div>
      <div v-else-if="candidateOpen" class="resume-paper-annotation mt-4">
        <div class="resume-paper-label">候选稿暂未生成</div>
        <div class="mt-2 text-sm leading-6 text-content-secondary">先在主稿区补充内容，再生成该模块的候选版本。</div>
      </div>

      <div v-if="props.moduleDraft.notes.length" class="mt-4">
        <button
          type="button"
          class="flex w-full items-center justify-between gap-3 rounded-2xl bg-card-hover/36 px-4 py-3 text-left"
          @click="notesOpen = !notesOpen"
        >
          <span class="font-medium text-content-primary">审阅说明</span>
          <span class="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-content-muted">
            {{ notesOpen ? "收起" : "展开" }}
            <ChevronDown class="h-4 w-4 transition-transform duration-200" :class="notesOpen ? 'rotate-180' : ''" />
          </span>
        </button>
        <ul v-if="notesOpen" class="mt-3 space-y-3">
          <li v-for="(item, index) in moduleDraft.notes" :key="index" class="resume-paper-annotation text-sm leading-6 text-content-secondary">{{ item }}</li>
        </ul>
      </div>

      <div v-if="props.moduleDraft.checklist.length" class="mt-4">
        <button
          type="button"
          class="flex w-full items-center justify-between gap-3 rounded-2xl bg-card-hover/36 px-4 py-3 text-left"
          @click="checklistOpen = !checklistOpen"
        >
          <span class="font-medium text-content-primary">待确认</span>
          <span class="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-content-muted">
            {{ checklistOpen ? "收起" : "展开" }}
            <ChevronDown class="h-4 w-4 transition-transform duration-200" :class="checklistOpen ? 'rotate-180' : ''" />
          </span>
        </button>
        <ul v-if="checklistOpen" class="mt-3 space-y-3">
          <li v-for="(item, index) in moduleDraft.checklist" :key="index" class="resume-paper-annotation text-sm leading-6 text-content-secondary">
            {{ item }}
          </li>
        </ul>
        <div v-if="checklistOpen" class="resume-paper-alert resume-paper-alert--warning mt-4">
          如果这些问题需要补充，请在左侧主稿区的「补充回答」里统一说明后，再重新生成。
        </div>
      </div>
    </div>
  </section>
</template>
