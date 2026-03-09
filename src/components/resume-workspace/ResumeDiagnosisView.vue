<script setup lang="ts">
import type { ResumeDiagnosis } from "../../lib/resumeWorkspace";

defineProps<{
  diagnosis: ResumeDiagnosis;
}>();
</script>

<template>
  <section class="space-y-4">
    <div class="ui-panel p-4">
      <div class="text-xs font-semibold uppercase tracking-[0.24em] text-content-muted">诊断概览</div>
      <p class="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-content-secondary">{{ diagnosis.overall_summary }}</p>
    </div>

    <div class="grid gap-3 md:grid-cols-2">
      <div v-for="(section, key) in { summary: diagnosis.summary, projects: diagnosis.projects, experience: diagnosis.experience, skills: diagnosis.skills }" :key="key" class="ui-panel-muted p-4">
        <div class="text-sm font-semibold text-content-primary">
          {{ key === 'summary' ? '个人简介' : key === 'projects' ? '项目经历' : key === 'experience' ? '工作经历' : '技能清单' }}
        </div>
        <p class="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-content-secondary">{{ section.assessment }}</p>
        <div v-if="section.missing_info.length" class="mt-3">
          <div class="text-xs font-semibold text-content-muted">建议补充</div>
          <ul class="mt-2 list-disc space-y-1 pl-5 text-sm text-content-secondary">
            <li v-for="(item, index) in section.missing_info" :key="index">{{ item }}</li>
          </ul>
        </div>
        <div v-if="section.suggestions.length" class="mt-3">
          <div class="text-xs font-semibold text-content-muted">改写建议</div>
          <ul class="mt-2 list-disc space-y-1 pl-5 text-sm text-content-secondary">
            <li v-for="(item, index) in section.suggestions" :key="index">{{ item }}</li>
          </ul>
        </div>
      </div>
    </div>

    <div v-if="diagnosis.next_steps.length" class="ui-panel p-4">
      <div class="text-xs font-semibold uppercase tracking-[0.24em] text-content-muted">下一步</div>
      <ul class="mt-2 list-disc space-y-1 pl-5 text-sm text-content-secondary">
        <li v-for="(item, index) in diagnosis.next_steps" :key="index">{{ item }}</li>
      </ul>
    </div>
  </section>
</template>
