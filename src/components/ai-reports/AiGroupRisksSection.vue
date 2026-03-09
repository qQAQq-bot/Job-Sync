<script setup lang="ts">
import { Copy, HelpCircle, Info, ListChecks, ShieldAlert } from "lucide-vue-next";

import type { AiGroupReport } from "../../lib/aiReport.ts";
import { useCopy } from "../../lib/useCopy.ts";

defineProps<{
  report: AiGroupReport;
}>();

const { copy, copyLabel } = useCopy();

function joinBullets(lines: string[]): string {
  return lines.filter(Boolean).map((s) => `- ${s}`).join("\n");
}
</script>

<template>
  <section
    id="ai-group-risks"
    class="scroll-mt-24 space-y-3 rounded-xl bg-card/60 p-4 ring-1 ring-white/[0.06]"
  >
    <header class="flex flex-wrap items-center justify-between gap-2">
      <div class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-content-muted">
        <ShieldAlert class="h-4 w-4 text-accent-danger" aria-hidden="true" />
        <span>风险与行动</span>
      </div>
      <span class="text-xs text-content-muted">把风险变成清单，把下一步变成节奏</span>
    </header>

    <div class="grid gap-3 md:grid-cols-2">
      <div class="rounded-xl bg-white/[0.03] p-4 ring-1 ring-white/[0.06] border-t-2 border-accent-danger/35">
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-2">
            <ShieldAlert class="h-4 w-4 text-accent-danger" aria-hidden="true" />
            <div class="text-xs font-semibold uppercase tracking-wider text-content-muted">风险提示</div>
            <span class="rounded-full bg-accent-danger/10 px-2 py-0.5 text-[11px] text-accent-danger ring-1 ring-accent-danger/25">
              {{ report.riskNotes.length }}
            </span>
          </div>
          <button
            type="button"
            class="inline-flex items-center gap-2 rounded-lg bg-white/[0.06] px-3 py-1.5 text-xs font-medium text-content-secondary ring-1 ring-white/[0.06] transition-colors hover:bg-white/[0.10] hover:text-content-primary"
            @click="copy('risk_notes', joinBullets(report.riskNotes))"
          >
            <Copy class="h-4 w-4" aria-hidden="true" />
            {{ copyLabel("risk_notes", "复制") }}
          </button>
        </div>

        <ul v-if="report.riskNotes.length" class="mt-3 space-y-2 text-sm text-content-secondary">
          <li
            v-for="(t, i) in report.riskNotes"
            :key="i"
            class="rounded-lg bg-accent-danger/10 px-3 py-2 ring-1 ring-accent-danger/20 transition-colors hover:bg-accent-danger/15"
          >
            <div class="flex items-start gap-2">
              <span
                class="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-accent-danger/15 text-[11px] font-semibold text-accent-danger ring-1 ring-accent-danger/25 tabular-nums"
                aria-hidden="true"
              >
                {{ i + 1 }}
              </span>
              <span class="min-w-0 break-words leading-relaxed">{{ t }}</span>
            </div>
          </li>
        </ul>
        <div
          v-else
          class="mt-3 rounded-lg bg-black/20 px-3 py-6 text-center text-sm text-content-muted ring-1 ring-white/[0.06]"
        >
          （暂无）
        </div>
      </div>

      <div class="rounded-xl bg-white/[0.03] p-4 ring-1 ring-white/[0.06] border-t-2 border-accent-success/35">
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-2">
            <ListChecks class="h-4 w-4 text-accent-success" aria-hidden="true" />
            <div class="text-xs font-semibold uppercase tracking-wider text-content-muted">下一步</div>
            <span class="rounded-full bg-accent-success/10 px-2 py-0.5 text-[11px] text-accent-success ring-1 ring-accent-success/25">
              {{ report.nextSteps.length }}
            </span>
          </div>
          <button
            type="button"
            class="inline-flex items-center gap-2 rounded-lg bg-white/[0.06] px-3 py-1.5 text-xs font-medium text-content-secondary ring-1 ring-white/[0.06] transition-colors hover:bg-white/[0.10] hover:text-content-primary"
            @click="copy('next_steps', joinBullets(report.nextSteps))"
          >
            <Copy class="h-4 w-4" aria-hidden="true" />
            {{ copyLabel("next_steps", "复制") }}
          </button>
        </div>

        <ol v-if="report.nextSteps.length" class="mt-3 space-y-2 text-sm text-content-secondary">
          <li
            v-for="(t, i) in report.nextSteps"
            :key="i"
            class="rounded-lg bg-accent-success/10 px-3 py-2 ring-1 ring-accent-success/20 transition-colors hover:bg-accent-success/15"
          >
            <div class="flex items-start gap-2">
              <span
                class="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-accent-success/15 text-[11px] font-semibold text-accent-success ring-1 ring-accent-success/25 tabular-nums"
                aria-hidden="true"
              >
                {{ i + 1 }}
              </span>
              <span class="min-w-0 break-words leading-relaxed">{{ t }}</span>
            </div>
          </li>
        </ol>
        <div
          v-else
          class="mt-3 rounded-lg bg-black/20 px-3 py-6 text-center text-sm text-content-muted ring-1 ring-white/[0.06]"
        >
          （暂无）
        </div>
      </div>

      <div class="rounded-xl bg-white/[0.03] p-4 ring-1 ring-white/[0.06] border-t-2 border-accent/35">
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-2">
            <Info class="h-4 w-4 text-accent" aria-hidden="true" />
            <div class="text-xs font-semibold uppercase tracking-wider text-content-muted">假设</div>
            <span class="rounded-full bg-accent/10 px-2 py-0.5 text-[11px] text-accent ring-1 ring-accent/25">
              {{ report.assumptions.length }}
            </span>
          </div>
          <button
            type="button"
            class="inline-flex items-center gap-2 rounded-lg bg-white/[0.06] px-3 py-1.5 text-xs font-medium text-content-secondary ring-1 ring-white/[0.06] transition-colors hover:bg-white/[0.10] hover:text-content-primary"
            @click="copy('assumptions', joinBullets(report.assumptions))"
          >
            <Copy class="h-4 w-4" aria-hidden="true" />
            {{ copyLabel("assumptions", "复制") }}
          </button>
        </div>

        <ul v-if="report.assumptions.length" class="mt-3 space-y-2 text-sm text-content-secondary">
          <li
            v-for="(t, i) in report.assumptions"
            :key="i"
            class="rounded-lg bg-accent/10 px-3 py-2 ring-1 ring-accent/20 transition-colors hover:bg-accent/15"
          >
            <div class="flex items-start gap-2">
              <span
                class="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-accent/15 text-[11px] font-semibold text-accent ring-1 ring-accent/25 tabular-nums"
                aria-hidden="true"
              >
                {{ i + 1 }}
              </span>
              <span class="min-w-0 break-words leading-relaxed">{{ t }}</span>
            </div>
          </li>
        </ul>
        <div
          v-else
          class="mt-3 rounded-lg bg-black/20 px-3 py-6 text-center text-sm text-content-muted ring-1 ring-white/[0.06]"
        >
          （暂无）
        </div>
      </div>

      <div class="rounded-xl bg-white/[0.03] p-4 ring-1 ring-white/[0.06] border-t-2 border-accent-warning/35">
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-2">
            <HelpCircle class="h-4 w-4 text-accent-warning" aria-hidden="true" />
            <div class="text-xs font-semibold uppercase tracking-wider text-content-muted">待澄清问题</div>
            <span class="rounded-full bg-accent-warning/10 px-2 py-0.5 text-[11px] text-accent-warning ring-1 ring-accent-warning/25">
              {{ report.questions.length }}
            </span>
          </div>
          <button
            type="button"
            class="inline-flex items-center gap-2 rounded-lg bg-white/[0.06] px-3 py-1.5 text-xs font-medium text-content-secondary ring-1 ring-white/[0.06] transition-colors hover:bg-white/[0.10] hover:text-content-primary"
            @click="copy('questions', joinBullets(report.questions))"
          >
            <Copy class="h-4 w-4" aria-hidden="true" />
            {{ copyLabel("questions", "复制") }}
          </button>
        </div>

        <ul v-if="report.questions.length" class="mt-3 space-y-2 text-sm text-content-secondary">
          <li
            v-for="(t, i) in report.questions"
            :key="i"
            class="rounded-lg bg-accent-warning/10 px-3 py-2 ring-1 ring-accent-warning/20 transition-colors hover:bg-accent-warning/15"
          >
            <div class="flex items-start gap-2">
              <span
                class="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-accent-warning/15 text-[11px] font-semibold text-accent-warning ring-1 ring-accent-warning/25 tabular-nums"
                aria-hidden="true"
              >
                {{ i + 1 }}
              </span>
              <span class="min-w-0 break-words leading-relaxed">{{ t }}</span>
            </div>
          </li>
        </ul>
        <div
          v-else
          class="mt-3 rounded-lg bg-black/20 px-3 py-6 text-center text-sm text-content-muted ring-1 ring-white/[0.06]"
        >
          （暂无）
        </div>
      </div>
    </div>
  </section>
</template>
