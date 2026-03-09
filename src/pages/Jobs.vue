<script setup lang="ts">
import JobsConfirmDialog from "../components/jobs/JobsConfirmDialog.vue";
import JobsExportPanel from "../components/jobs/JobsExportPanel.vue";
import JobsGroupCard from "../components/jobs/JobsGroupCard.vue";
import JobsJobItem from "../components/jobs/JobsJobItem.vue";
import { useJobsPage } from "../lib/useJobsPage";

const {
  tauri,
  search,
  loading,
  error,
  groups,
  flatResults,
  isSearchMode,
  expandedKeyword,
  expandedJobId,
  keywordJobsCache,
  keywordJobsLoading,
  detailLoading,
  confirmDialog,
  expandedDetail,
  groupKey,
  bossJobUrl,
  goAi,
  loadKeywords,
  toggleKeyword,
  toggleDetail,
  copy,
  deleteJob,
  deleteAllJobs,
  closeConfirm,
  executeConfirm,
} = useJobsPage();
</script>

<template>
  <section class="space-y-5">
    <header class="space-y-1">
      <h1 class="text-xl font-semibold text-content-primary">职位库</h1>
      <p class="text-sm text-content-secondary">按采集关键词分组浏览，展开关键词查看职位列表，再展开职位查看详情。</p>
    </header>

    <div v-if="!tauri" class="ui-status-warning p-4 text-sm">当前是浏览器模式（非 Tauri）。查询命令不可用。</div>

    <div class="ui-toolbar flex flex-wrap items-center gap-2 px-3 py-3">
      <input v-model="search" class="ui-input w-72" placeholder="搜索关键词 / 职位名 / 公司名…" @keyup.enter="() => loadKeywords()" />
      <button class="ui-btn-primary" :disabled="!tauri || loading" @click="() => loadKeywords()">{{ loading ? '加载中…' : '搜索' }}</button>
      <button v-if="isSearchMode" class="ui-btn-secondary" @click="search = ''; loadKeywords()">清除搜索</button>
      <button v-if="groups.length > 0" class="ui-btn-danger" :disabled="!tauri || loading" @click="deleteAllJobs">清空全部</button>
      <span class="ui-badge">{{ isSearchMode ? `搜索到 ${flatResults.length} 个职位` : `${groups.length} 个关键词组` }}</span>
    </div>

    <div v-if="error" class="ui-status-danger p-4 text-sm">{{ error }}</div>

    <JobsExportPanel />

    <div v-if="isSearchMode && flatResults.length > 0" class="space-y-2">
      <div class="text-[10px] font-semibold uppercase tracking-[0.24em] text-content-muted">职位搜索结果</div>
      <div class="ui-panel overflow-hidden">
        <div class="divide-y divide-border/10">
          <JobsJobItem
            v-for="job in flatResults"
            :key="`flat-${job.encrypt_job_id}`"
            :job="job"
            :expanded="expandedJobId === job.encrypt_job_id"
            :detail-loading="detailLoading === job.encrypt_job_id"
            :detail="expandedJobId === job.encrypt_job_id ? expandedDetail : null"
            @toggle-detail="(jobId) => toggleDetail(jobId)"
            @go-ai="(jobId) => goAi(jobId)"
            @copy-link="(jobId) => copy(bossJobUrl(jobId))"
          />
        </div>
      </div>
    </div>

    <div v-else-if="isSearchMode" class="ui-panel px-4 py-10 text-center text-sm text-content-muted">未找到匹配的职位或关键词，请尝试其他搜索词。</div>

    <div v-if="isSearchMode && groups.length > 0" class="text-xs font-semibold uppercase tracking-wider text-content-muted">匹配的关键词组</div>

    <div class="space-y-2">
      <JobsGroupCard
        v-for="group in groups"
        :key="groupKey(group)"
        :group="group"
        :group-key-value="groupKey(group)"
        :expanded="expandedKeyword === groupKey(group)"
        :loading="keywordJobsLoading === groupKey(group)"
        :jobs="keywordJobsCache.get(groupKey(group))"
        :expanded-job-id="expandedJobId"
        :detail-loading-id="detailLoading"
        :expanded-detail="expandedDetail"
        @toggle-group="(group) => toggleKeyword(group)"
        @toggle-detail="(jobId) => toggleDetail(jobId)"
        @go-ai="(jobId) => goAi(jobId)"
        @copy-link="(jobId) => copy(bossJobUrl(jobId))"
        @delete-job="(job, groupKeyValue) => deleteJob(job, groupKeyValue)"
      />
    </div>

    <div v-if="groups.length === 0 && !loading && !isSearchMode" class="ui-panel px-4 py-12 text-center text-sm text-content-muted">暂无数据。</div>

    <JobsConfirmDialog
      :visible="confirmDialog.visible"
      :title="confirmDialog.title"
      :message="confirmDialog.message"
      :confirm-label="confirmDialog.confirmLabel"
      :loading="confirmDialog.loading"
      @close="closeConfirm"
      @confirm="executeConfirm"
    />
  </section>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
