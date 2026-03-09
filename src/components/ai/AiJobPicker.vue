<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import UiSelect from "../ui/UiSelect.vue";
import {
  aiSelectedJobs,
  removeAiSelectedJob,
  upsertAiSelectedJob,
  type AiJobLite,
} from "../../lib/aiSelection.ts";
import { invoke } from "../../lib/tauri.ts";
type JobRowLite = AiJobLite;
const props = defineProps<{
  tauri: boolean;
  jobId?: string | null;
}>();
const selectedJobs = aiSelectedJobs;
const jobSearch = ref("");
const jobCandidates = ref<JobRowLite[]>([]);
const jobsLoading = ref(false);
const jobSearchCommitted = ref("");
const jobSearchPage = ref(1);
const jobSearchPageSize = ref("20");
const jobSearchHasMore = ref(false);

function selectJob(job: JobRowLite): void {
  upsertAiSelectedJob(job);
}

function removeJob(id: string): void {
  removeAiSelectedJob(id);
}

function resetJobSearchResults(): void {
  jobCandidates.value = [];
  jobSearchCommitted.value = "";
  jobSearchPage.value = 1;
  jobSearchHasMore.value = false;
}
async function loadJobCandidatesPage(page: number): Promise<void> {
  if (!props.tauri) return;
  const query = jobSearchCommitted.value.trim();
  if (!query) {
    resetJobSearchResults();
    return;
  }
  const pageSizeRaw = Number(jobSearchPageSize.value);
  const pageSize = Number.isFinite(pageSizeRaw) && pageSizeRaw > 0 ? Math.round(pageSizeRaw) : 20;
  const safePage = Math.max(1, Math.floor(page));
  const offset = (safePage - 1) * pageSize;

  jobsLoading.value = true;
  try {
    const rows = await invoke<JobRowLite[]>("list_jobs", {
      keyword: query,
      city: null,
      limit: pageSize + 1,
      offset,
    });
    jobSearchHasMore.value = rows.length > pageSize;
    jobCandidates.value = rows.slice(0, pageSize);
    jobSearchPage.value = safePage;
  } catch {
    jobCandidates.value = [];
    jobSearchHasMore.value = false;
    jobSearchPage.value = 1;
  } finally {
    jobsLoading.value = false;
  }
}
async function searchJobs(): Promise<void> {
  if (!props.tauri) return;
  const query = jobSearch.value.trim();
  if (!query) {
    resetJobSearchResults();
    return;
  }
  jobSearchCommitted.value = query;
  await loadJobCandidatesPage(1);
}
async function prevJobCandidatesPage(): Promise<void> {
  if (jobSearchPage.value <= 1) return;
  await loadJobCandidatesPage(jobSearchPage.value - 1);
}
async function nextJobCandidatesPage(): Promise<void> {
  if (!jobSearchHasMore.value) return;
  await loadJobCandidatesPage(jobSearchPage.value + 1);
}

watch(jobSearchPageSize, () => {
  if (!jobSearchCommitted.value.trim()) return;
  void loadJobCandidatesPage(1);
});

async function loadJobById(jobId: string): Promise<void> {
  if (!props.tauri) return;
  const trimmed = jobId.trim();
  if (!trimmed) return;
  try {
    const jobs = await invoke<JobRowLite[]>("list_jobs", {
      keyword: trimmed,
      city: null,
      limit: 5,
      offset: 0,
    });
    const match = jobs.find((j) => j.encrypt_job_id === trimmed);
    upsertAiSelectedJob(
      match ?? {
        encrypt_job_id: trimmed,
        position_name: null,
        boss_name: null,
        brand_name: null,
        city_name: null,
        salary_desc: null,
        experience_name: null,
        degree_name: null,
      },
    );
  } catch {
    upsertAiSelectedJob({
      encrypt_job_id: trimmed,
      position_name: null,
      boss_name: null,
      brand_name: null,
      city_name: null,
      salary_desc: null,
      experience_name: null,
      degree_name: null,
    });
  }
}

onMounted(() => {
  if (typeof props.jobId === "string" && props.jobId.trim()) {
    void loadJobById(props.jobId.trim());
  }
});

