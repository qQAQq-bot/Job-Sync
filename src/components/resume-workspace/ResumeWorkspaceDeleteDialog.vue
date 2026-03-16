<script setup lang="ts">
defineProps<{
  visible: boolean;
  workspaceTitle: string;
  loading: boolean;
}>();

defineEmits<{
  (e: "close"): void;
  (e: "confirm"): void;
}>();
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-all duration-200 ease-out"
      enter-from-class="opacity-0 scale-[0.98]"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition-all duration-150 ease-in"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-[0.98]"
    >
      <div
        v-if="visible"
        class="fixed inset-0 z-[140] flex items-center justify-center bg-slate-950/72 px-4 backdrop-blur-sm"
        @click.self="$emit('close')"
      >
        <div class="ui-panel w-full max-w-md p-6">
          <div class="space-y-2">
            <div class="text-[10px] font-semibold uppercase tracking-[0.24em] text-content-muted">工作区管理</div>
            <h3 class="text-lg font-semibold tracking-[-0.02em] text-content-primary">删除当前工作区</h3>
            <p class="text-sm leading-6 text-content-secondary">
              将删除工作区
              <span class="font-medium text-content-primary">「{{ workspaceTitle }}」</span>
              及其对应草稿文件。系统会自动切换到其他可用工作区或创建一个新的空白工作区。
            </p>
          </div>

          <div class="mt-5 rounded-2xl border border-red-400/18 bg-red-500/10 px-4 py-3 text-sm leading-6 text-red-200">
            此操作不可撤销。
          </div>

          <div class="mt-6 flex items-center justify-end gap-3">
            <button type="button" class="ui-btn-secondary" :disabled="loading" @click="$emit('close')">取消</button>
            <button type="button" class="ui-btn-danger" :disabled="loading" @click="$emit('confirm')">
              {{ loading ? "删除中…" : "确认删除" }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
