<script setup lang="ts">
import { open } from "@tauri-apps/plugin-dialog";
import { computed, onBeforeUnmount, onMounted, ref } from "vue";

import ResumeBasicProfileForm from "../components/resume-workspace/ResumeBasicProfileForm.vue";
import ResumeCandidatePreview from "../components/resume-workspace/ResumeCandidatePreview.vue";
import ResumeDiagnosisView from "../components/resume-workspace/ResumeDiagnosisView.vue";
import ResumeFinalPreview from "../components/resume-workspace/ResumeFinalPreview.vue";
import ResumeModuleEditor from "../components/resume-workspace/ResumeModuleEditor.vue";
import ResumeWorkspaceNav from "../components/resume-workspace/ResumeWorkspaceNav.vue";
import {
  RESUME_MODULES,
  assembleResumeWorkspace,
  createDefaultResumeWorkspaceDraft,
  diagnoseResumeWorkspace,
  exportResumeWorkspacePdf,
  getModuleLabel,
  getResumeWorkspaceDraft,
  rewriteResumeWorkspaceModule,
  saveResumeWorkspaceDraft,
  type ResumeDiagnosisSection,
  type ResumeModuleKey,
  type ResumeWorkspaceDraft,
  type ResumeWorkspaceNavItem,
  type ResumeWorkspaceStepKey,
} from "../lib/resumeWorkspace";
import { isTauri } from "../lib/tauri";

const ACCEPT_TOAST_FADE_DELAY_MS = 2600;
const ACCEPT_TOAST_HIDE_DELAY_MS = 3000;
const FINAL_RESUME_SECTIONS: Array<{ key: ResumeModuleKey; title: string }> = [
  { key: "summary", title: "个人简介" },
  { key: "projects", title: "项目经历" },
  { key: "experience", title: "工作经历" },
  { key: "skills", title: "技能清单" },
];

const tauri = isTauri();
const draft = ref<ResumeWorkspaceDraft>(createDefaultResumeWorkspaceDraft());
const currentStep = ref<ResumeWorkspaceStepKey>("original");
const loadingDraft = ref(false);
const diagnosing = ref(false);
const rewritingModule = ref<ResumeModuleKey | null>(null);
const assembling = ref(false);
const exporting = ref(false);
const error = ref<string | null>(null);
const success = ref<string | null>(null);
const acceptToastMessage = ref<string | null>(null);
const acceptToastVisible = ref(false);
const acceptToastFading = ref(false);

let acceptToastFadeTimer: ReturnType<typeof setTimeout> | null = null;
let acceptToastHideTimer: ReturnType<typeof setTimeout> | null = null;

const currentModule = computed(() => RESUME_MODULES.find((item) => item.key === currentStep.value) ?? null);
const readyForFinal = computed(() => RESUME_MODULES.every((item) => !!draft.value[item.key].confirmed?.trim()));
const showCandidateAside = computed(() => !!currentModule.value);
const assembledConfirmedResumeText = computed(() => {
  const sections = FINAL_RESUME_SECTIONS.flatMap(({ key, title }) => {
    const content = draft.value[key].confirmed?.trim();
    return content ? [`## ${title}\n${content}`] : [];
  });
  return sections.join("\n\n");
});
const needsRegenerateFinal = computed(() => {
  if (!draft.value.final_resume_text?.trim()) return false;
  return normalizeResumeText(assembledConfirmedResumeText.value) !== normalizeResumeText(draft.value.final_resume_text);
});

function buildModuleInput(module: ResumeModuleKey): string {
  const parts = [draft.value[module].input.trim(), draft.value[module].followup_input.trim()].filter(Boolean);
  return parts.join("\n\n【补充回答】\n");
}

function canGenerateCandidate(module: ResumeModuleKey): boolean {
  return !!buildModuleInput(module).trim();
}

