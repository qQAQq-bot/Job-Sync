<script setup lang="ts">
defineProps<{
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  loading: boolean;
}>();

defineEmits<{
  (e: "close"): void;
  (e: "confirm"): void;
}>();
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="visible"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        @click.self="$emit('close')"
      >
        <div class="ui-panel mx-4 w-full max-w-sm p-6">
          <h3 class="text-base font-semibold text-content-primary">{{ title }}</h3>
          <p class="mt-2 text-sm leading-relaxed text-content-secondary">{{ message }}</p>
          <div class="mt-5 flex items-center justify-end gap-3">
            <button class="ui-btn-secondary" :disabled="loading" @click="$emit('close')">取消</button>
            <button class="ui-btn-danger" :disabled="loading" @click="$emit('confirm')">
              {{ loading ? "处理中…" : confirmLabel }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
