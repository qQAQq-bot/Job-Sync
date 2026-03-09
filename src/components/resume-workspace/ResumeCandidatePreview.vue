<script setup lang="ts">
import type { ResumeWorkspaceModuleDraft } from "../../lib/resumeWorkspace";

defineProps<{
  label: string;
  moduleDraft: ResumeWorkspaceModuleDraft;
  busy: boolean;
  canGenerate: boolean;
}>();

const emit = defineEmits<{
  (e: "accept"): void;
  (e: "regenerate"): void;
}>();
</script>

<template>
  <section class="space-y-4">
    <div class="ui-panel p-4">
      <div class="flex items-center justify-between gap-3">
        <div>
          <div class="text-xs font-semibold uppercase tracking-[0.24em] text-content-muted">候选改写</div>
          <div class="mt-1 text-sm font-semibold text-content-primary">{{ label }}</div>
        </div>
        <div class="flex items-center gap-2">
          <button class="ui-btn-secondary px-3 py-1.5 text-xs" :disabled="busy || !canGenerate" @click="emit('regenerate')">
            {{ busy ? '生成中…' : '重新生成' }}
          </button>
          <button class="ui-btn-primary px-3 py-1.5 text-xs" :disabled="!moduleDraft.candidate || busy" @click="emit('accept')">
            接受候选稿
          </button>
        </div>
      </div>

      <div v-if="moduleDraft.candidate" class="mt-4 whitespace-pre-wrap rounded-xl bg-base/25 p-4 text-sm leading-relaxed text-content-secondary ring-1 ring-border/10">
        {{ moduleDraft.candidate }}
      </div>
      <div v-else class="mt-4 rounded-xl bg-base/20 p-4 text-sm text-content-muted ring-1 ring-border/10">
        还没有生成候选稿。
      </div>

      <div v-if="moduleDraft.notes.length" class="mt-4">
        <div class="text-xs font-semibold text-content-muted">说明</div>
        <ul class="mt-2 list-disc space-y-1 pl-5 text-sm text-content-secondary">
          <li v-for="(item, index) in moduleDraft.notes" :key="index">{{ item }}</li>
        </ul>
      </div>

      <div v-if="moduleDraft.checklist.length" class="mt-4">
        <div class="text-xs font-semibold text-content-muted">待确认</div>
        <ul class="mt-2 list-disc space-y-1 pl-5 text-sm text-content-secondary">
          <li v-for="(item, index) in moduleDraft.checklist" :key="index">{{ item }}</li>
        </ul>
        <div class="mt-3 rounded-xl bg-base/20 p-3 text-xs leading-relaxed text-content-muted ring-1 ring-border/10">
          如果这些问题需要补充，请在左侧「补充回答」里统一说明后，再点「重新生成」。
        </div>
      </div>
    </div>
  </section>
</template>