const navItems = computed<ResumeWorkspaceNavItem[]>(() => {
  const items: ResumeWorkspaceNavItem[] = [
    { key: "original", label: "原始简历", status: currentStep.value === "original" ? "active" : draft.value.original_resume_text.trim() || draft.value.original_resume_file ? "done" : "idle" },
    { key: "diagnosis", label: "AI 诊断", status: currentStep.value === "diagnosis" ? "active" : draft.value.diagnosis ? "done" : "idle" },
  ];
  for (const module of RESUME_MODULES) {
    const done = !!draft.value[module.key].confirmed?.trim();
    items.push({ key: module.key, label: module.label, status: currentStep.value === module.key ? "active" : done ? "done" : "idle" });
  }
  items.push({ key: "final", label: "最终简历", status: currentStep.value === "final" ? "active" : draft.value.final_resume_text ? "done" : "idle" });
  return items;
});

function activeDiagnosisSection(): ResumeDiagnosisSection | null {
  if (!currentModule.value || !draft.value.diagnosis) return null;
  return draft.value.diagnosis[currentModule.value.key] ?? null;
}

function normalizeResumeText(value?: string | null): string {
  return (value ?? "").replace(/\r\n/g, "\n").trim();
}

function clearAcceptToastTimers(): void {
  if (acceptToastFadeTimer) {
    clearTimeout(acceptToastFadeTimer);
    acceptToastFadeTimer = null;
  }
  if (acceptToastHideTimer) {
    clearTimeout(acceptToastHideTimer);
    acceptToastHideTimer = null;
  }
}

function showAcceptToast(message: string): void {
  clearAcceptToastTimers();
  acceptToastMessage.value = message;
  acceptToastVisible.value = true;
  acceptToastFading.value = false;

  acceptToastFadeTimer = setTimeout(() => {
    acceptToastFading.value = true;
  }, ACCEPT_TOAST_FADE_DELAY_MS);

  acceptToastHideTimer = setTimeout(() => {
    acceptToastVisible.value = false;
    acceptToastFading.value = false;
    acceptToastMessage.value = null;
    clearAcceptToastTimers();
  }, ACCEPT_TOAST_HIDE_DELAY_MS);
}

async function persistDraft(): Promise<void> {
  if (!tauri) return;
  draft.value = await saveResumeWorkspaceDraft(draft.value);
}

async function loadDraft(): Promise<void> {
  if (!tauri) return;
  loadingDraft.value = true;
  try {
    draft.value = await getResumeWorkspaceDraft();
  } finally {
    loadingDraft.value = false;
  }
}

async function pickPdfFile(): Promise<void> {
  if (!tauri) return;
  const selected = await open({ title: "选择原始 PDF 简历", filters: [{ name: "PDF", extensions: ["pdf"] }] });
  if (typeof selected !== "string") return;
  draft.value.source_mode = "file";
  draft.value.original_resume_file = selected;
  draft.value.original_resume_text = "";
  await persistDraft();
}

async function runDiagnosis(): Promise<void> {
  error.value = null;
  success.value = null;
  diagnosing.value = true;
  try {
    draft.value.diagnosis = await diagnoseResumeWorkspace({
      resume_text: draft.value.source_mode === "text" ? draft.value.original_resume_text : "",
      context_text: draft.value.context_text.trim() || null,
      resume_files: draft.value.source_mode === "file" ? draft.value.original_resume_file ?? null : null,
    });
    await persistDraft();
    currentStep.value = "diagnosis";
    success.value = "AI 诊断已生成。";
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e);
  } finally {
    diagnosing.value = false;
  }
}

