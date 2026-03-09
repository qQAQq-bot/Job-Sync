<script setup lang="ts">
import type { ResumeDiagnosisSection, ResumeModuleKey, ResumeWorkspaceModuleDraft } from "../../lib/resumeWorkspace";

defineProps<{
  moduleKey: ResumeModuleKey;
  label: string;
  placeholder: string;
  moduleDraft: ResumeWorkspaceModuleDraft;
  diagnosis?: ResumeDiagnosisSection | null;
  busy: boolean;
  canGenerate: boolean;
}>();

const emit = defineEmits<{
  (e: "update:input", value: string): void;
  (e: "update:followupInput", value: string): void;
  (e: "generate"): void;
}>();
</script>

<template>
  <section class="space-y-4">
    <div class="ui-panel p-4">
      <div class="text-xs font-semibold uppercase tracking-[0.24em] text-content-muted">{{ label }}</div>
      <div v-if="diagnosis?.assessment" class="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-content-secondary">
        {{ diagnosis.assessment }}
      </div>
      <div v-if="diagnosis?.missing_info?.length" class="mt-3">
        <div class="text-xs font-semibold text-content-muted">建议补充的信息</div>
        <ul class="mt-2 list-disc space-y-1 pl-5 text-sm text-content-secondary">
          <li v-for="(item, index) in diagnosis.missing_info" :key="index">{{ item }}</li>
        </ul>
      </div>
    </div>

    <div class="ui-panel-muted p-4 space-y-4">
      <div>
        <div class="text-xs font-semibold text-content-muted">补充内容</div>
        <textarea
          :value="moduleDraft.input"
          class="ui-textarea mt-3 h-44 w-full"
          :placeholder="placeholder"
          @input="emit('update:input', ($event.target as HTMLTextAreaElement).value)"
        />
      </div>

      <div>
        <div class="text-xs font-semibold text-content-muted">补充回答</div>
        <div class="mt-1 text-xs leading-relaxed text-content-muted">
          当右侧出现“待确认”问题后，请把补充说明统一写在这里，再点“生成候选稿 / 重新生成”。
        </div>
        <textarea
          :value="moduleDraft.followup_input"
          class="ui-textarea mt-3 h-36 w-full"
          placeholder="例如：项目上线用户量、你负责的核心模块、具体指标、团队规模、技术难点等。"
          @input="emit('update:followupInput', ($event.target as HTMLTextAreaElement).value)"
        />
      </div>

      <div class="flex items-center gap-3">
        <button class="ui-btn-primary" :disabled="busy || !canGenerate" @click="emit('generate')">
          {{ busy ? '生成中…' : '生成候选稿' }}
        </button>
        <span v-if="moduleDraft.confirmed" class="ui-badge bg-emerald-400/10 text-emerald-300 ring-emerald-400/20">已确认最终稿</span>
      </div>
    </div>
  </section>
</template>
