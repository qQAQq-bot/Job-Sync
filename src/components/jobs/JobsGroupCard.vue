<script setup lang="ts">
import type { JobDetail, JobRow, KeywordGroup } from "../../lib/jobs";
import JobsJobItem from "./JobsJobItem.vue";

defineProps<{
  group: KeywordGroup;
  groupKeyValue: string;
  expanded: boolean;
  loading: boolean;
  jobs: JobRow[] | undefined;
  expandedJobId: string | null;
  detailLoadingId: string | null;
  expandedDetail: JobDetail | null;
}>();

defineEmits<{
  (e: "toggle-group", group: KeywordGroup): void;
  (e: "toggle-detail", jobId: string): void;
  (e: "go-ai", jobId: string): void;
  (e: "copy-link", jobId: string): void;
  (e: "delete-job", job: JobRow, groupKeyValue: string): void;
}>();
</script>

<template>
  <div class="overflow-hidden rounded-2xl border border-border/10 bg-card/70 backdrop-blur-sm transition-colors" :class="expanded ? 'border-border/20' : ''">
    <div class="flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-card-hover/60" @click="$emit('toggle-group', group)">
      <svg class="h-4 w-4 shrink-0 text-content-muted transition-transform duration-200" :class="expanded ? 'rotate-90' : ''" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clip-rule="evenodd" />
      </svg>
      <span class="text-sm font-semibold text-content-primary">{{ group.label }}</span>
      <span class="ui-badge">{{ group.job_count }} 个职位</span>
    </div>

    <div v-if="expanded" class="border-t border-border/10">
      <div v-if="loading" class="flex items-center gap-2 px-6 py-4 text-sm text-content-muted">
        <svg class="h-4 w-4 animate-spin text-content-muted" viewBox="0 0 24 24" fill="none">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        加载职位列表…
      </div>
      <template v-else>
        <div v-if="!jobs || jobs.length === 0" class="px-6 py-4 text-sm text-content-muted">暂无职位数据。</div>
        <div v-else class="divide-y divide-border/10">
          <JobsJobItem
            v-for="job in jobs"
            :key="job.encrypt_job_id"
            :job="job"
            :expanded="expandedJobId === job.encrypt_job_id"
            :detail-loading="detailLoadingId === job.encrypt_job_id"
            :detail="expandedJobId === job.encrypt_job_id ? expandedDetail : null"
            :allow-delete="true"
            row-padding-class="px-6"
            detail-padding-class="px-10"
            @toggle-detail="(jobId) => $emit('toggle-detail', jobId)"
            @go-ai="(jobId) => $emit('go-ai', jobId)"
            @copy-link="(jobId) => $emit('copy-link', jobId)"
            @delete="(job) => $emit('delete-job', job, groupKeyValue)"
          />
        </div>
      </template>
    </div>
  </div>
</template>
