import { computed, onActivated, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { confirm } from "@tauri-apps/plugin-dialog";
import type { AiGroupReport, AiResumeReport } from "./aiReport";
import { isAiGroupReport, isAiResumeReport } from "./aiReport";
import type { AiReportMeta, KindFilter } from "./aiReportsMeta";
import { invoke, isTauri } from "./tauri";

const REPORTS_PAGE_SIZE = 100;
const QUERY_DEBOUNCE_MS = 250;

interface LoadReportsOptions { readonly forceOpenFirst?: boolean; }

function formatTs(ts: string): string {
  const trimmed = (ts ?? "").toString().trim();
  if (!trimmed) return "-";
  const d = new Date(trimmed);
  if (Number.isNaN(d.getTime())) return trimmed;
  return d.toLocaleString();
}

export function useAiReportsPage() {
  const tauri = isTauri();
  const route = useRoute();
  const router = useRouter();
  const loading = ref(false);
  const error = ref<string | null>(null);
  const reports = ref<AiReportMeta[]>([]);
  const query = ref("");
  const kind = ref<KindFilter>("all");
  const drawerOpen = ref(false);
  const page = ref(1);
  const hasMore = ref(false);
  const selectedId = ref<number | null>(null);
  const reportLoading = ref(false);
  const reportError = ref<string | null>(null);
  const selectedRaw = ref<unknown | null>(null);
  const selectedMetaSnapshot = ref<AiReportMeta | null>(null);

  const suppressAutoReload = ref(false);
  let queryDebounceTimer = 0;
  let openReportSeq = 0;

  const drillBackMeta = ref<AiReportMeta | null>(null);

  const selectedMeta = computed(() => selectedMetaSnapshot.value);
  const selectedGroup = computed<AiGroupReport | null>(() => (selectedRaw.value && isAiGroupReport(selectedRaw.value) ? (selectedRaw.value as AiGroupReport) : null));
  const selectedResume = computed<AiResumeReport | null>(() => (selectedRaw.value && isAiResumeReport(selectedRaw.value) ? (selectedRaw.value as AiResumeReport) : null));

  const selectedIndex = computed(() => {
    if (selectedId.value === null) return -1;
    return reports.value.findIndex((r) => r.id === selectedId.value);
  });
  const prevMeta = computed(() => {
    const idx = selectedIndex.value;
    if (idx <= 0) return null;
    return reports.value[idx - 1] ?? null;
  });
  const nextMeta = computed(() => {
    const idx = selectedIndex.value;
    if (idx === -1) return null;
    return reports.value[idx + 1] ?? null;
  });

  async function openReport(meta: AiReportMeta): Promise<void> {
    if (!tauri) return;
    const seq = ++openReportSeq;
    selectedId.value = meta.id;
    selectedMetaSnapshot.value = meta;
    reportLoading.value = true;
    reportError.value = null;
    selectedRaw.value = null;
    try {
      const raw = await invoke<unknown>("get_ai_report", { id: meta.id });
      if (seq === openReportSeq) selectedRaw.value = raw;
    } catch (e) {
      if (seq !== openReportSeq) return;
      reportError.value = e instanceof Error ? e.message : String(e);
      selectedRaw.value = null;
    } finally {
      if (seq === openReportSeq) reportLoading.value = false;
    }
  }

  async function loadReportsPage(nextPage: number, options: LoadReportsOptions = {}): Promise<void> {
    if (!tauri) return;
    loading.value = true;
    error.value = null;
    try {
      const safePage = Math.max(1, Math.floor(nextPage));
      const offset = (safePage - 1) * REPORTS_PAGE_SIZE;
      const rows = await invoke<AiReportMeta[]>("list_ai_reports", {
        limit: REPORTS_PAGE_SIZE + 1,
        offset,
        kind: kind.value === "all" ? null : kind.value,
        query: query.value.trim() ? query.value.trim() : null,
      });
      hasMore.value = rows.length > REPORTS_PAGE_SIZE;
      reports.value = rows.slice(0, REPORTS_PAGE_SIZE);
      page.value = safePage;
      const shouldOpenFirst = options.forceOpenFirst ?? selectedId.value === null;
      if (shouldOpenFirst && reports.value.length) {
        await openReport(reports.value[0]);
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e);
      reports.value = [];
      hasMore.value = false;
      page.value = 1;
    } finally {
      loading.value = false;
    }
  }

  function clearOpenQueryParam(): void {
    if (!route.query.open) return;
    const nextQuery = { ...route.query };
    delete nextQuery.open;
    void router.replace({ query: nextQuery });
  }

  async function openLatestFromQuery(): Promise<void> {
    suppressAutoReload.value = true;
    try {
      window.clearTimeout(queryDebounceTimer);
      kind.value = "all";
      query.value = "";
      await loadReportsPage(1, { forceOpenFirst: true });
    } finally {
      suppressAutoReload.value = false;
      clearOpenQueryParam();
    }
  }

  async function selectReport(meta: AiReportMeta): Promise<void> {
    drillBackMeta.value = null;
    await openReport(meta);
  }

  function openDrawer(): void {
    if (!tauri) return;
    drawerOpen.value = true;
  }

  async function openResumeReportForJob(jobId: string): Promise<void> {
    if (!tauri) return;
    const trimmed = jobId.trim();
    if (!trimmed) return;

    reportError.value = null;
    reportLoading.value = true;
    try {
      const rows = await invoke<AiReportMeta[]>("list_ai_reports", {
        limit: 1,
        offset: 0,
        kind: "resume",
        query: trimmed,
      });
      if (!rows.length) {
        reportError.value = "未找到该岗位对应的报告（请先在 AI 页面对该岗位生成报告）。";
        return;
      }

      if (selectedMetaSnapshot.value?.kind === "group") {
        drillBackMeta.value = selectedMetaSnapshot.value;
      }

      suppressAutoReload.value = true;
      try {
        window.clearTimeout(queryDebounceTimer);
        kind.value = "resume";
        query.value = trimmed;
      } finally {
        suppressAutoReload.value = false;
      }

      await loadReportsPage(1, { forceOpenFirst: true });
    } catch (e) {
      reportError.value = e instanceof Error ? e.message : String(e);
    } finally {
      reportLoading.value = false;
    }
  }

  async function drillBackToGroup(): Promise<void> {
    if (!tauri) return;
    const meta = drillBackMeta.value;
    if (!meta) return;
    drillBackMeta.value = null;

    suppressAutoReload.value = true;
    try {
      window.clearTimeout(queryDebounceTimer);
      kind.value = "group";
      query.value = "";
    } finally {
      suppressAutoReload.value = false;
    }

    await loadReportsPage(1);
    await openReport(meta);
  }

  async function openPrev(): Promise<void> {
    if (!prevMeta.value) return;
    await selectReport(prevMeta.value);
  }

  async function openNext(): Promise<void> {
    if (!nextMeta.value) return;
    await selectReport(nextMeta.value);
  }

  async function clearReports(): Promise<void> {
    if (!tauri) return;
    const ok = await confirm("确定要清空本地缓存的全部 AI 报告吗？该操作不可撤销。", { title: "清空 AI 报告", kind: "warning", okLabel: "清空", cancelLabel: "取消" });
    if (!ok) return;
    loading.value = true;
    error.value = null;
    try {
      await invoke("clear_ai_reports");
      reports.value = []; openReportSeq += 1; reportLoading.value = false;
      hasMore.value = false;
      page.value = 1;
      selectedId.value = null;
      selectedMetaSnapshot.value = null;
      selectedRaw.value = null;
      reportError.value = null;
      drillBackMeta.value = null;
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e);
    } finally {
      loading.value = false;
    }
  }

  watch(
    () => route.query.open,
    (value) => {
      if (value !== "latest") return;
      void openLatestFromQuery();
    },
    { immediate: true },
  );

  watch(kind, (next, prev) => {
    if (!tauri) return;
    if (suppressAutoReload.value) return;
    if (next === prev) return;
    const currentKind = selectedMetaSnapshot.value?.kind ?? null;
    const shouldForceOpen = next !== "all" && currentKind !== next;
    void loadReportsPage(1, shouldForceOpen ? { forceOpenFirst: true } : {});
  });

  watch(query, () => {
    if (!tauri) return;
    if (suppressAutoReload.value) return;
    window.clearTimeout(queryDebounceTimer);
    queryDebounceTimer = window.setTimeout(() => {
      void loadReportsPage(1);
    }, QUERY_DEBOUNCE_MS);
  });

  onActivated(() => {
    if (route.query.open === "latest") return;
    if (!reports.value.length) void loadReportsPage(1);
  });

  return {
    tauri,
    loading,
    error,
    reports,
    query,
    kind,
    drawerOpen,
    page,
    hasMore,
    selectedId,
    reportLoading,
    reportError,
    selectedRaw,
    selectedMeta,
    selectedGroup,
    selectedResume,
    drillBackMeta,
    prevMeta,
    nextMeta,
    formatTs,
    loadReportsPage,
    openDrawer,
    selectReport,
    openResumeReportForJob,
    drillBackToGroup,
    openPrev,
    openNext,
    clearReports,
  };
}
