import { open } from "@tauri-apps/plugin-dialog";
import { computed, onBeforeUnmount, onMounted, ref } from "vue";

import {
  RESUME_MODULES,
  assembleResumeWorkspace,
  diagnoseResumeWorkspace,
  exportResumeWorkspacePdf,
  getModuleLabel,
  rewriteResumeWorkspaceModule,
  type ResumeDiagnosisSection,
  type ResumeModuleKey,
  type ResumeWorkspaceDraft,
  type ResumeWorkspaceNavItem,
  type ResumeWorkspaceStepKey,
} from "./resumeWorkspace";
import { isTauri } from "./tauri";
import { useResumeWorkspaceStore } from "./useResumeWorkspaceStore";

const ACCEPT_TOAST_FADE_DELAY_MS = 2600;
const ACCEPT_TOAST_HIDE_DELAY_MS = 3000;
const FINAL_RESUME_SECTIONS: Array<{ key: ResumeModuleKey; title: string }> = [
  { key: "summary", title: "个人简介" },
  { key: "projects", title: "项目经历" },
  { key: "experience", title: "工作经历" },
  { key: "skills", title: "技能清单" },
];

function normalizeResumeText(value?: string | null): string {
  return (value ?? "").replace(/\r\n/g, "\n").trim();
}

function isOriginalStepComplete(draft: ResumeWorkspaceDraft): boolean {
  return !!(draft.original_resume_text.trim() || draft.original_resume_file);
}

function isDiagnosisStepComplete(draft: ResumeWorkspaceDraft): boolean {
  return !!draft.diagnosis;
}

function isFinalStepComplete(draft: ResumeWorkspaceDraft): boolean {
  return !!draft.final_resume_text?.trim();
}

function isPristineDraft(draft: ResumeWorkspaceDraft): boolean {
  return !(
    draft.original_resume_text.trim() ||
    draft.original_resume_file ||
    draft.context_text.trim() ||
    draft.diagnosis ||
    draft.final_resume_text?.trim() ||
    draft.summary.input.trim() ||
    draft.summary.followup_input.trim() ||
    draft.summary.confirmed?.trim() ||
    draft.projects.input.trim() ||
    draft.projects.followup_input.trim() ||
    draft.projects.confirmed?.trim() ||
    draft.experience.input.trim() ||
    draft.experience.followup_input.trim() ||
    draft.experience.confirmed?.trim() ||
    draft.skills.input.trim() ||
    draft.skills.followup_input.trim() ||
    draft.skills.confirmed?.trim()
  );
}

function stepHint(step: ResumeWorkspaceStepKey, readyForFinal: boolean): string {
  switch (step) {
    case "original":
      return "先导入原始简历、完善基础资料，再开始诊断。";
    case "diagnosis":
      return "先读诊断摘要，再决定优先处理哪个模块。";
    case "summary":
      return "优先把你的定位、亮点和目标方向打磨清楚。";
    case "projects":
      return "把项目成果、角色与量化结果补充完整。";
    case "experience":
      return "突出职责范围、业务影响和协作价值。";
    case "skills":
      return "明确技术栈、熟练度和实际应用场景。";
    case "final":
      return readyForFinal ? "检查最终稿是否达到了预期，再决定是否导出 PDF。" : "先确认所有模块，再生成最终成稿。";
  }
}

