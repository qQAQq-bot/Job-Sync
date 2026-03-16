import { computed, ref } from "vue";

import {
  createDefaultResumeWorkspaceDraft,
  createResumeWorkspace,
  deleteResumeWorkspace,
  getResumeWorkspaceState,
  renameResumeWorkspace,
  saveResumeWorkspaceDraft,
  switchResumeWorkspace,
  type CreateResumeWorkspaceRequest,
  type ResumeWorkspaceDraft,
  type ResumeWorkspaceMeta,
  type ResumeWorkspaceState,
} from "./resumeWorkspace";

function applyState(
  state: ResumeWorkspaceState,
  activeWorkspaceId: { value: string },
  workspaces: { value: ResumeWorkspaceMeta[] },
  draft: { value: ResumeWorkspaceDraft },
): void {
  activeWorkspaceId.value = state.active_workspace_id;
  workspaces.value = state.workspaces;
  draft.value = state.draft;
}

export function useResumeWorkspaceStore() {
  const activeWorkspaceId = ref("");
  const workspaces = ref<ResumeWorkspaceMeta[]>([]);
  const draft = ref<ResumeWorkspaceDraft>(createDefaultResumeWorkspaceDraft());

  const activeWorkspace = computed(
    () => workspaces.value.find((workspace) => workspace.id === activeWorkspaceId.value) ?? null,
  );

  const activeWorkspaceSummary = computed(() => {
    const workspace = activeWorkspace.value;
    if (!workspace) return "空白工作区";
    const parts: string[] = [];
    parts.push(workspace.has_diagnosis ? "已诊断" : "未诊断");
    parts.push(`${workspace.confirmed_modules}/4 模块确认`);
    if (workspace.has_final_resume) parts.push("最终稿已生成");
    return parts.join(" · ");
  });

  const activeWorkspaceUpdatedAt = computed(
    () => activeWorkspace.value?.updated_at || draft.value.updated_at || "未保存",
  );

  async function loadState(): Promise<void> {
    const state = await getResumeWorkspaceState();
    applyState(state, activeWorkspaceId, workspaces, draft);
  }

  async function persistCurrentDraft(): Promise<void> {
    if (!activeWorkspaceId.value) return;
    const state = await saveResumeWorkspaceDraft(activeWorkspaceId.value, draft.value);
    applyState(state, activeWorkspaceId, workspaces, draft);
  }

  async function createNewWorkspace(request: CreateResumeWorkspaceRequest = {}): Promise<void> {
    const state = await createResumeWorkspace(request);
    applyState(state, activeWorkspaceId, workspaces, draft);
  }

  async function switchToWorkspace(workspaceId: string): Promise<void> {
    if (!workspaceId || workspaceId === activeWorkspaceId.value) return;
    await persistCurrentDraft();
    const state = await switchResumeWorkspace(workspaceId);
    applyState(state, activeWorkspaceId, workspaces, draft);
  }

  async function renameCurrentWorkspace(title: string): Promise<void> {
    if (!activeWorkspaceId.value) return;
    const state = await renameResumeWorkspace(activeWorkspaceId.value, title);
    applyState(state, activeWorkspaceId, workspaces, draft);
  }

  async function deleteCurrentWorkspace(): Promise<void> {
    if (!activeWorkspaceId.value) return;
    const state = await deleteResumeWorkspace(activeWorkspaceId.value);
    applyState(state, activeWorkspaceId, workspaces, draft);
  }

  return {
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
  };
}