async function generateCandidate(module: ResumeModuleKey): Promise<void> {
  error.value = null;
  success.value = null;
  rewritingModule.value = module;
  try {
    const result = await rewriteResumeWorkspaceModule({
      module,
      resume_text: draft.value.source_mode === "text" ? draft.value.original_resume_text : "",
      context_text: draft.value.context_text.trim() || null,
      resume_files: draft.value.source_mode === "file" ? draft.value.original_resume_file ?? null : null,
      module_input: buildModuleInput(module),
      confirmed_summary: draft.value.summary.confirmed ?? null,
      confirmed_projects: draft.value.projects.confirmed ?? null,
      confirmed_experience: draft.value.experience.confirmed ?? null,
      confirmed_skills: draft.value.skills.confirmed ?? null,
    });
    draft.value[module].candidate = result.candidate;
    draft.value[module].notes = result.notes;
    draft.value[module].checklist = result.checklist;
    draft.value[module].updated_at = new Date().toISOString();
    await persistDraft();
    success.value = `${getModuleLabel(module)}候选稿已生成。`;
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e);
  } finally {
    rewritingModule.value = null;
  }
}

async function acceptCandidate(module: ResumeModuleKey): Promise<void> {
  const candidate = draft.value[module].candidate?.trim();
  if (!candidate) return;

  error.value = null;
  success.value = null;
  const previousConfirmed = draft.value[module].confirmed ?? null;
  draft.value[module].confirmed = candidate;

  try {
    await persistDraft();
    showAcceptToast(`${getModuleLabel(module)}已确认。`);
  } catch (e) {
    draft.value[module].confirmed = previousConfirmed;
    error.value = e instanceof Error ? e.message : String(e);
  }
}

async function assembleFinalResume(): Promise<void> {
  error.value = null;
  success.value = null;
  assembling.value = true;
  try {
    draft.value = await assembleResumeWorkspace(draft.value);
    await persistDraft();
    currentStep.value = "final";
    success.value = "最终简历已生成。";
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e);
  } finally {
    assembling.value = false;
  }
}

async function exportPdf(): Promise<void> {
  error.value = null;
  success.value = null;
  exporting.value = true;
  try {
    const path = await exportResumeWorkspacePdf(draft.value, "修改后的简历");
    success.value = `PDF 已导出：${path}`;
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e);
  } finally {
    exporting.value = false;
  }
}

onMounted(() => {
  void loadDraft();
});

