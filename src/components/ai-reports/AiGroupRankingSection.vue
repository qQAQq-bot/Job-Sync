<script setup lang="ts">
import { ref } from "vue";
import { ChevronDown, FileText } from "lucide-vue-next";

import type { AiGroupReport } from "../../lib/aiReport.ts";
import AiScoreBadge from "./AiScoreBadge.vue";

defineProps<{
  report: AiGroupReport;
}>();

const emit = defineEmits<{
  (e: "open-resume-report", jobId: string): void;
}>();

const openJobKey = ref<string | null>(null);

function isOpen(key: string): boolean {
  return openJobKey.value === key;
}

function toggle(key: string): void {
  openJobKey.value = openJobKey.value === key ? null : key;
}

function openResumeReport(jobId: string): void {
  const trimmed = jobId.trim();
  if (!trimmed) return;
  emit("open-resume-report", trimmed);
}
</script>

<template>
  <section
    id="ai-group-ranking"
    class="scroll-mt-24 overflow-hidden rounded-xl bg-card/60 ring-1 ring-white/[0.06]"
  >
    <header class="flex items-center justify-between gap-3 bg-card/60 px-4 py-3">
      <div class="text-xs font-semibold uppercase tracking-wider text-content-muted">职位排序</div>
      <span class="text-xs text-content-muted">按匹配度从高到低</span>
    </header>

    <div class="divide-y divide-white/[0.06] py-1">
      <div v-for="(it, idx) in report.jobRanking" :key="it.encrypt_job_id" class="bg-card/40">
        <div class="group flex items-stretch gap-2 px-4 py-3">
          <button
            type="button"
            class="group flex-1 text-left transition-colors hover:bg-white/[0.04] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 rounded-lg -ml-2 px-2"
            :class="isOpen(it.encrypt_job_id) ? 'bg-white/[0.04]' : ''"
            :aria-expanded="isOpen(it.encrypt_job_id)"
            :aria-controls="`job-ranking-panel-${idx}`"
            :aria-label="`${isOpen(it.encrypt_job_id) ? '收起' : '展开'} ${it.position_name ?? '职位'} 的详情`"
            @click="toggle(it.encrypt_job_id)"
          >
            <div class="grid grid-cols-[1fr_auto] gap-3">
              <div class="min-w-0 flex items-start gap-3">
                <div
                  class="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.04] text-xs font-semibold tabular-nums text-content-muted ring-1 ring-white/[0.06]"
                  aria-hidden="true"
                >
                  {{ idx + 1 }}
                </div>
                <div class="min-w-0">
                  <div class="truncate text-sm font-semibold text-content-primary">
                    {{ it.position_name ?? "-" }}
                  </div>
                  <div class="truncate text-xs text-content-muted">
                    {{ it.brand_name ?? "" }}
                  </div>
                </div>
              </div>

              <div class="flex items-center gap-2 self-start pt-0.5">
                <AiScoreBadge :score="it.matchScore" />
                <span
                  class="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.03] ring-1 ring-white/[0.06] transition-colors group-hover:bg-white/[0.06]"
                  aria-hidden="true"
                >
                  <ChevronDown
                    class="h-4 w-4 text-content-muted transition-transform duration-200 motion-reduce:transition-none"
                    :class="isOpen(it.encrypt_job_id) ? 'rotate-180 text-content-secondary' : ''"
                  />
                </span>
              </div>

              <div class="col-span-2 min-w-0 text-sm text-content-secondary">
                {{ it.conclusion }}
              </div>
            </div>
          </button>

          <button
            type="button"
            class="ui-icon-btn h-10 w-10 self-start shrink-0 opacity-100 pointer-events-auto md:opacity-0 md:pointer-events-none md:group-hover:opacity-100 md:group-hover:pointer-events-auto transition-opacity"
            :disabled="!it.encrypt_job_id"
            :title="`查看 ${it.position_name ?? '该岗位'} 的报告`"
            aria-label="查看报告"
            @click="openResumeReport(it.encrypt_job_id)"
          >
            <FileText class="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div
          v-if="isOpen(it.encrypt_job_id)"
          :id="`job-ranking-panel-${idx}`"
          class="border-t border-white/[0.06] px-4 py-4"
        >
          <div class="grid gap-3 md:grid-cols-2">
            <div class="rounded-lg bg-white/[0.03] p-3 ring-1 ring-white/[0.06]">
              <div class="text-xs font-semibold text-content-muted">理由</div>
              <ul class="mt-2 list-disc space-y-1 pl-5 text-sm text-content-secondary">
                <li v-for="(r, i) in it.reasons" :key="i">{{ r }}</li>
              </ul>
            </div>
            <div class="rounded-lg bg-white/[0.03] p-3 ring-1 ring-white/[0.06]">
              <div class="text-xs font-semibold text-content-muted">风险</div>
              <ul v-if="it.risks.length" class="mt-2 list-disc space-y-1 pl-5 text-sm text-content-secondary">
                <li v-for="(r, i) in it.risks" :key="i">{{ r }}</li>
              </ul>
              <div v-else class="mt-2 text-sm text-content-muted">（暂无）</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
