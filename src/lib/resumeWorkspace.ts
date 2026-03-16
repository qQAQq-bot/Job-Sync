import { invoke } from "./tauri";

export type ResumeModuleKey = "summary" | "projects" | "experience" | "skills";
export type ResumeWorkspaceStepKey = "original" | "diagnosis" | ResumeModuleKey | "final";

export interface ResumeDiagnosisSection {
  assessment: string;
  missing_info: string[];
  suggestions: string[];
}

export interface ResumeDiagnosis {
  overall_summary: string;
  summary: ResumeDiagnosisSection;
  projects: ResumeDiagnosisSection;
  experience: ResumeDiagnosisSection;
  skills: ResumeDiagnosisSection;
  next_steps: string[];
}

export interface ResumeBasicProfile {
  name: string;
  gender: string;
  birth_or_age: string;
  education: string;
  phone: string;
  email: string;
}

export interface ResumeWorkspaceModuleDraft {
  input: string;
  followup_input: string;
  candidate?: string | null;
  notes: string[];
  checklist: string[];
  confirmed?: string | null;
  updated_at?: string | null;
}

export interface ResumeWorkspaceDraft {
  source_mode: "text" | "file";
  original_resume_text: string;
  original_resume_file?: string | null;
  basic_profile: ResumeBasicProfile;
  context_text: string;
  diagnosis?: ResumeDiagnosis | null;
  summary: ResumeWorkspaceModuleDraft;
  projects: ResumeWorkspaceModuleDraft;
  experience: ResumeWorkspaceModuleDraft;
  skills: ResumeWorkspaceModuleDraft;
  final_resume_text?: string | null;
  updated_at?: string | null;
}

export interface ResumeWorkspaceMeta {
  id: string;
  title: string;
  source_mode: "text" | "file" | string;
  source_name: string;
  created_at: string;
  updated_at: string;
  has_diagnosis: boolean;
  confirmed_modules: number;
  has_final_resume: boolean;
}

export interface ResumeWorkspaceState {
  active_workspace_id: string;
  workspaces: ResumeWorkspaceMeta[];
  draft: ResumeWorkspaceDraft;
}

export interface CreateResumeWorkspaceRequest {
  title?: string | null;
  source_mode?: "text" | "file" | null;
  original_resume_text?: string | null;
  original_resume_file?: string | null;
  basic_profile?: ResumeBasicProfile | null;
  context_text?: string | null;
}

export interface ResumeModuleCandidate {
  module: ResumeModuleKey;
  candidate: string;
  notes: string[];
  checklist: string[];
}

export interface ResumeWorkspaceNavItem {
  key: ResumeWorkspaceStepKey;
  label: string;
  status: "idle" | "active" | "done";
}

export const RESUME_MODULES: Array<{ key: ResumeModuleKey; label: string; placeholder: string }> = [
  { key: "summary", label: "个人简介", placeholder: "补充你的个人定位、求职方向、核心亮点、量化成果等。" },
  { key: "projects", label: "项目经历", placeholder: "补充项目背景、你的角色、技术栈、交付物、指标结果和难点。" },
  { key: "experience", label: "工作经历", placeholder: "补充职责、业务场景、协作范围、影响结果和晋升/带人情况。" },
  { key: "skills", label: "技能清单", placeholder: "补充技术栈、熟练度、使用场景、工具链和方法论。" },
];

function createEmptyModule(): ResumeWorkspaceModuleDraft {
  return {
    input: "",
    followup_input: "",
    candidate: null,
    notes: [],
    checklist: [],
    confirmed: null,
    updated_at: null,
  };
}

export function createDefaultResumeWorkspaceDraft(): ResumeWorkspaceDraft {
  return {
    source_mode: "text",
    original_resume_text: "",
    original_resume_file: null,
    basic_profile: {
      name: "",
      gender: "",
      birth_or_age: "",
      education: "",
      phone: "",
      email: "",
    },
    context_text: "",
    diagnosis: null,
    summary: createEmptyModule(),
    projects: createEmptyModule(),
    experience: createEmptyModule(),
    skills: createEmptyModule(),
    final_resume_text: null,
    updated_at: null,
  };
}

export function getModuleLabel(module: ResumeModuleKey): string {
  return RESUME_MODULES.find((item) => item.key === module)?.label ?? module;
}

export async function getResumeWorkspaceState(): Promise<ResumeWorkspaceState> {
  return invoke<ResumeWorkspaceState>("get_resume_workspace_state");
}

export async function createResumeWorkspace(request: CreateResumeWorkspaceRequest = {}): Promise<ResumeWorkspaceState> {
  return invoke<ResumeWorkspaceState>("create_resume_workspace", { request });
}

export async function switchResumeWorkspace(workspaceId: string): Promise<ResumeWorkspaceState> {
  return invoke<ResumeWorkspaceState>("switch_resume_workspace", { workspaceId });
}

export async function renameResumeWorkspace(workspaceId: string, title: string): Promise<ResumeWorkspaceState> {
  return invoke<ResumeWorkspaceState>("rename_resume_workspace", { workspaceId, title });
}

export async function deleteResumeWorkspace(workspaceId: string): Promise<ResumeWorkspaceState> {
  return invoke<ResumeWorkspaceState>("delete_resume_workspace", { workspaceId });
}

export async function saveResumeWorkspaceDraft(workspaceId: string, draft: ResumeWorkspaceDraft): Promise<ResumeWorkspaceState> {
  return invoke<ResumeWorkspaceState>("save_resume_workspace_draft", { workspaceId, draft });
}

export async function diagnoseResumeWorkspace(request: {
  resume_text: string;
  context_text?: string | null;
  resume_files?: string | null;
}): Promise<ResumeDiagnosis> {
  return invoke<ResumeDiagnosis>("diagnose_resume_workspace", { request });
}

export async function rewriteResumeWorkspaceModule(request: {
  module: ResumeModuleKey;
  resume_text: string;
  context_text?: string | null;
  resume_files?: string | null;
  module_input: string;
  confirmed_summary?: string | null;
  confirmed_projects?: string | null;
  confirmed_experience?: string | null;
  confirmed_skills?: string | null;
}): Promise<ResumeModuleCandidate> {
  return invoke<ResumeModuleCandidate>("rewrite_resume_workspace_module", { request });
}

export async function assembleResumeWorkspace(draft: ResumeWorkspaceDraft): Promise<ResumeWorkspaceDraft> {
  return invoke<ResumeWorkspaceDraft>("assemble_resume_workspace", { draft });
}

export async function exportResumeWorkspacePdf(draft: ResumeWorkspaceDraft, title?: string): Promise<string> {
  return invoke<string>("export_resume_workspace_pdf", { draft, title: title ?? null });
}