onBeforeUnmount(() => {
  clearAcceptToastTimers();
});
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-all duration-300 ease-out"
      enter-from-class="-translate-y-2 opacity-0"
      enter-to-class="translate-y-0 opacity-100"
      leave-active-class="transition-all duration-300 ease-in"
      leave-from-class="translate-y-0 opacity-100"
      leave-to-class="-translate-y-2 opacity-0"
    >
      <div
        v-if="acceptToastVisible && acceptToastMessage"
        class="pointer-events-none fixed inset-x-0 top-4 z-[999] flex justify-center px-4"
      >
        <div
          class="ui-status-success w-full max-w-xl px-4 py-3 text-sm shadow-lg backdrop-blur-md transition-opacity duration-300"
          :class="acceptToastFading ? 'opacity-0' : 'opacity-100'"
        >
          {{ acceptToastMessage }}
        </div>
      </div>
    </Transition>
  </Teleport>

  <section class="space-y-5">
    <header class="space-y-1">
      <h1 class="text-xl font-semibold text-content-primary">简历工作区</h1>
      <p class="text-sm text-content-secondary">导入原始简历，先做 AI 诊断，再逐模块生成候选改写并确认最终稿。</p>
    </header>

    <div v-if="!tauri" class="ui-status-warning p-4 text-sm">当前是浏览器模式（非 Tauri）。简历工作区不可用。</div>
    <div v-if="loadingDraft" class="ui-panel p-4 text-sm text-content-secondary">正在读取工作区草稿…</div>
    <div v-if="error" class="ui-status-danger p-4 text-sm">{{ error }}</div>
    <div v-if="success" class="ui-status-success p-4 text-sm">{{ success }}</div>

    <div class="grid gap-4" :class="showCandidateAside ? 'xl:grid-cols-[220px_1fr_420px]' : 'xl:grid-cols-[220px_1fr]'">
      <ResumeWorkspaceNav :items="navItems" :current-step="currentStep" @select="currentStep = $event" />

      <section class="min-w-0 space-y-4">
        <div v-if="currentStep === 'original'" class="space-y-4">
          <div class="ui-panel p-4">
            <div class="text-xs font-semibold uppercase tracking-[0.24em] text-content-muted">原始简历</div>
            <div class="mt-3 inline-flex rounded-xl bg-card/80 p-1 ring-1 ring-border/10">
              <button class="rounded-md px-3 py-1 text-xs font-medium transition-all" :class="draft.source_mode === 'text' ? 'bg-accent/90 text-white shadow-sm' : 'text-content-secondary hover:bg-card-hover/60 hover:text-content-primary'" @click="draft.source_mode = 'text'">粘贴文本</button>
              <button class="rounded-md px-3 py-1 text-xs font-medium transition-all" :class="draft.source_mode === 'file' ? 'bg-accent/90 text-white shadow-sm' : 'text-content-secondary hover:bg-card-hover/60 hover:text-content-primary'" @click="draft.source_mode = 'file'">PDF 文件</button>
            </div>

            <textarea v-if="draft.source_mode === 'text'" v-model="draft.original_resume_text" class="ui-textarea mt-4 h-64 w-full" placeholder="粘贴原始简历正文" />
            <div v-else class="mt-4 space-y-3">
              <button class="ui-btn-secondary" @click="pickPdfFile">选择 PDF 文件</button>
              <div v-if="draft.original_resume_file" class="ui-panel-muted flex items-center gap-2 px-3 py-2 text-sm text-content-primary">{{ draft.original_resume_file }}</div>
            </div>
          </div>

          <ResumeBasicProfileForm
            :profile="draft.basic_profile"
            @update:field="(field, value) => (draft.basic_profile[field] = value)"
          />

          <div class="ui-panel-muted p-4">
            <div class="text-xs font-semibold text-content-muted">当前情况说明（可选）</div>
            <textarea v-model="draft.context_text" class="ui-textarea mt-3 h-28 w-full" placeholder="例如：目标岗位方向、当前工作状态、补充背景说明。" />
            <div class="mt-3 flex items-center gap-3">
              <button class="ui-btn-secondary" @click="persistDraft">保存草稿</button>
              <button class="ui-btn-primary" :disabled="diagnosing" @click="runDiagnosis">{{ diagnosing ? '诊断中…' : '开始 AI 诊断' }}</button>
            </div>
          </div>
        </div>

        <ResumeDiagnosisView v-else-if="currentStep === 'diagnosis' && draft.diagnosis" :diagnosis="draft.diagnosis" />
        <ResumeModuleEditor
          v-else-if="currentModule"
          :module-key="currentModule.key"
          :label="currentModule.label"
          :placeholder="currentModule.placeholder"
          :module-draft="draft[currentModule.key]"
          :diagnosis="activeDiagnosisSection()"
          :busy="rewritingModule === currentModule.key"
          :can-generate="canGenerateCandidate(currentModule.key)"
          @update:input="draft[currentModule.key].input = $event"
          @update:followup-input="draft[currentModule.key].followup_input = $event"
          @generate="generateCandidate(currentModule.key)"
        />
        <ResumeFinalPreview
          v-else
          :final-text="draft.final_resume_text"
          :ready="readyForFinal"
          :assembling="assembling"
          :exporting="exporting"
          :needs-regenerate="needsRegenerateFinal"
          @assemble="assembleFinalResume"
          @export="exportPdf"
        />
      </section>

      <section v-if="showCandidateAside" class="min-w-0 space-y-4">
        <ResumeCandidatePreview
          v-if="currentModule"
          :label="currentModule.label"
          :module-draft="draft[currentModule.key]"
          :busy="rewritingModule === currentModule.key"
          :can-generate="canGenerateCandidate(currentModule.key)"
          @accept="acceptCandidate(currentModule.key)"
          @regenerate="generateCandidate(currentModule.key)"
        />
      </section>
    </div>
  </section>
</template>
