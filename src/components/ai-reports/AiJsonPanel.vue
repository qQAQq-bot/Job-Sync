<script setup lang="ts">
import { computed, ref } from "vue";
import { ChevronDown } from "lucide-vue-next";

const props = withDefaults(
  defineProps<{
    title?: string;
    value: unknown;
    defaultOpen?: boolean;
    maxChars?: number;
  }>(),
  {
    title: "原始 JSON",
    defaultOpen: false,
    maxChars: 40000,
  },
);

const isOpen = ref(props.defaultOpen);
const copied = ref(false);

const jsonText = computed(() => {
  try {
    const s = JSON.stringify(props.value, null, 2);
    if (props.maxChars > 0 && s.length > props.maxChars) {
      return `${s.slice(0, props.maxChars)}\n…（内容过长，已截断显示）`;
    }
    return s;
  } catch {
    return String(props.value);
  }
});

async function copy(): Promise<void> {
  try {
    await navigator.clipboard.writeText(jsonText.value);
    copied.value = true;
    window.setTimeout(() => {
      copied.value = false;
    }, 1200);
  } catch {
    // ignore
  }
}

function onToggle(e: Event): void {
  const el = e.target as HTMLDetailsElement | null;
  if (!el) return;
  isOpen.value = el.open;
}
</script>

<template>
  <details
    class="overflow-hidden rounded-xl bg-card/60 ring-1 ring-white/[0.06]"
    :open="isOpen"
    @toggle="onToggle"
  >
    <summary
      class="flex cursor-pointer list-none items-center justify-between gap-3 bg-card/60 px-4 py-3 text-sm text-content-secondary hover:text-content-primary [&::-webkit-details-marker]:hidden"
    >
      <span class="font-medium">{{ title }}</span>
      <div class="flex items-center gap-2">
        <button
          type="button"
          class="shrink-0 rounded-lg bg-white/[0.06] px-3 py-1.5 text-xs font-medium text-content-secondary ring-1 ring-white/[0.06] transition-colors hover:bg-white/[0.10] hover:text-content-primary"
          @click.prevent.stop="copy"
        >
          {{ copied ? "已复制" : "复制" }}
        </button>
        <ChevronDown
          class="h-4 w-4 text-content-muted transition-transform duration-200 motion-reduce:transition-none"
          :class="isOpen ? 'rotate-180 text-content-secondary' : ''"
          aria-hidden="true"
        />
      </div>
    </summary>
    <div class="bg-slate-950 p-4">
      <pre class="whitespace-pre-wrap break-words text-xs text-slate-100">{{ jsonText }}</pre>
    </div>
  </details>
</template>
