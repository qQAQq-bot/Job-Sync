<script setup lang="ts">
import ResumeCandidatePreview from "../components/resume-workspace/ResumeCandidatePreview.vue";
import ResumeWorkspaceDeleteDialog from "../components/resume-workspace/ResumeWorkspaceDeleteDialog.vue";
import ResumeDiagnosisView from "../components/resume-workspace/ResumeDiagnosisView.vue";
import ResumeFinalPreview from "../components/resume-workspace/ResumeFinalPreview.vue";
import ResumeWorkspaceHeader from "../components/resume-workspace/ResumeWorkspaceHeader.vue";
import ResumeWorkspaceRenameDialog from "../components/resume-workspace/ResumeWorkspaceRenameDialog.vue";
import ResumeModuleEditor from "../components/resume-workspace/ResumeModuleEditor.vue";
import ResumeWorkspaceNav from "../components/resume-workspace/ResumeWorkspaceNav.vue";
import ResumeWorkspaceSourcePanel from "../components/resume-workspace/ResumeWorkspaceSourcePanel.vue";
import { useResumeWorkspacePage } from "../lib/useResumeWorkspacePage";

const {
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
  closeDeleteWorkspaceDialog,
  closeRenameWorkspaceDialog,
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
  workflowProgressCount,
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
  workspaces,
} = useResumeWorkspacePage();
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
      <div v-if="acceptToastVisible && acceptToastMessage" class="pointer-events-none fixed inset-x-0 top-4 z-[999] flex justify-center px-4">
        <div class="resume-paper-alert resume-paper-alert--success w-full max-w-xl px-4 py-3 shadow-lg backdrop-blur-md transition-opacity duration-300" :class="acceptToastFading ? 'opacity-0' : 'opacity-100'">
          {{ acceptToastMessage }}
        </div>
      </div>
    </Transition>
  </Teleport>

  <section class="space-y-6">
    <ResumeWorkspaceHeader
      :current-step-label="currentStepLabel"
      :current-step-hint="currentStepHint"
      :workflow-progress-count="workflowProgressCount"
      :workflow-progress-total="navItems.length"
      :module-confirmed-count="confirmedModulesCount"
      :module-confirmed-total="RESUME_MODULES.length"
      :active-workspace-id="activeWorkspaceId"
      :active-workspace-title="activeWorkspace?.title || '未命名简历'"
      :active-workspace-updated-at="activeWorkspaceUpdatedAt"
      :active-workspace-summary="activeWorkspaceSummary"
      :workspaces="workspaces"
      @switch-workspace="switchWorkspace"
      @create-workspace="openCreateWorkspaceDialog"
      @rename-workspace="openRenameWorkspaceDialog"
      @delete-workspace="openDeleteWorkspaceDialog"
    />

    <div v-if="!tauri" class="ui-status-warning p-4 text-sm">当前是浏览器模式（非 Tauri）。简历工作区不可用。</div>
    <div v-if="loadingDraft" class="ui-panel p-4 text-sm text-content-secondary">正在读取工作区草稿…</div>
    <div v-if="error" class="ui-status-danger p-4 text-sm">{{ error }}</div>
    <div v-if="success" class="ui-status-success p-4 text-sm">{{ success }}</div>

    <div class="resume-review-shell" :class="showCandidateAside ? 'resume-review-shell--with-aside' : ''">
      <ResumeWorkspaceNav :items="navItems" :current-step="currentStep" @select="currentStep = $event" />

      <section class="resume-paper-stage">
        <ResumeWorkspaceSourcePanel
          v-if="currentStep === 'original'"
          :source-mode="draft.source_mode"
          :original-resume-text="draft.original_resume_text"
          :original-resume-file="draft.original_resume_file"
          :context-text="draft.context_text"
          :basic-profile="draft.basic_profile"
          :diagnosing="diagnosing"
          @update:source-mode="draft.source_mode = $event"
          @update:original-resume-text="draft.original_resume_text = $event"
          @update:context-text="draft.context_text = $event"
          @update:profile-field="(field, value) => (draft.basic_profile[field] = value)"
          @pick-pdf-file="pickPdfFile"
          @save-draft="persistDraft"
          @run-diagnosis="runDiagnosis"
        />

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

    <ResumeWorkspaceRenameDialog
      :visible="createDialogVisible"
      initial-title=""
      :loading="createDialogLoading"
      dialog-title="新建工作区"
      description="请先输入新的工作区名称。创建后会立即切换到该工作区，并保留当前工作区内容。"
      confirm-label="创建工作区"
      field-label="新工作区名称"
      placeholder="例如：AI 产品经理-投递版"
      @close="closeCreateWorkspaceDialog"
      @confirm="createBlankWorkspace"
    />

    <ResumeWorkspaceRenameDialog
      :visible="renameDialogVisible"
      :initial-title="activeWorkspace?.title || ''"
      :loading="renameDialogLoading"
      @close="closeRenameWorkspaceDialog"
      @confirm="renameWorkspace"
    />

    <ResumeWorkspaceDeleteDialog
      :visible="deleteDialogVisible"
      :workspace-title="activeWorkspace?.title || '未命名简历'"
      :loading="deleteDialogLoading"
      @close="closeDeleteWorkspaceDialog"
      @confirm="deleteWorkspace"
    />
  </section>
</template>
