<script setup lang="ts">
defineProps<{
  finalText?: string | null;
  ready: boolean;
  assembling: boolean;
  exporting: boolean;
  needsRegenerate: boolean;
}>();

const emit = defineEmits<{
  (e: "assemble"): void;
  (e: "export"): void;
}>();
</script>

<template>
  <section class="space-y-5">
    <div class="resume-paper-panel">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div class="resume-paper-title">最终简历</div>
          <div class="mt-2 text-2xl font-semibold tracking-[-0.03em] text-content-primary">成稿预览</div>
          <div class="mt-2 text-sm leading-6 text-content-muted">四个模块确认后即可拼装最终稿，并按当前模板导出 PDF。</div>
        </div>
        <div class="flex items-center gap-2">
          <button class="resume-paper-btn-secondary" :disabled="assembling || !ready" @click="emit('assemble')">
            {{ assembling ? '生成中…' : '生成最终稿' }}
          </button>
          <button class="resume-paper-btn-primary" :disabled="exporting || !finalText" @click="emit('export')">
            {{ exporting ? '导出中…' : '导出 PDF' }}
          </button>
        </div>
      </div>

      <div v-if="finalText && needsRegenerate" class="resume-paper-alert resume-paper-alert--warning mt-5">
        检测到模块内容已更新，请先点击“生成最终稿”同步最终简历。
      </div>

      <div v-if="finalText" class="resume-paper-document mt-5 min-h-[380px]">
        {{ finalText }}
      </div>
      <div v-else class="resume-paper-annotation mt-5">
        <div class="resume-paper-label">成稿尚未生成</div>
        <div class="mt-2 text-sm leading-6 text-content-secondary">当四个模块都确认后，这里会展示完整的最终简历稿件。</div>
      </div>
    </div>
  </section>
</template>
