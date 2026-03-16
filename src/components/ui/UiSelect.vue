<script setup lang="ts">
import { computed, nextTick, onBeforeUpdate, onMounted, onUnmounted, ref, shallowRef, useAttrs, useSlots } from "vue";
import { Check, ChevronDown } from "lucide-vue-next";

import { parseSelectItems, type SelectItem, type SelectOptionItem } from "./uiSelectItems.ts";
import { focusWithoutScroll, measureMenuLayout, type MenuStyle } from "./uiSelectMenu.ts";

defineOptions({ inheritAttrs: false });

const props = withDefaults(
  defineProps<{
    variant?: "default" | "workspace";
  }>(),
  {
    variant: "default",
  },
);

const model = defineModel<string>({ default: "" });

const attrs = useAttrs();
const slots = useSlots();

const items = shallowRef<SelectItem[]>([]);
const optionEls = ref<Record<number, HTMLElement | null>>({});

const isDisabled = computed(() => {
  const value = (attrs as Record<string, unknown>).disabled;
  if (value === "" || value === true) return true;
  if (value === false || value === undefined || value === null) return false;
  if (typeof value === "string") return value.toLowerCase() !== "false";
  return Boolean(value);
});

const wrapperClass = computed(() => ["relative w-full", attrs.class]);
const buttonAttrs = computed(() => {
  const { class: _class, ...rest } = attrs;
  return rest;
});
const isWorkspace = computed(() => props.variant === "workspace");
const triggerClass = computed(() =>
  isWorkspace.value
    ? "group relative flex w-full items-center justify-between gap-3 rounded-2xl bg-card-hover/70 px-4 py-3 text-sm text-content-primary shadow-[0_18px_36px_-28px_rgba(2,6,23,0.52)] transition-colors duration-200 hover:bg-card-hover/90 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
    : "group relative flex w-full items-center justify-between gap-2 rounded-xl border border-border/10 bg-input/90 px-3.5 py-2.5 text-sm text-content-primary shadow-inner transition-colors duration-200 hover:border-border/20 hover:bg-card-hover/75 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60",
);
const triggerOpenClass = computed(() => (isWorkspace.value ? "border-border-glow/25 bg-card-hover/95 ring-1 ring-inset ring-border-glow/20" : "border-border-glow/35 bg-card-hover/80"));
const triggerOverlayClass = computed(() =>
  isWorkspace.value
    ? "pointer-events-none absolute inset-0 rounded-2xl border border-transparent"
    : "pointer-events-none absolute inset-0 rounded-xl border border-transparent transition-colors group-hover:border-border/10",
);
const triggerFocusRingClass = computed(() =>
  isWorkspace.value
    ? "pointer-events-none absolute -inset-0.5 hidden rounded-[1.1rem] border border-border-glow/18 opacity-0 transition-opacity group-focus-visible:block group-focus-visible:opacity-100"
    : "pointer-events-none absolute -inset-0.5 hidden rounded-[1rem] border-2 border-border-glow/30 opacity-0 transition-opacity group-focus-visible:block group-focus-visible:opacity-100",
);
const menuClass = computed(() =>
  isWorkspace.value
    ? "fixed z-[120] overflow-hidden rounded-[22px] bg-surface-elevated/97 shadow-2xl shadow-black/50 backdrop-blur-xl"
    : "fixed z-[120] overflow-hidden rounded-2xl border border-border/10 bg-surface-elevated/95 shadow-2xl shadow-black/40 backdrop-blur-xl",
);
const optionClass = computed(() =>
  isWorkspace.value
    ? "flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-left text-sm transition-colors duration-150"
    : "flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm transition-colors duration-150",
);
const optionStateClass = computed(() => ({
  disabled: isWorkspace.value ? "cursor-not-allowed opacity-40" : "cursor-not-allowed opacity-50",
  hover: isWorkspace.value ? "hover:bg-card-hover/90" : "hover:bg-card-hover/75",
  selected: isWorkspace.value ? "bg-border-glow/8 text-content-primary ring-1 ring-inset ring-border-glow/18" : "bg-border-glow/10 text-content-primary ring-1 ring-inset ring-border-glow/20",
  active: isWorkspace.value ? "bg-card-hover/95 text-content-primary" : "bg-card-hover/90 text-content-primary",
}));

