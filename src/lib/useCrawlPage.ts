import { computed, onMounted, onUnmounted, ref, watch } from "vue";

import {
  asBossOptions,
  BOSS_META_SYNC_TIMEOUT_MS,
  buildBossCityGroups,
  buildBossIndustryGroups,
  CRAWL_TASK_TYPE_AUTO,
  CRAWL_TASK_TYPE_LOGIN,
  CRAWL_TASK_TYPE_MANUAL,
  CRAWL_TASK_TYPE_META_SYNC,
  DEFAULT_CRAWL_MODE,
  DEFAULT_DELAY_MS,
  DEFAULT_MAX_JOBS,
  DEFAULT_MAX_PAGES,
  filterBossOptions,
  parseList,
  type BossCityGroup,
  type BossOption,
  type BossIndustryGroup,
  type CrawlMode,
} from "./crawl";
import { clearLogs, runtime } from "./runtime";
import { invoke, isTauri } from "./tauri";

export function useCrawlPage() {
  const tauri = isTauri();
  const mode = ref<CrawlMode>(DEFAULT_CRAWL_MODE);
  const keywordsText = ref("");
  const cityText = ref("");
  const salaryText = ref("");
  const experienceText = ref("");
  const degreeText = ref("");
  const industryText = ref("");
  const scaleText = ref("");
  const selectedCity = ref("");
  const selectedSalary = ref("");
  const selectedExperience = ref("");
  const selectedDegree = ref("");
  const selectedIndustry = ref("");
  const selectedScale = ref("");
  const maxPages = ref(DEFAULT_MAX_PAGES);
  const maxJobs = ref(DEFAULT_MAX_JOBS);
  const delayMs = ref(DEFAULT_DELAY_MS);
  const actionBusy = ref(false);
  const error = ref<string | null>(null);
  const loginExists = ref<boolean | null>(null);
  const loginLoading = ref(false);
  const loginError = ref<string | null>(null);
  const bossMetaLoading = ref(false);
  const bossMetaSyncing = ref(false);
  const bossMetaError = ref<string | null>(null);
  let bossMetaSyncTimeout: number | null = null;

  const bossMetaSyncedAt = computed(() => (runtime.bossMeta as any)?.synced_at as string | undefined);
  const bossCityGroups = computed<BossCityGroup[]>(() => buildBossCityGroups(runtime.bossMeta));
  const bossHotCities = computed<BossOption[]>(() => asBossOptions((runtime.bossMeta as any)?.city_group?.hotCityList));
  const bossSalaryOptions = computed<BossOption[]>(() => filterBossOptions((runtime.bossMeta as any)?.filter_conditions?.salaryList));
  const bossExperienceOptions = computed<BossOption[]>(() => filterBossOptions((runtime.bossMeta as any)?.filter_conditions?.experienceList));
  const bossDegreeOptions = computed<BossOption[]>(() => filterBossOptions((runtime.bossMeta as any)?.filter_conditions?.degreeList));
  const bossScaleOptions = computed<BossOption[]>(() => filterBossOptions((runtime.bossMeta as any)?.filter_conditions?.scaleList));
  const bossIndustryGroups = computed<BossIndustryGroup[]>(() => buildBossIndustryGroups(runtime.bossMeta));
  const bossMetaReady = computed(() => bossCityGroups.value.length > 0 && bossSalaryOptions.value.length > 0);
  const keywords = computed(() => parseList(keywordsText.value));
  const filters = computed(() => ({
    city: selectedCity.value ? [selectedCity.value] : parseList(cityText.value),
    salary: selectedSalary.value ? [selectedSalary.value] : parseList(salaryText.value),
    experience: selectedExperience.value ? [selectedExperience.value] : parseList(experienceText.value),
    degree: selectedDegree.value ? [selectedDegree.value] : parseList(degreeText.value),
    industry: selectedIndustry.value ? [selectedIndustry.value] : parseList(industryText.value),
    scale: selectedScale.value ? [selectedScale.value] : parseList(scaleText.value),
  }));
  const task = computed(() => ({
    keywords: keywords.value,
    filters: filters.value,
    limits: { maxPages: maxPages.value, maxJobs: maxJobs.value, delayMs: delayMs.value },
    mode: "auto",
  }));
  const sidecarRunning = computed(() => runtime.sidecarTask.running);

  async function refreshLogin(): Promise<void> {
    loginError.value = null;
    if (!tauri) {
      loginExists.value = null;
      return;
    }
    try {
      loginExists.value = await invoke<boolean>("get_login_status");
    } catch (cause) {
      loginError.value = cause instanceof Error ? cause.message : String(cause);
    }
  }

  async function startLogin(): Promise<void> {
    loginError.value = null;
    if (!tauri) return;
    loginLoading.value = true;
    try {
      runtime.sidecarTask.running = true;
      runtime.sidecarTask.type = CRAWL_TASK_TYPE_LOGIN;
      await invoke<void>("start_login");
    } catch (cause) {
      loginError.value = cause instanceof Error ? cause.message : String(cause);
      if (runtime.sidecarTask.type === CRAWL_TASK_TYPE_LOGIN) {
        runtime.sidecarTask.running = false;
        runtime.sidecarTask.type = undefined;
      }
    } finally {
      loginLoading.value = false;
    }
  }

  async function loadBossMeta(): Promise<void> {
    bossMetaError.value = null;
    if (!tauri) return;
    bossMetaLoading.value = true;
    try {
      const meta = await invoke<unknown | null>("get_boss_meta");
      if (meta && typeof meta === "object") {
        runtime.bossMeta = meta as any;
      }
    } catch (cause) {
      bossMetaError.value = cause instanceof Error ? cause.message : String(cause);
    } finally {
      bossMetaLoading.value = false;
    }
  }

  async function syncBossMeta(): Promise<void> {
    bossMetaError.value = null;
    if (!tauri) return;
    bossMetaSyncing.value = true;
    clearBossMetaSyncTimeout();
    bossMetaSyncTimeout = window.setTimeout(() => {
      bossMetaSyncing.value = false;
    }, BOSS_META_SYNC_TIMEOUT_MS);
    try {
      runtime.sidecarTask.running = true;
      runtime.sidecarTask.type = CRAWL_TASK_TYPE_META_SYNC;
      await invoke<void>("sync_boss_meta");
    } catch (cause) {
      bossMetaError.value = cause instanceof Error ? cause.message : String(cause);
      bossMetaSyncing.value = false;
      if (runtime.sidecarTask.type === CRAWL_TASK_TYPE_META_SYNC) {
        runtime.sidecarTask.running = false;
        runtime.sidecarTask.type = undefined;
      }
    }
  }

  async function start(): Promise<void> {
    error.value = null;
    if (!tauri) return;
    actionBusy.value = true;
    try {
      if (mode.value === "manual") {
        runtime.sidecarTask.running = true;
        runtime.sidecarTask.type = CRAWL_TASK_TYPE_MANUAL;
        await invoke<void>("crawl_manual_start");
        return;
      }
      if (keywords.value.length === 0) {
        throw new Error("请输入至少 1 个 keyword（换行分隔）。");
      }
      runtime.sidecarTask.running = true;
      runtime.sidecarTask.type = CRAWL_TASK_TYPE_AUTO;
      await invoke<void>("crawl_auto_start", { task: task.value });
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : String(cause);
      if (runtime.sidecarTask.type === CRAWL_TASK_TYPE_MANUAL || runtime.sidecarTask.type === CRAWL_TASK_TYPE_AUTO) {
        runtime.sidecarTask.running = false;
        runtime.sidecarTask.type = undefined;
      }
    } finally {
      actionBusy.value = false;
    }
  }

  async function stop(): Promise<void> {
    error.value = null;
    if (!tauri) return;
    actionBusy.value = true;
    try {
      await invoke<void>("crawl_stop");
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : String(cause);
    } finally {
      actionBusy.value = false;
    }
  }

  onMounted(() => {
    void refreshLogin();
    void loadBossMeta();
  });

  onUnmounted(() => {
    clearBossMetaSyncTimeout();
  });

  watch(
    () => runtime.lastCookieCollectedAt,
    () => {
      void refreshLogin();
    },
  );

  watch(
    () => bossMetaSyncedAt.value,
    () => {
      if (!bossMetaSyncing.value) return;
      bossMetaSyncing.value = false;
      clearBossMetaSyncTimeout();
    },
  );

  return {
    tauri,
    runtime,
    clearLogs,
    mode,
    keywordsText,
    cityText,
    salaryText,
    experienceText,
    degreeText,
    industryText,
    scaleText,
    selectedCity,
    selectedSalary,
    selectedExperience,
    selectedDegree,
    selectedIndustry,
    selectedScale,
    maxPages,
    maxJobs,
    delayMs,
    actionBusy,
    error,
    loginExists,
    loginLoading,
    loginError,
    bossMetaLoading,
    bossMetaSyncing,
    bossMetaError,
    bossMetaSyncedAt,
    bossCityGroups,
    bossHotCities,
    bossSalaryOptions,
    bossExperienceOptions,
    bossDegreeOptions,
    bossScaleOptions,
    bossIndustryGroups,
    bossMetaReady,
    sidecarRunning,
    refreshLogin,
    startLogin,
    loadBossMeta,
    syncBossMeta,
    start,
    stop,
  };

  function clearBossMetaSyncTimeout(): void {
    if (bossMetaSyncTimeout === null) return;
    window.clearTimeout(bossMetaSyncTimeout);
    bossMetaSyncTimeout = null;
  }
}
