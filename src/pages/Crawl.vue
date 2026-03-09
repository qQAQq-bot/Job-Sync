<script setup lang="ts">
import CrawlActionBar from "../components/crawl/CrawlActionBar.vue";
import CrawlLoginStatusPanel from "../components/crawl/CrawlLoginStatusPanel.vue";
import CrawlRuntimePanel from "../components/crawl/CrawlRuntimePanel.vue";
import UiSelect from "../components/ui/UiSelect.vue";
import { useCrawlPage } from "../lib/useCrawlPage";
const {
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
} = useCrawlPage();
</script>
<template>
  <section class="flex min-h-[calc(100vh-5.25rem)] flex-col gap-4">
    <header class="shrink-0 space-y-1">
      <h1 class="text-xl font-semibold text-content-primary">采集</h1>
      <p class="text-sm text-content-secondary">手动：你自己逛页面；自动：按关键词 + 筛选 + 翻页跑。</p>
    </header>
    <div
      v-if="!tauri"
      class="ui-status-warning shrink-0 p-4 text-sm"
    >
      当前是浏览器模式（非 Tauri）。采集命令不可用。
    </div>
    <CrawlLoginStatusPanel
      :tauri="tauri"
      :login-exists="loginExists"
      :login-loading="loginLoading"
      :sidecar-running="sidecarRunning"
      :login-status="runtime.login.status"
      :login-message="runtime.login.message"
      :login-error="loginError"
      @start-login="startLogin"
      @refresh-login="refreshLogin"
    />
    <div class="ui-crawl-panel shrink-0 space-y-4 p-5">
      <div class="inline-flex rounded-xl bg-card/80 p-1 ring-1 ring-border/10">
        <button
          class="rounded-md px-4 py-1.5 text-sm font-medium transition-all"
          :class="
            mode === 'manual'
              ? 'bg-accent/90 text-white shadow-sm'
              : 'text-content-secondary hover:bg-card-hover/60 hover:text-content-primary'
          "
          @click="mode = 'manual'"
        >
          手动采集
        </button>
        <button
          class="rounded-md px-4 py-1.5 text-sm font-medium transition-all"
          :class="
            mode === 'auto'
              ? 'bg-accent/90 text-white shadow-sm'
              : 'text-content-secondary hover:bg-card-hover/60 hover:text-content-primary'
          "
          @click="mode = 'auto'"
        >
          自动采集
        </button>
      </div>
      <div v-if="mode === 'auto'" class="space-y-4">
        <div class="space-y-3">
          <div class="text-xs font-semibold uppercase tracking-wider text-content-muted">搜索条件</div>
	          <div class="ui-crawl-toolbar flex flex-wrap items-center justify-between gap-2 px-3 py-3">
	            <div class="text-xs text-content-muted">
	              筛选项字典：
	              <span class="text-content-secondary">
	                {{ bossMetaReady ? (bossMetaSyncedAt ?? "已加载") : "未同步" }}
	              </span>
	            </div>
	            <div class="flex items-center gap-2">
	              <button
	                class="ui-btn-secondary px-3 py-1.5 text-xs"
	                :disabled="!tauri || bossMetaLoading"
	                @click="loadBossMeta"
	              >
	                {{ bossMetaLoading ? "读取中…" : "读取缓存" }}
	              </button>
	              <button
	                class="ui-btn-primary px-3 py-1.5 text-xs"
	                :disabled="!tauri || bossMetaSyncing || sidecarRunning"
	                @click="syncBossMeta"
	              >
	                {{ bossMetaSyncing ? "同步中…" : "同步城市、行业与筛选项" }}
	              </button>
	            </div>
	          </div>
	          <div v-if="bossMetaError" class="ui-status-danger p-3 text-xs">
	            {{ bossMetaError }}
	          </div>
          <label class="block space-y-1">
            <div class="text-xs font-medium text-content-muted">关键词（每行一个）</div>
            <textarea
              v-model="keywordsText"
              class="ui-textarea h-24 w-full"
              placeholder="例如：Rust&#10;后端&#10;Tauri"
            />
          </label>
          <div class="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            <label class="space-y-1">
              <div class="text-xs font-medium text-content-muted">城市</div>
              <UiSelect v-if="bossCityGroups.length > 0" v-model="selectedCity">
                <option value="">不限（保持当前）</option>
                <optgroup v-if="bossHotCities.length > 0" label="热门">
                  <option v-for="c in bossHotCities" :key="c.code" :value="String(c.code)">
                    {{ c.name }}
                  </option>
                </optgroup>
                <optgroup v-for="g in bossCityGroups" :key="g.firstChar" :label="g.firstChar">
                  <option v-for="c in g.cityList" :key="c.code" :value="String(c.code)">
                    {{ c.name }}
                  </option>
                </optgroup>
              </UiSelect>
              <input
                v-else
                v-model="cityText"
                class="ui-input w-full"
                placeholder="例如：北京"
              />
            </label>
            <label class="space-y-1">
              <div class="text-xs font-medium text-content-muted">薪资</div>
              <UiSelect v-if="bossSalaryOptions.length > 0" v-model="selectedSalary">
                <option value="">不限</option>
                <option v-for="opt in bossSalaryOptions" :key="opt.code" :value="String(opt.code)">{{ opt.name }}</option>
              </UiSelect>
              <input
                v-else
                v-model="salaryText"
                class="ui-input w-full"
                placeholder="例如：10-20K"
              />
            </label>
            <label class="space-y-1">
              <div class="text-xs font-medium text-content-muted">经验</div>
              <UiSelect v-if="bossExperienceOptions.length > 0" v-model="selectedExperience">
                <option value="">不限</option>
                <option v-for="opt in bossExperienceOptions" :key="opt.code" :value="String(opt.code)">{{ opt.name }}</option>
              </UiSelect>
              <input
                v-else
                v-model="experienceText"
                class="ui-input w-full"
                placeholder="例如：3-5 年"
              />
            </label>
            <label class="space-y-1">
              <div class="text-xs font-medium text-content-muted">学历</div>
              <UiSelect v-if="bossDegreeOptions.length > 0" v-model="selectedDegree">
                <option value="">不限</option>
                <option v-for="opt in bossDegreeOptions" :key="opt.code" :value="String(opt.code)">{{ opt.name }}</option>
              </UiSelect>
              <input
                v-else
                v-model="degreeText"
                class="ui-input w-full"
                placeholder="例如：本科"
              />
            </label>
            <label class="space-y-1">
              <div class="text-xs font-medium text-content-muted">行业</div>
              <UiSelect v-if="bossIndustryGroups.length > 0" v-model="selectedIndustry">
                <option value="">不限</option>
                <optgroup v-for="g in bossIndustryGroups" :key="g.name" :label="g.name">
                  <option v-for="opt in g.options" :key="opt.code" :value="String(opt.code)">{{ opt.name }}</option>
                </optgroup>
              </UiSelect>
              <input
                v-else
                v-model="industryText"
                class="ui-input w-full"
                placeholder="例如：互联网"
              />
            </label>
            <label class="space-y-1">
              <div class="text-xs font-medium text-content-muted">规模</div>
              <UiSelect v-if="bossScaleOptions.length > 0" v-model="selectedScale">
                <option value="">不限</option>
                <option v-for="opt in bossScaleOptions" :key="opt.code" :value="String(opt.code)">{{ opt.name }}</option>
              </UiSelect>
              <input
                v-else
                v-model="scaleText"
                class="ui-input w-full"
                placeholder="例如：20-99 人"
              />
            </label>
          </div>
        </div>
        <div class="space-y-3">
          <div class="text-xs font-semibold uppercase tracking-wider text-content-muted">限流参数</div>
          <div class="grid grid-cols-3 gap-3">
            <label class="space-y-1">
              <div class="text-xs font-medium text-content-muted">最大页数</div>
              <input
                v-model.number="maxPages"
                type="number"
                min="1"
                class="ui-input w-full"
              />
            </label>
            <label class="space-y-1">
              <div class="text-xs font-medium text-content-muted">最大职位数</div>
              <input
                v-model.number="maxJobs"
                type="number"
                min="1"
                class="ui-input w-full"
              />
            </label>
            <label class="space-y-1">
              <div class="text-xs font-medium text-content-muted">延迟 (ms)</div>
              <input
                v-model.number="delayMs"
                type="number"
                min="0"
                class="ui-input w-full"
              />
            </label>
          </div>
        </div>
      </div>
        <CrawlActionBar
          :tauri="tauri"
          :action-busy="actionBusy"
          :sidecar-running="sidecarRunning"
          @start="start"
          @stop="stop"
        />
    </div>
    <CrawlRuntimePanel
      :keyword="runtime.progress.keyword"
      :current-page="runtime.progress.current_page"
      :captured-job-list="runtime.progress.captured_job_list"
      :captured-job-detail="runtime.progress.captured_job_detail"
      :logs="runtime.logs"
      :sidecar-running="sidecarRunning"
      :error="error"
      @clear-logs="clearLogs"
    />
  </section>
</template>
