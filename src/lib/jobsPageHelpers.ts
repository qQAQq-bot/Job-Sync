import type { Ref } from "vue";

import type { JobDetail, JobRow, KeywordGroup, LoadKeywordOptions } from "./jobs";
import { invoke } from "./tauri";

export const MANUAL_GROUP_KEY = "__manual__";
export const JOBS_REALTIME_REFRESH_DELAY_MS = 800;
export const SEARCH_JOB_LIMIT = 100;

interface JobsExpansionState {
  groups: Ref<KeywordGroup[]>;
  expandedKeyword: Ref<string | null>;
  expandedJobId: Ref<string | null>;
  keywordJobsCache: Map<string, JobRow[]>;
  keywordJobsLoading: Ref<string | null>;
}

interface JobsCacheState {
  groups: Ref<KeywordGroup[]>;
  expandedKeyword: Ref<string | null>;
  expandedJobId: Ref<string | null>;
  keywordJobsCache: Map<string, JobRow[]>;
  detailCache: Map<string, JobDetail | null>;
}

export function groupKey(group: KeywordGroup): string {
  return group.keyword ?? MANUAL_GROUP_KEY;
}

export function bossJobUrl(id: string): string {
  return `https://www.zhipin.com/job_detail/${id}.html`;
}

export function formatDate(ts: string | null): string {
  if (!ts) return "-";
  try {
    const date = new Date(ts);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  } catch {
    return ts;
  }
}

export function canScheduleRealtimeRefresh(currentLoading: boolean, currentPageActive: boolean): boolean {
  return currentPageActive && !currentLoading;
}

export async function restoreExpandedState(
  state: JobsExpansionState,
  prevExpandedKeyword: string | null,
  prevExpandedJobId: string | null,
  options: LoadKeywordOptions,
): Promise<void> {
  if (!prevExpandedKeyword || !state.groups.value.some((group) => groupKey(group) === prevExpandedKeyword)) {
    state.expandedKeyword.value = null;
    state.expandedJobId.value = null;
    return;
  }

  state.expandedKeyword.value = prevExpandedKeyword;
  state.expandedJobId.value = prevExpandedJobId;
  if (options.refreshExpandedList === true) {
    await refreshExpandedGroupJobs(state, prevExpandedKeyword);
  }
}

export async function refreshExpandedGroupJobs(
  state: JobsExpansionState,
  groupKeyStr: string,
): Promise<void> {
  const sourceKeyword = groupKeyStr === MANUAL_GROUP_KEY ? null : groupKeyStr;
  state.keywordJobsLoading.value = groupKeyStr;
  try {
    const expandedJobs = await invoke<JobRow[]>("list_jobs_by_source", { sourceKeyword });
    state.keywordJobsCache.set(groupKeyStr, expandedJobs);
  } catch {
    return;
  } finally {
    state.keywordJobsLoading.value = null;
  }
}

export function removeJobFromCaches(
  state: JobsCacheState,
  job: JobRow,
  groupKeyStr: string,
): void {
  const cached = state.keywordJobsCache.get(groupKeyStr);
  if (cached) {
    const index = cached.findIndex((item) => item.encrypt_job_id === job.encrypt_job_id);
    if (index !== -1) cached.splice(index, 1);
  }

  state.detailCache.delete(job.encrypt_job_id);
  if (state.expandedJobId.value === job.encrypt_job_id) {
    state.expandedJobId.value = null;
  }

  const groupIndex = state.groups.value.findIndex((group) => groupKey(group) === groupKeyStr);
  if (groupIndex === -1) return;
  state.groups.value[groupIndex].job_count -= 1;
  if (state.groups.value[groupIndex].job_count > 0) return;

  state.groups.value.splice(groupIndex, 1);
  state.keywordJobsCache.delete(groupKeyStr);
  if (state.expandedKeyword.value === groupKeyStr) {
    state.expandedKeyword.value = null;
  }
}
