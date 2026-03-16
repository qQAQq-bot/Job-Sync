<script setup lang="ts">
import { ref, watch } from "vue";

const props = defineProps<{
  visible: boolean;
  initialTitle: string;
  loading: boolean;
  dialogTitle?: string;
  description?: string;
  confirmLabel?: string;
  fieldLabel?: string;
  placeholder?: string;
}>();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "confirm", title: string): void;
}>();

const title = ref("");

watch(
  () => [props.visible, props.initialTitle] as const,
  ([visible, initialTitle]) => {
    if (!visible) return;
    title.value = initialTitle;
  },
  { immediate: true },
);

function submit(): void {
  emit("confirm", title.value.trim());
}
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
            <h3 class="text-lg font-semibold tracking-[-0.02em] text-content-primary">{{ dialogTitle || "重命名当前工作区" }}</h3>
            <p class="text-sm leading-6 text-content-secondary">
              {{ description || "名称会用于顶部摘要和工作区切换列表，建议使用容易区分的标题。" }}
            </p>
          </div>

          <div class="mt-5 space-y-2">
            <label class="text-xs font-medium text-content-muted">{{ fieldLabel || "工作区名称" }}</label>
            <input
              v-model="title"
              class="ui-input w-full"
              :placeholder="placeholder || '例如：产品经理-投递版'"
              @keyup.enter="submit"
            />
          </div>

          <div class="mt-6 flex items-center justify-end gap-3">
            <button type="button" class="ui-btn-secondary" :disabled="loading" @click="$emit('close')">取消</button>
            <button type="button" class="ui-btn-primary" :disabled="loading || !title.trim()" @click="submit">
              {{ loading ? "处理中…" : confirmLabel || "保存名称" }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
