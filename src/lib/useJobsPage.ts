import { computed, onActivated, onDeactivated, onMounted, reactive, ref, watch } from "vue";
import { useRouter } from "vue-router";

import type { JobDetail, JobRow, KeywordGroup, LoadKeywordOptions } from "./jobs";
import {
  bossJobUrl,
  canScheduleRealtimeRefresh,
  formatDate,
  groupKey,
  JOBS_REALTIME_REFRESH_DELAY_MS,
  removeJobFromCaches,
  restoreExpandedState,
  SEARCH_JOB_LIMIT,
} from "./jobsPageHelpers";
import { runtime } from "./runtime";
import { invoke, isTauri } from "./tauri";

interface ConfirmDialogState {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  loading: boolean;
  action: (() => Promise<void>) | null;
}
export function useJobsPage() {
  const tauri = isTauri();
  const router = useRouter();
  const search = ref("");
  const loading = ref(false);
  const error = ref<string | null>(null);
  const groups = ref<KeywordGroup[]>([]);
  const flatResults = ref<JobRow[]>([]);
  const isSearchMode = ref(false);
  const expandedKeyword = ref<string | null>(null);
  const expandedJobId = ref<string | null>(null);
  const keywordJobsCache = reactive<Map<string, JobRow[]>>(new Map());
  const keywordJobsLoading = ref<string | null>(null);
  const detailCache = reactive<Map<string, JobDetail | null>>(new Map());
  const detailLoading = ref<string | null>(null);
  const confirmDialog = reactive<ConfirmDialogState>({
    visible: false,
    title: "",
    message: "",
    confirmLabel: "确认",
    loading: false,
    action: null,
  });
  let isPageActive = true;
  let hasBeenDeactivated = false;
  let refreshTimer: number | null = null;
  let pendingRealtimeRefresh = false;

  const expandedDetail = computed<JobDetail | null>(() => {
    if (!expandedJobId.value) return null;
    return detailCache.get(expandedJobId.value) ?? null;
  });
  function goAi(jobId: string): void {
    void router.push({ path: "/ai", query: { jobId } });
  }
  function scheduleRealtimeRefresh(): void {
    if (!tauri || !canScheduleRealtimeRefresh(loading.value, isPageActive)) {
      pendingRealtimeRefresh = true;
      return;
    }
    if (refreshTimer !== null) return;
    refreshTimer = window.setTimeout(() => {
      refreshTimer = null;
      void loadKeywords({ preserveExpanded: true, refreshExpandedList: true });
    }, JOBS_REALTIME_REFRESH_DELAY_MS);
  }
  function showConfirm(
    title: string,
    message: string,
    action: () => Promise<void>,
    confirmLabel = "确认删除",
  ): void {
    confirmDialog.title = title;
    confirmDialog.message = message;
    confirmDialog.confirmLabel = confirmLabel;
    confirmDialog.action = action;
    confirmDialog.loading = false;
    confirmDialog.visible = true;
  }
  function closeConfirm(): void {
    confirmDialog.visible = false;
    confirmDialog.action = null;
    confirmDialog.loading = false;
  }
  async function executeConfirm(): Promise<void> {
    if (!confirmDialog.action) return;
    confirmDialog.loading = true;
    try {
      await confirmDialog.action();
    } finally {
      closeConfirm();
    }
  }
  async function loadKeywords(options: LoadKeywordOptions = {}): Promise<void> {
    error.value = null;
    if (!tauri) return;
    loading.value = true;
    const preserveExpanded = options.preserveExpanded === true;
    const prevExpandedKeyword = expandedKeyword.value;
    const prevExpandedJobId = expandedJobId.value;
    if (!preserveExpanded) {
      expandedKeyword.value = null;
      expandedJobId.value = null;
    }

    const term = search.value.trim() || null;
    isSearchMode.value = !!term;

    try {
      const [nextGroups, nextFlatResults] = await Promise.all([
        invoke<KeywordGroup[]>("list_source_keywords", { search: term }),
        term
          ? invoke<JobRow[]>("list_jobs", { keyword: term, city: null, limit: SEARCH_JOB_LIMIT, offset: 0 })
          : Promise.resolve([]),
      ]);

      groups.value = nextGroups;
      flatResults.value = nextFlatResults;
      await restoreExpandedState(
        { groups, expandedKeyword, expandedJobId, keywordJobsCache, keywordJobsLoading },
        prevExpandedKeyword,
        prevExpandedJobId,
        options,
      );
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : String(cause);
    } finally {
      loading.value = false;
      if (pendingRealtimeRefresh && isPageActive) {
        pendingRealtimeRefresh = false;
        scheduleRealtimeRefresh();
      }
    }
  }
  async function toggleKeyword(group: KeywordGroup): Promise<void> {
    const key = groupKey(group);
    if (expandedKeyword.value === key) {
      expandedKeyword.value = null;
      expandedJobId.value = null;
      return;
    }

    expandedKeyword.value = key;
    expandedJobId.value = null;
    if (keywordJobsCache.has(key)) return;

    keywordJobsLoading.value = key;
    try {
      const jobs = await invoke<JobRow[]>("list_jobs_by_source", { sourceKeyword: group.keyword });
      keywordJobsCache.set(key, jobs);
    } catch {
      keywordJobsCache.set(key, []);
    } finally {
      keywordJobsLoading.value = null;
    }
  }
  async function toggleDetail(id: string): Promise<void> {
    if (expandedJobId.value === id) {
      expandedJobId.value = null;
      return;
    }

    expandedJobId.value = id;
    if (detailCache.get(id)) return;

    detailLoading.value = id;
    try {
      const detail = await invoke<JobDetail | null>("get_job_detail", { encryptJobId: id });
      if (detail) {
        detailCache.set(id, detail);
      }
    } finally {
      detailLoading.value = null;
    }
  }
  async function copy(text: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      return;
    }
  }
  async function deleteJob(job: JobRow, groupKeyStr: string): Promise<void> {
    const name = job.position_name ?? job.encrypt_job_id;
    showConfirm("删除职位", `确认删除「${name}」？此操作不可撤销。`, async () => {
      try {
        await invoke<void>("delete_job", { encryptJobId: job.encrypt_job_id });
      } catch (cause) {
        error.value = cause instanceof Error ? cause.message : String(cause);
        return;
      }

      removeJobFromCaches(
        { groups, expandedKeyword, expandedJobId, keywordJobsCache, detailCache },
        job,
        groupKeyStr,
      );
    });
  }
  async function deleteAllJobs(): Promise<void> {
    showConfirm(
      "清空全部职位",
      "确认清空全部职位数据？所有职位、详情、AI 报告都将被删除，此操作不可撤销。",
      async () => {
        try {
          await invoke<void>("delete_all_jobs");
        } catch (cause) {
          error.value = cause instanceof Error ? cause.message : String(cause);
          return;
        }

        groups.value = [];
        keywordJobsCache.clear();
        detailCache.clear();
        expandedKeyword.value = null;
        expandedJobId.value = null;
      },
    );
  }
  onMounted(() => {
    void loadKeywords();
  });

  onActivated(() => {
    isPageActive = true;
    if (!hasBeenDeactivated) return;
    pendingRealtimeRefresh = false;
    void loadKeywords({ preserveExpanded: true, refreshExpandedList: true });
  });

  onDeactivated(() => {
    isPageActive = false;
    hasBeenDeactivated = true;
    if (refreshTimer === null) return;
    window.clearTimeout(refreshTimer);
    refreshTimer = null;
  });

  watch(
    () => runtime.finishedCounter,
    () => {
      keywordJobsCache.clear();
      detailCache.clear();
      expandedJobId.value = null;
      flatResults.value = [];
      void loadKeywords();
    },
  );
  watch(
    () => runtime.progress.captured_job_list,
    () => {
      scheduleRealtimeRefresh();
    },
  );
  watch(
    () => runtime.lastDetailCapturedId,
    (id) => {
      if (id) detailCache.delete(id);
    },
  );
  return {
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
    formatDate,
    closeConfirm,
    executeConfirm,
  };
}
