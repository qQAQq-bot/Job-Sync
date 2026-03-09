<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import AiJobPicker from "../components/ai/AiJobPicker.vue";
import AiProfileInputs from "../components/ai/AiProfileInputs.vue";
import { aiSelectedJobs } from "../lib/aiSelection";
import { invoke, isTauri } from "../lib/tauri";

interface AppSettings {
  ai_resume_text?: string | null;
  ai_context_text?: string | null;
  ai_resume_files?: string | null;
  ai_profile_updated_at?: string | null;
}

const tauri = isTauri();
const resumeMode = ref<"text" | "file">("text");
const resumeText = ref("");
const resumeFilePath = ref("");
const contextText = ref("");

const selectedJobs = aiSelectedJobs;

const force = ref(false);

const loading = ref(false);
const error = ref<string | null>(null);
const profileUpdatedAt = ref<string | null>(null);
const groupLoading = ref(false);
const groupError = ref<string | null>(null);

const route = useRoute();
const router = useRouter();

async function loadSettings(): Promise<void> {
  if (!tauri) return;
  try {
    const settings = await invoke<AppSettings>("get_settings");
    profileUpdatedAt.value = settings.ai_profile_updated_at ?? null;

    if (!resumeText.value.trim() && settings.ai_resume_text) resumeText.value = settings.ai_resume_text;
    if (!contextText.value.trim() && settings.ai_context_text) contextText.value = settings.ai_context_text;
    if (!resumeFilePath.value.trim() && settings.ai_resume_files) {
      resumeFilePath.value = settings.ai_resume_files;
      if (settings.ai_resume_files) resumeMode.value = "file";
    }
  } catch {
    // ignore
  }
}

async function saveSettings(): Promise<void> {
  if (!tauri) return;
  try {
    const saved = await invoke<AppSettings>("set_ai_settings", {
      resumeText: resumeMode.value === "text" ? resumeText.value : "",
      contextText: contextText.value.trim() || null,
      resumeFiles: resumeMode.value === "file" ? resumeFilePath.value : null,
    });
    profileUpdatedAt.value = saved.ai_profile_updated_at ?? null;
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e);
  }
}

const jobId = computed(() => {
  const q = route.query.jobId;
  if (typeof q !== "string") return null;
  const trimmed = q.trim();
  return trimmed ? trimmed : null;
});

async function analyze(): Promise<void> {
  error.value = null;
  if (!tauri) return;
  if (selectedJobs.value.length === 0) {
    error.value = "请从职位库中选择至少一个职位。";
    return;
  }
  if (resumeMode.value === "text" && !resumeText.value.trim()) {
    error.value = "请粘贴简历文本。";
    return;
  }
  if (resumeMode.value === "file" && !resumeFilePath.value.trim()) {
    error.value = "请选择 PDF 简历文件。";
    return;
  }

  loading.value = true;
  try {
    const outcomes = await Promise.all(
      selectedJobs.value.map(async (job) => {
      try {
        await invoke<unknown>("analyze_resume_for_job", {
          encryptJobId: job.encrypt_job_id,
          resumeText: resumeMode.value === "text" ? resumeText.value : "",
          contextText: contextText.value.trim() || null,
          resumeFiles: resumeMode.value === "file" ? resumeFilePath.value : null,
          apiKey: null,
          baseUrl: null,
          model: null,
          apiMode: null,
          force: force.value,
        });
        return { ok: true as const, error: null as string | null };
      } catch (e) {
        return { ok: false as const, error: e instanceof Error ? e.message : String(e) };
      }
    }),
    );

    const okCount = outcomes.filter((it) => it.ok).length;
    if (okCount === 0) {
      const firstError = outcomes.find((it) => !it.ok && it.error)?.error;
      error.value = firstError ?? "生成报告失败。";
      return;
    }

    await router.push({ path: "/ai-reports", query: { open: "latest" } });
  } finally {
    loading.value = false;
  }
}

async function analyzeGroup(): Promise<void> {
  groupError.value = null;
  if (!tauri) return;
  if (selectedJobs.value.length === 0) {
    groupError.value = "请从职位库中选择至少一个职位。";
    return;
  }
  if (!contextText.value.trim()) {
    groupError.value = "请填写当前情况说明（综合分析不需要简历）。";
    return;
  }
  if (selectedJobs.value.length > 20) {
    groupError.value = "综合分析最多支持 20 个职位，请减少选择数量。";
    return;
  }

  groupLoading.value = true;
  try {
    await invoke<unknown>("analyze_profile_for_jobs", {
      jobIds: selectedJobs.value.map((j) => j.encrypt_job_id),
      contextText: contextText.value.trim(),
      apiKey: null,
      baseUrl: null,
      model: null,
      apiMode: null,
      force: force.value,
    });
    await router.push({ path: "/ai-reports", query: { open: "latest" } });
  } catch (e) {
    groupError.value = e instanceof Error ? e.message : String(e);
  } finally {
    groupLoading.value = false;
  }
}

onMounted(() => {
  void loadSettings();
});
</script>

<template>
  <section class="space-y-4">
    <header class="space-y-1">
      <h1 class="text-xl font-semibold text-content-primary">AI</h1>
      <p class="text-sm text-content-secondary">简历导入与岗位匹配（结构化 JSON 输出）。</p>
    </header>

    <div
      v-if="!tauri"
      class="rounded-lg bg-amber-500/10 p-4 text-sm text-amber-400 ring-1 ring-white/[0.06]"
    >
      当前是浏览器模式（非 Tauri）。AI 命令不可用。
    </div>

    <AiJobPicker :tauri="tauri" :job-id="jobId" />

    <AiProfileInputs
      :tauri="tauri"
      v-model:contextText="contextText"
      v-model:resumeMode="resumeMode"
      v-model:resumeText="resumeText"
      v-model:resumeFilePath="resumeFilePath"
    />

    <div class="flex flex-wrap items-center gap-3">
      <button
        class="ui-btn-primary"
        :disabled="!tauri || loading || groupLoading"
        @click="analyze"
      >
        {{ loading ? "分析中…" : "一键生成报告" }}
      </button>

      <button
        class="ui-btn-secondary"
        :disabled="!tauri || loading || groupLoading"
        @click="analyzeGroup"
      >
        {{ groupLoading ? "分析中…" : "生成综合报告（无需简历）" }}
      </button>

      <button
        class="ui-btn-secondary"
        :disabled="!tauri"
        @click="saveSettings"
      >
        保存上次输入
      </button>

      <span v-if="profileUpdatedAt" class="text-xs text-content-muted">
        上次保存：{{ profileUpdatedAt }}
      </span>

      <label class="flex items-center gap-2 text-sm text-content-secondary">
        <input v-model="force" type="checkbox" class="h-4 w-4 rounded border-white/20 bg-input/80" />
        强制重新生成（忽略缓存）
      </label>
    </div>

	    <div
	      v-if="error"
	      class="rounded-lg bg-red-500/10 p-4 text-sm text-accent-danger ring-1 ring-white/[0.06]"
	    >
	      <pre class="whitespace-pre-wrap">{{ error }}</pre>
	    </div>

		    <div
		      v-if="groupError"
		      class="rounded-lg bg-red-500/10 p-4 text-sm text-accent-danger ring-1 ring-white/[0.06]"
		    >
		      <pre class="whitespace-pre-wrap">{{ groupError }}</pre>
		    </div>
	  </section>
</template>
