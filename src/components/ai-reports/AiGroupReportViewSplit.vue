<script setup lang="ts">
import type { Component } from "vue";
import { ref } from "vue";
import {
  ClipboardList,
  FileText,
  GraduationCap,
  LayoutDashboard,
  ListOrdered,
  ShieldAlert,
  Sparkles,
} from "lucide-vue-next";

import type { AiGroupReport } from "../../lib/aiReport.ts";
import AiJsonPanel from "./AiJsonPanel.vue";
import AiGroupBoostersSection from "./AiGroupBoostersSection.vue";
import AiGroupLearningSection from "./AiGroupLearningSection.vue";
import AiGroupOverviewSection from "./AiGroupOverviewSection.vue";
import AiGroupRankingSection from "./AiGroupRankingSection.vue";
import AiGroupRequirementsSection from "./AiGroupRequirementsSection.vue";
import AiGroupResumeSection from "./AiGroupResumeSection.vue";
import AiGroupRisksSection from "./AiGroupRisksSection.vue";

defineProps<{
  report: AiGroupReport;
  raw?: unknown;
}>();

const emit = defineEmits<{
  (e: "open-resume-report", jobId: string): void;
}>();

type ReportSectionKey = "overview" | "ranking" | "requirements" | "resume" | "boosters" | "learning" | "risks";

const reportSections: Array<{
  key: ReportSectionKey;
  label: string;
  targetId: string;
  icon: Component;
}> = [
  { key: "overview", label: "概览", targetId: "ai-group-overview", icon: LayoutDashboard },
  { key: "ranking", label: "职位", targetId: "ai-group-ranking", icon: ListOrdered },
  { key: "requirements", label: "要求", targetId: "ai-group-requirements", icon: ClipboardList },
  { key: "resume", label: "简历", targetId: "ai-group-resume", icon: FileText },
  { key: "boosters", label: "项目", targetId: "ai-group-boosters", icon: Sparkles },
  { key: "learning", label: "学习", targetId: "ai-group-learning", icon: GraduationCap },
  { key: "risks", label: "风险", targetId: "ai-group-risks", icon: ShieldAlert },
];

const activeSection = ref<ReportSectionKey>("overview");

function goToSection(key: ReportSectionKey): void {
  activeSection.value = key;
  const targetId = reportSections.find((s) => s.key === key)?.targetId;
  if (!targetId) return;
  const el = document.getElementById(targetId);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
}
</script>

<template>
  <section class="space-y-4">
    <nav
      class="sticky top-2 z-20 -mx-1 rounded-xl bg-card/70 p-1 ring-1 ring-white/[0.06] backdrop-blur-md"
      aria-label="报告分段导航"
    >
      <div class="flex gap-1 overflow-x-auto p-1">
        <button
          v-for="s in reportSections"
          :key="s.key"
          type="button"
          class="inline-flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
          :class="activeSection === s.key ? 'bg-accent/80 text-white shadow-sm' : 'text-content-secondary hover:text-content-primary'"
          @click="goToSection(s.key)"
        >
          <component :is="s.icon" class="h-4 w-4" aria-hidden="true" />
          <span>{{ s.label }}</span>
        </button>
      </div>
    </nav>

    <AiGroupOverviewSection :report="report" />
    <AiGroupRankingSection :report="report" @open-resume-report="(jobId) => emit('open-resume-report', jobId)" />
    <AiGroupRequirementsSection :report="report" />
    <AiGroupResumeSection :report="report" />
    <AiGroupBoostersSection :report="report" />
    <AiGroupLearningSection :report="report" />
    <AiGroupRisksSection :report="report" />

    <AiJsonPanel :value="raw ?? report" />
  </section>
</template>