export function useResumeWorkspacePage() {
  const tauri = isTauri();
  const {
    activeWorkspace,
    activeWorkspaceId,
    activeWorkspaceSummary,
    activeWorkspaceUpdatedAt,
    createNewWorkspace,
    deleteCurrentWorkspace,
    draft,
    loadState,
    persistCurrentDraft,
    renameCurrentWorkspace,
    switchToWorkspace,
    workspaces,
  } = useResumeWorkspaceStore();

  const currentStep = ref<ResumeWorkspaceStepKey>("original");
  const loadingDraft = ref(false);
  const diagnosing = ref(false);
  const rewritingModule = ref<ResumeModuleKey | null>(null);
  const assembling = ref(false);
  const exporting = ref(false);
  const error = ref<string | null>(null);
  const success = ref<string | null>(null);
  const createDialogVisible = ref(false);
  const createDialogLoading = ref(false);
  const renameDialogVisible = ref(false);
  const renameDialogLoading = ref(false);
  const deleteDialogVisible = ref(false);
  const deleteDialogLoading = ref(false);
  const acceptToastMessage = ref<string | null>(null);
  const acceptToastVisible = ref(false);
  const acceptToastFading = ref(false);

  let acceptToastFadeTimer: ReturnType<typeof setTimeout> | null = null;
  let acceptToastHideTimer: ReturnType<typeof setTimeout> | null = null;

  const currentModule = computed(() => RESUME_MODULES.find((item) => item.key === currentStep.value) ?? null);
  const readyForFinal = computed(() => RESUME_MODULES.every((item) => !!draft.value[item.key].confirmed?.trim()));
  const showCandidateAside = computed(() => !!currentModule.value);
  const confirmedModulesCount = computed(() => RESUME_MODULES.filter((item) => !!draft.value[item.key].confirmed?.trim()).length);
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
  const navItems = computed<ResumeWorkspaceNavItem[]>(() => {
    const items: ResumeWorkspaceNavItem[] = [
      { key: "original", label: "原始简历", status: currentStep.value === "original" ? "active" : isOriginalStepComplete(draft.value) ? "done" : "idle" },
      { key: "diagnosis", label: "AI 诊断", status: currentStep.value === "diagnosis" ? "active" : isDiagnosisStepComplete(draft.value) ? "done" : "idle" },
    ];
    for (const module of RESUME_MODULES) {
      const done = !!draft.value[module.key].confirmed?.trim();
      items.push({ key: module.key, label: module.label, status: currentStep.value === module.key ? "active" : done ? "done" : "idle" });
    }
    items.push({ key: "final", label: "最终简历", status: currentStep.value === "final" ? "active" : isFinalStepComplete(draft.value) ? "done" : "idle" });
    return items;
  });
  const currentStepLabel = computed(() => {
    if (currentStep.value === "original") return "原始简历";
    if (currentStep.value === "diagnosis") return "AI 诊断";
    if (currentStep.value === "final") return "最终简历";
    return getModuleLabel(currentStep.value);
  });
  const currentStepHint = computed(() => stepHint(currentStep.value, readyForFinal.value));
  const workflowProgressCount = computed(() => {
    let count = 0;
    if (isOriginalStepComplete(draft.value)) count += 1;
    if (isDiagnosisStepComplete(draft.value)) count += 1;
    count += confirmedModulesCount.value;
    if (isFinalStepComplete(draft.value)) count += 1;
    return count;
  });

  function buildModuleInput(module: ResumeModuleKey): string {
    const parts = [draft.value[module].input.trim(), draft.value[module].followup_input.trim()].filter(Boolean);
    return parts.join("\n\n【补充回答】\n");
  }

  function canGenerateCandidate(module: ResumeModuleKey): boolean {
    return !!buildModuleInput(module).trim();
  }

  function activeDiagnosisSection(): ResumeDiagnosisSection | null {
    if (!currentModule.value || !draft.value.diagnosis) return null;
    return draft.value.diagnosis[currentModule.value.key] ?? null;
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
    await persistCurrentDraft();
  }

  async function loadWorkspaceState(): Promise<void> {
    if (!tauri) return;
    loadingDraft.value = true;
    try {
      await loadState();
    } finally {
      loadingDraft.value = false;
    }
  }

  function openCreateWorkspaceDialog(): void {
    createDialogVisible.value = true;
  }

  function closeCreateWorkspaceDialog(): void {
    if (createDialogLoading.value) return;
    createDialogVisible.value = false;
  }

  async function createBlankWorkspace(title: string): Promise<void> {
    const nextTitle = title.trim();
    if (!nextTitle) return;
    error.value = null;
    success.value = null;
    createDialogLoading.value = true;
    try {
      await persistCurrentDraft();
      await createNewWorkspace({ title: nextTitle });
      createDialogVisible.value = false;
      currentStep.value = "original";
      success.value = "已创建新的工作区。";
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e);
    } finally {
      createDialogLoading.value = false;
    }
  }

  async function switchWorkspace(workspaceId: string): Promise<void> {
    error.value = null;
    success.value = null;
    try {
      await switchToWorkspace(workspaceId);
      currentStep.value = "original";
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e);
    }
  }

  function openRenameWorkspaceDialog(): void {
    if (!activeWorkspace.value) return;
    renameDialogVisible.value = true;
  }

  function closeRenameWorkspaceDialog(): void {
    if (renameDialogLoading.value) return;
    renameDialogVisible.value = false;
  }

  async function renameWorkspace(title: string): Promise<void> {
    const next = title.trim();
    if (!activeWorkspace.value || !next) return;
    error.value = null;
    success.value = null;
    renameDialogLoading.value = true;
    try {
      await renameCurrentWorkspace(next);
      renameDialogVisible.value = false;
      success.value = "工作区名称已更新。";
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e);
    } finally {
      renameDialogLoading.value = false;
    }
  }

  function openDeleteWorkspaceDialog(): void {
    if (!activeWorkspace.value) return;
    deleteDialogVisible.value = true;
  }

  function closeDeleteWorkspaceDialog(): void {
    if (deleteDialogLoading.value) return;
    deleteDialogVisible.value = false;
  }

  async function deleteWorkspace(): Promise<void> {
    if (!activeWorkspace.value) return;
    error.value = null;
    success.value = null;
    deleteDialogLoading.value = true;
    try {
      await deleteCurrentWorkspace();
      deleteDialogVisible.value = false;
      currentStep.value = "original";
      success.value = "工作区已删除。";
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e);
    } finally {
      deleteDialogLoading.value = false;
    }
  }

  async function pickPdfFile(): Promise<void> {
    if (!tauri) return;
    const selected = await open({ title: "选择原始 PDF 简历", filters: [{ name: "PDF", extensions: ["pdf"] }] });
    if (typeof selected !== "string") return;
    error.value = null;
    success.value = null;

    try {
      if (isPristineDraft(draft.value) && activeWorkspaceId.value) {
        draft.value.source_mode = "file";
        draft.value.original_resume_file = selected;
        draft.value.original_resume_text = "";
        await persistCurrentDraft();
      } else {
        await persistCurrentDraft();
        await createNewWorkspace({
          source_mode: "file",
          original_resume_file: selected,
        });
      }
      currentStep.value = "original";
      success.value = "已基于 PDF 创建并切换工作区。";
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e);
    }
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
      await persistCurrentDraft();
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
      await persistCurrentDraft();
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
      await persistCurrentDraft();
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
      await persistCurrentDraft();
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
    void loadWorkspaceState();
  });

  onBeforeUnmount(() => {
    clearAcceptToastTimers();
  });

  return {
    RESUME_MODULES,
    acceptCandidate,
    acceptToastFading,
    acceptToastMessage,
    acceptToastVisible,
    activeDiagnosisSection,
    activeWorkspace,
    activeWorkspaceId,
    activeWorkspaceSummary,
    activeWorkspaceUpdatedAt,
    assembleFinalResume,
    assembling,
    canGenerateCandidate,
    closeCreateWorkspaceDialog,
    confirmedModulesCount,
    createBlankWorkspace,
    createDialogLoading,
    createDialogVisible,
    currentModule,
    currentStep,
    currentStepHint,
    currentStepLabel,
    deleteWorkspace,
    deleteDialogLoading,
    deleteDialogVisible,
    diagnosing,
    draft,
    error,
    exportPdf,
    exporting,
    generateCandidate,
    loadingDraft,
    navItems,
    openCreateWorkspaceDialog,
    openDeleteWorkspaceDialog,
    openRenameWorkspaceDialog,
    needsRegenerateFinal,
    persistDraft,
    pickPdfFile,
    readyForFinal,
    renameWorkspace,
    renameDialogLoading,
    renameDialogVisible,
    rewritingModule,
    runDiagnosis,
    showCandidateAside,
    success,
    switchWorkspace,
    tauri,
    workflowProgressCount,
    workspaces,
    closeDeleteWorkspaceDialog,
    closeRenameWorkspaceDialog,
  };
}
