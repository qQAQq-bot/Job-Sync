<script setup lang="ts">
import { ChevronDown } from "lucide-vue-next";
import { reactive, ref, watch } from "vue";

import type { ResumeDiagnosis } from "../../lib/resumeWorkspace";

const props = defineProps<{
  diagnosis: ResumeDiagnosis;
}>();

const overviewOpen = ref(false);
const nextStepsOpen = ref(false);
const sectionOpen = reactive({
  summary: false,
  projects: false,
  experience: false,
  skills: false,
});

watch(
  () => props.diagnosis,
  () => {
    overviewOpen.value = false;
    nextStepsOpen.value = false;
    sectionOpen.summary = false;
    sectionOpen.projects = false;
    sectionOpen.experience = false;
    sectionOpen.skills = false;
  },
  { immediate: true },
);
</script>

<template>
  <section class="space-y-5">
    <div class="resume-paper-panel">
      <button
        type="button"
        class="flex w-full items-center justify-between gap-3 text-left"
        @click="overviewOpen = !overviewOpen"
      >
        <div>
          <div class="resume-paper-title">AI 诊断摘要</div>
          <div class="resume-paper-heading">先看结构问题，再决定模块优先级</div>
        </div>
        <span class="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-content-muted">
          {{ overviewOpen ? "收起" : "展开" }}
          <ChevronDown class="h-4 w-4 transition-transform duration-200" :class="overviewOpen ? 'rotate-180' : ''" />
        </span>
      </button>
      <p v-if="overviewOpen" class="mt-4 resume-paper-copy whitespace-pre-wrap">{{ props.diagnosis.overall_summary }}</p>
    </div>

    <div class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
      <div class="grid gap-4 md:grid-cols-2">
        <div v-for="(section, key) in { summary: props.diagnosis.summary, projects: props.diagnosis.projects, experience: props.diagnosis.experience, skills: props.diagnosis.skills }" :key="key">
          <div class="resume-paper-panel-soft h-full">
            <button
              type="button"
              class="flex w-full items-center justify-between gap-3 text-left"
              @click="sectionOpen[key as 'summary' | 'projects' | 'experience' | 'skills'] = !sectionOpen[key as 'summary' | 'projects' | 'experience' | 'skills']"
            >
              <div class="resume-paper-label">
                {{ key === 'summary' ? '个人简介' : key === 'projects' ? '项目经历' : key === 'experience' ? '工作经历' : '技能清单' }}
              </div>
              <span class="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-content-muted">
                {{ sectionOpen[key as 'summary' | 'projects' | 'experience' | 'skills'] ? "收起" : "展开" }}
                <ChevronDown
                  class="h-4 w-4 transition-transform duration-200"
                  :class="sectionOpen[key as 'summary' | 'projects' | 'experience' | 'skills'] ? 'rotate-180' : ''"
                />
              </span>
            </button>

            <div v-if="sectionOpen[key as 'summary' | 'projects' | 'experience' | 'skills']">
              <p class="mt-3 text-sm font-medium leading-7 text-content-primary">{{ section.assessment }}</p>

              <div v-if="section.missing_info.length" class="mt-4">
                <div class="resume-paper-label">建议补充</div>
                <ul class="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-6 text-content-secondary">
                  <li v-for="(item, index) in section.missing_info" :key="index">{{ item }}</li>
                </ul>
              </div>

              <div v-if="section.suggestions.length" class="mt-4">
                <div class="resume-paper-label">修改方向</div>
                <ul class="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-6 text-content-secondary">
                  <li v-for="(item, index) in section.suggestions" :key="index">{{ item }}</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="props.diagnosis.next_steps.length" class="resume-paper-aside">
        <button
          type="button"
          class="flex w-full items-center justify-between gap-3 text-left"
          @click="nextStepsOpen = !nextStepsOpen"
        >
          <div>
            <div class="resume-paper-title">下一步建议</div>
            <div class="mt-2 text-lg font-semibold tracking-[-0.02em] text-content-primary">优先处理这些动作</div>
          </div>
          <span class="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-content-muted">
            {{ nextStepsOpen ? "收起" : "展开" }}
            <ChevronDown class="h-4 w-4 transition-transform duration-200" :class="nextStepsOpen ? 'rotate-180' : ''" />
          </span>
        </button>
        <ul v-if="nextStepsOpen" class="mt-4 space-y-3">
          <li v-for="(item, index) in props.diagnosis.next_steps" :key="index" class="resume-paper-annotation">
            <div class="resume-paper-label">Step {{ index + 1 }}</div>
            <div class="mt-2 text-sm leading-6 text-content-secondary">{{ item }}</div>
          </li>
        </ul>
      </div>
    </div>
  </section>
</template>