watch(
  () => props.jobId,
  (newId) => {
    if (typeof newId === "string" && newId.trim()) {
      void loadJobById(newId.trim());
    }
  },
);
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center gap-2">
      <div class="text-[10px] font-semibold uppercase tracking-[0.24em] text-content-muted">选择职位</div>
      <span v-if="selectedJobs.length" class="ui-badge">已选 {{ selectedJobs.length }} 个</span>
    </div>

    <div v-if="selectedJobs.length" class="flex flex-wrap gap-2">
      <div
        v-for="job in selectedJobs"
        :key="job.encrypt_job_id"
        class="flex items-center gap-1.5 rounded-xl bg-border-glow/10 px-3 py-1.5 ring-1 ring-border-glow/15"
      >
        <span class="max-w-[200px] truncate text-xs font-medium text-content-primary">
          {{ job.position_name ?? job.encrypt_job_id }}
        </span>
        <span v-if="job.brand_name" class="max-w-[120px] truncate text-xs text-content-muted">
          {{ job.brand_name }}
        </span>
        <button
          class="ml-0.5 shrink-0 rounded-full p-0.5 text-content-muted transition-colors hover:bg-card-hover/80 hover:text-accent-danger"
          @click="removeJob(job.encrypt_job_id)"
        >
          <svg class="h-3 w-3" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
          </svg>
        </button>
      </div>
    </div>

    <div class="ui-panel-muted p-4">
      <div class="flex flex-wrap items-center gap-2">
        <input
          v-model="jobSearch"
          class="min-w-0 flex-1 ui-input"
          placeholder="搜索：职位 / 公司 / 招聘者 / 城市 / 薪资 / 学历 / 经验…"
          @keyup.enter="searchJobs"
        />
        <button
          class="ui-btn-primary"
          :disabled="!tauri || jobsLoading"
          @click="searchJobs"
        >
          {{ jobsLoading ? "搜索中…" : "搜索" }}
        </button>
      </div>

      <div
        v-if="jobSearchCommitted && jobCandidates.length"
        class="ui-panel mt-3 overflow-hidden"
      >
        <div class="ui-toolbar flex flex-wrap items-center justify-between gap-2 rounded-none border-0 border-b border-border/10 px-3 py-2">
          <div class="min-w-0 flex items-center gap-2">
            <span class="text-xs font-semibold text-content-secondary">搜索结果</span>
            <span
              class="ui-badge max-w-[160px] truncate"
            >
              {{ jobSearchCommitted }}
            </span>
            <span class="ui-badge">
              第 {{ jobSearchPage }} 页
            </span>
            <span class="text-[11px] text-content-muted">当前 {{ jobCandidates.length }} 条</span>
          </div>

          <div class="flex items-center gap-2">
            <div class="w-28">
              <UiSelect v-model="jobSearchPageSize">
                <option value="20">每页 20</option>
                <option value="50">每页 50</option>
                <option value="100">每页 100</option>
              </UiSelect>
            </div>

            <button
              type="button"
              class="ui-btn-secondary px-3 py-2 text-xs"
              :disabled="jobsLoading || jobSearchPage <= 1"
              @click="prevJobCandidatesPage"
            >
              上一页
            </button>
            <button
              type="button"
              class="ui-btn-secondary px-3 py-2 text-xs"
              :disabled="jobsLoading || !jobSearchHasMore"
              @click="nextJobCandidatesPage"
            >
              下一页
            </button>

            <button
              type="button"
              class="ui-icon-btn h-9 w-9"
              aria-label="关闭搜索结果"
              @click="resetJobSearchResults"
            >
              <svg class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
              </svg>
            </button>
          </div>
        </div>

        <div class="max-h-56 divide-y divide-border/10 overflow-auto">
          <button
            v-for="j in jobCandidates"
            :key="j.encrypt_job_id"
            type="button"
            class="group flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm transition-colors duration-150 hover:bg-card-hover/75"
            :class="selectedJobs.some((s) => s.encrypt_job_id === j.encrypt_job_id) ? 'cursor-default opacity-50' : ''"
            :disabled="selectedJobs.some((s) => s.encrypt_job_id === j.encrypt_job_id)"
            @click="selectJob(j)"
          >
            <div class="min-w-0">
              <div class="truncate font-medium text-content-primary">
                {{ j.position_name ?? "-" }}
              </div>
              <div class="truncate text-xs text-content-muted">
                {{
                  [
                    j.brand_name,
                    j.boss_name,
                    j.city_name,
                    j.salary_desc,
                    j.experience_name,
                    j.degree_name,
                  ]
                    .filter(Boolean)
                    .join(" · ")
                }}
              </div>
            </div>
            <span class="shrink-0 text-xs text-accent">
              {{ selectedJobs.some((s) => s.encrypt_job_id === j.encrypt_job_id) ? "已选" : "选择" }}
            </span>
          </button>
        </div>
      </div>

      <div
        v-else-if="!jobsLoading && jobSearchCommitted"
        class="ui-panel-muted mt-3 py-3 text-center text-xs text-content-muted"
      >
        未找到匹配的职位（{{ jobSearchCommitted }}），请尝试更具体的关键词。
      </div>
    </div>
  </div>
</template>
