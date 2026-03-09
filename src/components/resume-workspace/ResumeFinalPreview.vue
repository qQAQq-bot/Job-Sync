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
  <section class="space-y-4">
    <div class="ui-panel p-4">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div class="text-xs font-semibold uppercase tracking-[0.24em] text-content-muted">最终简历</div>
          <div class="mt-1 text-sm text-content-secondary">四个模块都确认后即可拼装与导出 PDF，导出时会应用天蓝标题模板重新排版。</div>
        </div>
        <div class="flex items-center gap-2">
          <button class="ui-btn-secondary" :disabled="assembling || !ready" @click="emit('assemble')">
            {{ assembling ? '生成中…' : '生成最终稿' }}
          </button>
          <button class="ui-btn-primary" :disabled="exporting || !finalText" @click="emit('export')">
            {{ exporting ? '导出中…' : '导出 PDF' }}
          </button>
        </div>
      </div>

      <div v-if="finalText && needsRegenerate" class="ui-status-warning mt-4 p-4 text-sm">
        检测到模块内容已更新，请先点击“生成最终稿”同步最终简历。
      </div>

      <div v-if="finalText" class="mt-4 whitespace-pre-wrap rounded-xl bg-base/25 p-4 text-sm leading-relaxed text-content-secondary ring-1 ring-border/10">
        {{ finalText }}
      </div>
      <div v-else class="mt-4 rounded-xl bg-base/20 p-4 text-sm text-content-muted ring-1 ring-border/10">
        还没有生成最终简历。
      </div>
    </div>
  </section>
</template>