function refreshItems(): void {
  items.value = parseSelectItems(slots.default?.() ?? []);
  optionEls.value = {};
}

onMounted(refreshItems);
onBeforeUpdate(refreshItems);

const optionItems = computed(() => items.value.filter((it): it is SelectOptionItem => it.kind === "option"));
const selectedOption = computed(() => optionItems.value.find((it) => it.value === model.value) ?? null);
const triggerLabel = computed(() => selectedOption.value?.label ?? (model.value ? String(model.value) : "请选择"));

const open = ref(false);
const activeIndex = ref(-1);
const placement = ref<"bottom" | "top">("bottom");
const menuMaxHeight = ref<number | null>(null);
const menuStyle = ref<MenuStyle>({ left: "0px", top: "0px", width: "0px" });

const rootEl = ref<HTMLElement | null>(null);
const buttonEl = ref<HTMLButtonElement | null>(null);
const listboxEl = ref<HTMLElement | null>(null);

const listboxId = `ui-select-${Math.random().toString(16).slice(2)}-listbox`;

function optionDomId(optionIndex: number): string {
  return `${listboxId}-opt-${optionIndex}`;
}

const activeOptionDomId = computed(() => {
  const idx = activeIndex.value;
  if (idx < 0) return undefined;
  return optionDomId(idx);
});

function setOptionEl(idx: number, el: unknown): void {
  optionEls.value[idx] = el instanceof HTMLElement ? el : null;
}

function focusTriggerWithoutScroll(): void {
  focusWithoutScroll(buttonEl.value);
}

function focusListboxWithoutScroll(): void {
  focusWithoutScroll(listboxEl.value);
}

function close(options: { restoreFocus: boolean }): void {
  open.value = false;
  activeIndex.value = -1;
  placement.value = "bottom";
  menuMaxHeight.value = null;
  if (options.restoreFocus) focusTriggerWithoutScroll();
}

function setActiveToSelected(): void {
  const idx = optionItems.value.findIndex((it) => it.value === model.value);
  activeIndex.value = idx >= 0 ? idx : optionItems.value.findIndex((it) => !it.disabled);
}

function scrollActiveIntoView(): void {
  const el = optionEls.value[activeIndex.value] ?? null;
  if (!el) return;
  el.scrollIntoView({ block: "nearest", inline: "nearest" });
}

function measureMenu(): void {
  const button = buttonEl.value;
  const menu = listboxEl.value;
  if (!button || !menu) return;
  const layout = measureMenuLayout(button, menu);
  placement.value = layout.placement;
  menuMaxHeight.value = layout.menuMaxHeight;
  menuStyle.value = layout.menuStyle;
}

async function syncMenuPosition(): Promise<void> {
  if (!open.value) return;
  await nextTick();
  measureMenu();
}

async function openMenu(): Promise<void> {
  if (isDisabled.value) return;
  open.value = true;
  setActiveToSelected();
  await syncMenuPosition();
  await nextTick();
  scrollActiveIntoView();
  focusListboxWithoutScroll();
}

function toggle(): void {
  if (open.value) close({ restoreFocus: true });
  else void openMenu();
}

function moveActive(delta: -1 | 1): void {
  const list = optionItems.value;
  if (list.length === 0) return;

  let idx = activeIndex.value;
  if (idx < 0 || idx >= list.length) idx = delta === 1 ? -1 : list.length;

  for (let step = 0; step < list.length; step += 1) {
    idx += delta;
    if (idx < 0) idx = list.length - 1;
    if (idx >= list.length) idx = 0;
    if (!list[idx]?.disabled) {
      activeIndex.value = idx;
      scrollActiveIntoView();
      return;
    }
  }
}

function selectOption(idx: number): void {
  const item = optionItems.value[idx];
  if (!item || item.disabled) return;
  model.value = item.value;
  close({ restoreFocus: true });
}

function onButtonKeydown(e: KeyboardEvent): void {
  if (isDisabled.value) return;
  if (!open.value && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
    e.preventDefault();
    void openMenu();
  }
}

