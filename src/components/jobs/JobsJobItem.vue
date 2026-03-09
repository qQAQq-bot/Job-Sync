<script setup lang="ts">
import type { JobDetail, JobRow } from "../../lib/jobs";
import { formatDate } from "../../lib/jobsPageHelpers";

withDefaults(
  defineProps<{
    job: JobRow;
    expanded: boolean;
    detailLoading: boolean;
    detail: JobDetail | null;
    allowDelete?: boolean;
    rowPaddingClass?: string;
    detailPaddingClass?: string;
  }>(),
  {
    allowDelete: false,
    rowPaddingClass: "px-4",
    detailPaddingClass: "px-10",
  },
);

defineEmits<{
  (e: "toggle-detail", jobId: string): void;
  (e: "go-ai", jobId: string): void;
  (e: "copy-link", jobId: string): void;
  (e: "delete", job: JobRow): void;
}>();
</script>

<template>
  <div>
    <div
      class="flex cursor-pointer items-center gap-3 py-2.5 transition-colors"
      :class="[rowPaddingClass, expanded ? 'bg-card-hover/80' : 'hover:bg-card-hover/60']"
      @click="$emit('toggle-detail', job.encrypt_job_id)"
    >
      <svg
        class="h-3.5 w-3.5 shrink-0 text-content-muted transition-transform duration-200"
        :class="expanded ? 'rotate-90' : ''"
        viewBox="0 0 20 20"
        fill="currentColor"
      >
        <path
          fill-rule="evenodd"
          d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
          clip-rule="evenodd"
        />
      </svg>

      <div class="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1">
        <span class="truncate text-sm font-medium text-content-primary" style="max-width: 220px;">{{ job.position_name ?? '-' }}</span>
        <span class="truncate text-sm text-content-secondary" style="max-width: 160px;">{{ job.brand_name ?? '-' }}</span>
        <span v-if="job.boss_name" class="truncate text-xs text-content-muted" style="max-width: 120px;">{{ job.boss_name }}</span>
        <span class="ui-badge">{{ job.city_name ?? '-' }}</span>
        <span class="ui-badge bg-emerald-400/10 text-emerald-300 ring-emerald-400/20">{{ job.salary_desc ?? '-' }}</span>
        <span class="text-xs text-content-muted">{{ job.experience_name ?? '' }}</span>
        <span class="text-xs text-content-muted">{{ job.degree_name ?? '' }}</span>
      </div>

      <div class="flex shrink-0 items-center gap-1.5" @click.stop>
        <button class="ui-btn-secondary px-2.5 py-1 text-xs" @click="$emit('go-ai', job.encrypt_job_id)">AI</button>
        <button class="ui-btn-secondary px-2.5 py-1 text-xs" @click="$emit('copy-link', job.encrypt_job_id)">复制</button>
        <button
          v-if="allowDelete"
          class="ui-btn-danger px-2 py-1 text-xs"
          title="删除此职位"
          @click="$emit('delete', job)"
        >
          <svg class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.519.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clip-rule="evenodd" />
          </svg>
        </button>
      </div>
    </div>

    <div v-if="expanded" class="bg-card-alt/70 py-4" :class="detailPaddingClass">
      <div v-if="detailLoading" class="flex items-center gap-2 text-sm text-content-muted">
        <svg class="h-4 w-4 animate-spin text-content-muted" viewBox="0 0 24 24" fill="none">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        加载详情…
      </div>
      <div v-else-if="!detail" class="text-sm text-content-muted">未采集到该职位的详情数据。</div>
      <div v-else class="space-y-3">
        <div class="flex flex-wrap gap-2">
          <span v-if="detail.jobInfo?.jobStatusDesc" class="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-400 ring-1 ring-amber-500/20">{{ detail.jobInfo.jobStatusDesc }}</span>
          <span v-if="detail.bossInfo?.activeTimeDesc" class="ui-badge">{{ detail.bossInfo.activeTimeDesc }}</span>
        </div>
        <div v-if="detail.jobInfo?.postDescription">
          <h4 class="mb-1 text-xs font-semibold text-content-muted">职位描述</h4>
          <div class="max-w-none text-sm leading-relaxed text-content-secondary [&_a]:text-accent [&_a]:underline [&_b]:text-content-primary [&_h1]:text-content-primary [&_h2]:text-content-primary [&_h3]:text-content-primary [&_h4]:text-content-primary [&_li]:text-content-secondary [&_p]:text-content-secondary [&_strong]:text-content-primary" v-html="detail.jobInfo.postDescription" />
        </div>
        <div v-if="detail.jobInfo?.skills?.length || detail.jobInfo?.showSkills?.length">
          <h4 class="mb-1 text-xs font-semibold text-content-muted">技能要求</h4>
          <div class="flex flex-wrap gap-1">
            <span v-for="skill in (detail.jobInfo.skills?.length ? detail.jobInfo.skills : detail.jobInfo.showSkills) || []" :key="skill" class="rounded-full bg-blue-500/10 px-2 py-0.5 text-xs text-blue-400">{{ skill }}</span>
          </div>
        </div>
        <div v-if="detail.jobInfo?.jobLabels?.length">
          <h4 class="mb-1 text-xs font-semibold text-content-muted">职位标签</h4>
          <div class="flex flex-wrap gap-1">
            <span v-for="label in detail.jobInfo.jobLabels" :key="label" class="rounded-full bg-violet-500/10 px-2 py-0.5 text-xs text-violet-400">{{ label }}</span>
          </div>
        </div>
        <div v-if="detail.jobInfo?.address">
          <h4 class="mb-1 text-xs font-semibold text-content-muted">工作地址</h4>
          <p class="text-sm text-content-secondary">{{ detail.jobInfo.address }}</p>
        </div>
        <div class="grid gap-3 sm:grid-cols-2">
          <div v-if="detail.brandComInfo || detail.brandInfo">
            <h4 class="mb-1 text-xs font-semibold text-content-muted">公司信息</h4>
            <dl class="space-y-0.5 text-sm">
              <div v-if="detail.brandComInfo?.brandName || detail.brandInfo?.brandName" class="flex gap-1.5"><dt class="text-content-muted">公司</dt><dd class="text-content-secondary">{{ detail.brandComInfo?.brandName ?? detail.brandInfo?.brandName }}</dd></div>
              <div v-if="detail.brandComInfo?.industryName || detail.brandInfo?.industryName" class="flex gap-1.5"><dt class="text-content-muted">行业</dt><dd class="text-content-secondary">{{ detail.brandComInfo?.industryName ?? detail.brandInfo?.industryName }}</dd></div>
              <div v-if="detail.brandComInfo?.scaleName || detail.brandInfo?.scaleName" class="flex gap-1.5"><dt class="text-content-muted">规模</dt><dd class="text-content-secondary">{{ detail.brandComInfo?.scaleName ?? detail.brandInfo?.scaleName }}</dd></div>
              <div v-if="detail.brandComInfo?.stageName || detail.brandInfo?.stage" class="flex gap-1.5"><dt class="text-content-muted">融资</dt><dd class="text-content-secondary">{{ detail.brandComInfo?.stageName ?? detail.brandInfo?.stage }}</dd></div>
            </dl>
          </div>
          <div v-if="detail.bossInfo">
            <h4 class="mb-1 text-xs font-semibold text-content-muted">招聘者</h4>
            <dl class="space-y-0.5 text-sm">
              <div v-if="detail.bossInfo.name || detail.bossInfo.bossName" class="flex gap-1.5"><dt class="text-content-muted">姓名</dt><dd class="text-content-secondary">{{ detail.bossInfo.name ?? detail.bossInfo.bossName }}</dd></div>
              <div v-if="detail.bossInfo.title || detail.bossInfo.bossTitle" class="flex gap-1.5"><dt class="text-content-muted">职称</dt><dd class="text-content-secondary">{{ detail.bossInfo.title ?? detail.bossInfo.bossTitle }}</dd></div>
              <div v-if="detail.bossInfo.activeTimeDesc" class="flex gap-1.5"><dt class="text-content-muted">活跃</dt><dd class="text-content-secondary">{{ detail.bossInfo.activeTimeDesc }}</dd></div>
            </dl>
          </div>
        </div>
        <div class="flex flex-wrap gap-x-4 gap-y-1 border-t border-border/10 pt-2 text-xs text-content-muted">
          <span>最后采集: {{ formatDate(job.last_seen_at) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
