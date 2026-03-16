<script setup lang="ts">
import { ChevronDown } from "lucide-vue-next";
import { computed, ref, watch } from "vue";

import type { ResumeDiagnosisSection, ResumeModuleKey, ResumeWorkspaceModuleDraft } from "../../lib/resumeWorkspace";

const emit = defineEmits<{
  (e: "update:input", value: string): void;
  (e: "update:followupInput", value: string): void;
  (e: "generate"): void;
}>();

const props = defineProps<{
  moduleKey: ResumeModuleKey;
  label: string;
  placeholder: string;
  moduleDraft: ResumeWorkspaceModuleDraft;
  diagnosis?: ResumeDiagnosisSection | null;
  busy: boolean;
  canGenerate: boolean;
}>();

const activeTab = ref<"input" | "followup">("input");
const diagnosisOpen = ref(false);

const prefersFollowup = computed(
  () =>
    !!props.moduleDraft.candidate?.trim() ||
    props.moduleDraft.notes.length > 0 ||
    props.moduleDraft.checklist.length > 0,
);

watch(
  () => [props.moduleKey, prefersFollowup.value] as const,
  ([, shouldUseFollowup]) => {
    activeTab.value = shouldUseFollowup ? "followup" : "input";
    diagnosisOpen.value = false;
  },
  { immediate: true },
);
</script>

<template>
  <section class="space-y-5">
    <div class="resume-paper-panel">
      <div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div class="max-w-2xl">
          <div class="resume-paper-title">模块审阅</div>
          <div class="resume-paper-heading">{{ label }}</div>
          <p v-if="props.diagnosis?.assessment && diagnosisOpen" class="mt-3 resume-paper-copy whitespace-pre-wrap">
            {{ props.diagnosis.assessment }}
          </p>
        </div>
        <span class="resume-paper-chip">
          {{ props.moduleDraft.confirmed ? "已确认" : props.canGenerate ? "可生成候选稿" : "待补充内容" }}
        </span>
      </div>

      <button
        v-if="props.diagnosis"
        type="button"
        class="mt-5 flex w-full items-center justify-between rounded-2xl bg-card-hover/40 px-4 py-3 text-left text-sm text-content-secondary transition-colors duration-150 hover:bg-card-hover/70"
        @click="diagnosisOpen = !diagnosisOpen"
      >
        <span class="font-medium text-content-primary">诊断提示</span>
        <span class="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-content-muted">
          {{ diagnosisOpen ? "收起" : "展开" }}
          <ChevronDown class="h-4 w-4 transition-transform duration-200" :class="diagnosisOpen ? 'rotate-180' : ''" />
        </span>
      </button>

      <div v-if="props.diagnosis?.missing_info?.length && diagnosisOpen" class="mt-4 resume-paper-annotation">
        <div class="resume-paper-label">建议补充的信息</div>
        <ul class="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-6 text-content-secondary">
          <li v-for="(item, index) in props.diagnosis.missing_info" :key="index">{{ item }}</li>
        </ul>
      </div>
    </div>

    <div class="resume-paper-panel-soft space-y-5">
      <div class="resume-paper-segmented">
        <button
          type="button"
          class="resume-paper-segment"
          :class="activeTab === 'input' ? 'resume-paper-segment--active' : ''"
          @click="activeTab = 'input'"
        >
          补充内容
        </button>
        <button
          type="button"
          class="resume-paper-segment"
          :class="activeTab === 'followup' ? 'resume-paper-segment--active' : ''"
          @click="activeTab = 'followup'"
        >
          补充回答
        </button>
      </div>

      <div v-if="activeTab === 'input'">
        <div class="resume-paper-label">补充内容</div>
        <textarea
          :value="props.moduleDraft.input"
          class="resume-paper-textarea mt-3 h-44"
          :placeholder="props.placeholder"
          @input="emit('update:input', ($event.target as HTMLTextAreaElement).value)"
        />
      </div>

      <div v-else>
        <div class="resume-paper-label">补充回答</div>
        <div class="mt-1 text-xs leading-6 text-content-muted">
          当右侧出现“待确认”问题后，请把补充说明统一写在这里，再点“生成候选稿 / 重新生成”。
        </div>
        <textarea
          :value="props.moduleDraft.followup_input"
          class="resume-paper-textarea mt-3 h-36"
          placeholder="例如：项目上线用户量、你负责的核心模块、具体指标、团队规模、技术难点等。"
          @input="emit('update:followupInput', ($event.target as HTMLTextAreaElement).value)"
        />
      </div>

      <div class="flex flex-wrap items-center gap-3">
        <button class="resume-paper-btn-primary" :disabled="props.busy || !props.canGenerate" @click="emit('generate')">
          {{ props.busy ? '生成中…' : '生成候选稿' }}
        </button>
        <span v-if="props.moduleDraft.confirmed" class="resume-paper-chip">已确认最终稿</span>
      </div>
    </div>
  </section>
</template>