function onListboxKeydown(e: KeyboardEvent): void {
  if (!open.value) return;
  if (e.key === "Tab") {
    close({ restoreFocus: false });
    return;
  }
  if (e.key === "Escape") {
    e.preventDefault();
    close({ restoreFocus: true });
    return;
  }
  if (e.key === "ArrowDown") {
    e.preventDefault();
    moveActive(1);
    return;
  }
  if (e.key === "ArrowUp") {
    e.preventDefault();
    moveActive(-1);
    return;
  }
  if (e.key === "Enter") {
    e.preventDefault();
    selectOption(activeIndex.value);
  }
}

function onDocumentMouseDown(e: MouseEvent): void {
  if (!open.value) return;
  if (!(e.target instanceof Node)) return;
  if (rootEl.value?.contains(e.target)) return;
  if (listboxEl.value?.contains(e.target)) return;
  close({ restoreFocus: false });
}

function onWindowScrollOrResize(e: Event): void {
  if (!open.value) return;
  if (e.target instanceof Node && listboxEl.value?.contains(e.target)) return;
  void syncMenuPosition();
}

onMounted(() => {
  document.addEventListener("mousedown", onDocumentMouseDown);
  window.addEventListener("resize", onWindowScrollOrResize);
  window.addEventListener("scroll", onWindowScrollOrResize, true);
});

onUnmounted(() => {
  document.removeEventListener("mousedown", onDocumentMouseDown);
  window.removeEventListener("resize", onWindowScrollOrResize);
  window.removeEventListener("scroll", onWindowScrollOrResize, true);
});
</script>

<template>
  <div ref="rootEl" :class="wrapperClass">
    <button
      ref="buttonEl"
      v-bind="buttonAttrs"
      type="button"
      :class="[triggerClass, open ? triggerOpenClass : '']"
      :disabled="isDisabled"
      :aria-expanded="open"
      :aria-controls="listboxId"
      aria-haspopup="listbox"
      @click="toggle"
      @keydown="onButtonKeydown"
    >
      <span class="min-w-0 flex-1 truncate text-left">{{ triggerLabel }}</span>
      <ChevronDown
        class="h-4 w-4 shrink-0 text-content-muted transition-transform duration-200 motion-reduce:transition-none group-hover:text-content-secondary"
        :class="open ? 'rotate-180 text-content-secondary' : ''"
        aria-hidden="true"
      />
      <span
        :class="triggerOverlayClass"
        aria-hidden="true"
      />
      <span
        :class="triggerFocusRingClass"
        aria-hidden="true"
      />
    </button>

    <Teleport to="body">
      <div
        v-if="open"
        ref="listboxEl"
        :id="listboxId"
        :class="menuClass"
        :style="menuStyle"
        role="listbox"
        tabindex="-1"
        :aria-activedescendant="activeOptionDomId"
        @keydown="onListboxKeydown"
      >
        <div class="overflow-auto p-1" :style="menuMaxHeight ? { maxHeight: `${menuMaxHeight}px` } : undefined">
          <template v-for="it in items" :key="it.key">
            <div
              v-if="it.kind === 'group'"
              class="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-content-muted"
            >
              {{ it.label }}
            </div>
            <button
              v-else
              :ref="(el) => setOptionEl(it.optionIndex, el)"
              :id="optionDomId(it.optionIndex)"
              type="button"
              :class="[
                optionClass,
                it.disabled ? optionStateClass.disabled : optionStateClass.hover,
                it.value === model ? optionStateClass.selected : 'text-content-secondary',
                it.optionIndex === activeIndex ? optionStateClass.active : '',
              ]"
              :disabled="it.disabled"
              :aria-selected="it.value === model"
              role="option"
              @click="selectOption(it.optionIndex)"
            >
              <Check
                class="h-4 w-4 shrink-0 text-accent transition-opacity"
                :class="it.value === model ? 'opacity-100' : 'opacity-0'"
                aria-hidden="true"
              />
              <span class="min-w-0 flex-1 truncate">{{ it.label }}</span>
            </button>
          </template>
        </div>
      </div>
    </Teleport>
  </div>
</template>
