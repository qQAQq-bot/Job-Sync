use std::{fs, path::{Path, PathBuf}};

use serde::{Deserialize, Serialize};
use serde_json::Value;
use time::format_description::well_known::Rfc3339;

use crate::{resume_workspace::{self, ResumeBasicProfile, ResumeWorkspaceDraft}, storage};

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ResumeWorkspaceMeta {
  #[serde(default)]
  pub id: String,
  #[serde(default)]
  pub title: String,
  #[serde(default)]
  pub source_mode: String,
  #[serde(default)]
  pub source_name: String,
  #[serde(default)]
  pub created_at: String,
  #[serde(default)]
  pub updated_at: String,
  #[serde(default)]
  pub has_diagnosis: bool,
  #[serde(default)]
  pub confirmed_modules: usize,
  #[serde(default)]
  pub has_final_resume: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
struct ResumeWorkspaceIndex {
  #[serde(default)]
  active_workspace_id: String,
  #[serde(default)]
  workspaces: Vec<ResumeWorkspaceMeta>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResumeWorkspaceState {
  pub active_workspace_id: String,
  pub workspaces: Vec<ResumeWorkspaceMeta>,
  pub draft: ResumeWorkspaceDraft,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct CreateResumeWorkspaceRequest {
  #[serde(default)]
  pub title: Option<String>,
  #[serde(default)]
  pub source_mode: Option<String>,
  #[serde(default)]
  pub original_resume_text: Option<String>,
  #[serde(default)]
  pub original_resume_file: Option<String>,
  #[serde(default)]
  pub basic_profile: Option<ResumeBasicProfile>,
  #[serde(default)]
  pub context_text: Option<String>,
}

fn now_rfc3339() -> String {
  time::OffsetDateTime::now_utc().format(&Rfc3339).unwrap()
}

fn create_workspace_id() -> String {
  format!("resume-{}", time::OffsetDateTime::now_utc().unix_timestamp_nanos())
}

fn workspace_root_path(app_data_dir: &Path) -> PathBuf {
  storage::storage_dir(app_data_dir).join("resume-workspaces")
}

fn index_path(app_data_dir: &Path) -> PathBuf {
  workspace_root_path(app_data_dir).join("index.json")
}

fn workspace_draft_path(app_data_dir: &Path, workspace_id: &str) -> PathBuf {
  workspace_root_path(app_data_dir).join(format!("{workspace_id}.json"))
}

fn legacy_backup_path(app_data_dir: &Path) -> PathBuf {
  storage::storage_dir(app_data_dir).join(format!("resume-workspace.migrated-{}.backup.json", time::OffsetDateTime::now_utc().unix_timestamp()))
}

fn confirmed_modules(draft: &ResumeWorkspaceDraft) -> usize {
  [
    draft.summary.confirmed.as_deref(),
    draft.projects.confirmed.as_deref(),
    draft.experience.confirmed.as_deref(),
    draft.skills.confirmed.as_deref(),
  ]
  .into_iter()
  .filter(|value| value.map(str::trim).filter(|it| !it.is_empty()).is_some())
  .count()
}

fn source_name(draft: &ResumeWorkspaceDraft) -> String {
  if let Some(path) = draft.original_resume_file.as_deref() {
    return Path::new(path)
      .file_stem()
      .or_else(|| Path::new(path).file_name())
      .and_then(|value| value.to_str())
      .map(|value| value.to_string())
      .filter(|value| !value.trim().is_empty())
      .unwrap_or_else(|| "PDF 简历".to_string());
  }
  if !draft.original_resume_text.trim().is_empty() {
    return "文本简历".to_string();
  }
  "空白工作区".to_string()
}

fn default_title(draft: &ResumeWorkspaceDraft) -> String {
  if let Some(path) = draft.original_resume_file.as_deref() {
    if let Some(stem) = Path::new(path).file_stem().and_then(|value| value.to_str()) {
      let trimmed = stem.trim();
      if !trimmed.is_empty() {
        return trimmed.to_string();
      }
    }
  }
  let name = draft.basic_profile.name.trim();
  if !name.is_empty() {
    return format!("{name}-未命名简历");
  }
  "未命名简历".to_string()
}

fn create_draft(request: &CreateResumeWorkspaceRequest) -> ResumeWorkspaceDraft {
  let mut draft = ResumeWorkspaceDraft::default();
  if let Some(mode) = request.source_mode.as_deref() {
    draft.source_mode = mode.to_string();
  }
  if let Some(text) = request.original_resume_text.as_deref() {
    draft.original_resume_text = text.to_string();
  }
  if let Some(file) = request.original_resume_file.as_deref() {
    draft.original_resume_file = Some(file.to_string());
  }
  if let Some(profile) = request.basic_profile.clone() {
    draft.basic_profile = profile;
  }
  if let Some(context) = request.context_text.as_deref() {
    draft.context_text = context.to_string();
  }
  draft
}

fn meta_from_draft(id: String, title: String, created_at: String, draft: &ResumeWorkspaceDraft) -> ResumeWorkspaceMeta {
  ResumeWorkspaceMeta {
    id,
    title,
    source_mode: draft.source_mode.clone(),
    source_name: source_name(draft),
    created_at: created_at.clone(),
    updated_at: draft.updated_at.clone().unwrap_or(created_at),
    has_diagnosis: draft.diagnosis.is_some(),
    confirmed_modules: confirmed_modules(draft),
    has_final_resume: draft.final_resume_text.as_deref().map(str::trim).filter(|it| !it.is_empty()).is_some(),
  }
}

fn sync_meta(meta: &mut ResumeWorkspaceMeta, draft: &ResumeWorkspaceDraft) {
  meta.source_mode = draft.source_mode.clone();
  meta.source_name = source_name(draft);
  meta.updated_at = draft.updated_at.clone().unwrap_or_else(now_rfc3339);
  meta.has_diagnosis = draft.diagnosis.is_some();
  meta.confirmed_modules = confirmed_modules(draft);
  meta.has_final_resume = draft.final_resume_text.as_deref().map(str::trim).filter(|it| !it.is_empty()).is_some();
}

fn read_index(app_data_dir: &Path) -> Result<Option<ResumeWorkspaceIndex>, String> {
  let Some(raw) = storage::read_json(&index_path(app_data_dir)).map_err(|e| e.to_string())? else {
    return Ok(None);
  };
  serde_json::from_value(raw)
    .map(Some)
    .map_err(|e| format!("解析简历工作区索引失败：{e}"))
}

fn write_index(app_data_dir: &Path, index: &ResumeWorkspaceIndex) -> Result<(), String> {
  let value: Value = serde_json::to_value(index).map_err(|e| e.to_string())?;
  storage::write_json(&index_path(app_data_dir), &value).map_err(|e| e.to_string())
}

fn read_workspace_draft(app_data_dir: &Path, workspace_id: &str) -> Result<ResumeWorkspaceDraft, String> {
  let path = workspace_draft_path(app_data_dir, workspace_id);
  let Some(raw) = storage::read_json(&path).map_err(|e| e.to_string())? else {
    return Err(format!("简历工作区草稿不存在：{}", path.display()));
  };
  serde_json::from_value(raw).map_err(|e| format!("解析简历工作区草稿失败：{e}"))
}

fn write_workspace_draft(app_data_dir: &Path, workspace_id: &str, mut draft: ResumeWorkspaceDraft) -> Result<ResumeWorkspaceDraft, String> {
  draft.updated_at = Some(now_rfc3339());
  let value: Value = serde_json::to_value(&draft).map_err(|e| e.to_string())?;
  storage::write_json(&workspace_draft_path(app_data_dir, workspace_id), &value).map_err(|e| e.to_string())?;
  Ok(draft)
}

fn active_workspace_exists(index: &ResumeWorkspaceIndex) -> bool {
  index.workspaces.iter().any(|workspace| workspace.id == index.active_workspace_id)
}

fn state_from_index(app_data_dir: &Path, index: ResumeWorkspaceIndex) -> Result<ResumeWorkspaceState, String> {
  if index.workspaces.is_empty() {
    return Err("没有可用的简历工作区。".to_string());
  }
  if !active_workspace_exists(&index) {
    return Err("当前激活的简历工作区不存在。".to_string());
  }
  let draft = read_workspace_draft(app_data_dir, &index.active_workspace_id)?;
  Ok(ResumeWorkspaceState {
    active_workspace_id: index.active_workspace_id,
    workspaces: index.workspaces,
    draft,
  })
}

fn append_workspace(
  app_data_dir: &Path,
  index: &mut ResumeWorkspaceIndex,
  draft: ResumeWorkspaceDraft,
  title_override: Option<String>,
) -> Result<ResumeWorkspaceState, String> {
  let id = create_workspace_id();
  let created_at = now_rfc3339();
  let saved_draft = write_workspace_draft(app_data_dir, &id, draft)?;
  let title = title_override
    .map(|value| value.trim().to_string())
    .filter(|value| !value.is_empty())
    .unwrap_or_else(|| default_title(&saved_draft));
  index.active_workspace_id = id.clone();
  index.workspaces.push(meta_from_draft(id, title, created_at, &saved_draft));
  write_index(app_data_dir, index)?;
  state_from_index(app_data_dir, index.clone())
}

fn migrate_legacy_draft(app_data_dir: &Path) -> Result<ResumeWorkspaceIndex, String> {
  let legacy_path = resume_workspace::draft_path(app_data_dir);
  let draft = resume_workspace::load_draft(app_data_dir)?;
  let mut index = ResumeWorkspaceIndex::default();
  let _ = append_workspace(app_data_dir, &mut index, draft, None)?;
  let backup_path = legacy_backup_path(app_data_dir);
  fs::rename(&legacy_path, &backup_path).map_err(|e| format!("备份旧简历工作区失败：{e}"))?;
  Ok(index)
}

fn load_or_initialize_index(app_data_dir: &Path, create_blank_if_missing: bool) -> Result<ResumeWorkspaceIndex, String> {
  if let Some(index) = read_index(app_data_dir)? {
    if index.workspaces.is_empty() {
      if create_blank_if_missing {
        let mut next = ResumeWorkspaceIndex::default();
        let _ = append_workspace(app_data_dir, &mut next, ResumeWorkspaceDraft::default(), None)?;
        return Ok(next);
      }
      return Ok(index);
    }
    return Ok(index);
  }

  if resume_workspace::draft_path(app_data_dir).exists() {
    return migrate_legacy_draft(app_data_dir);
  }

  if create_blank_if_missing {
    let mut index = ResumeWorkspaceIndex::default();
    let _ = append_workspace(app_data_dir, &mut index, ResumeWorkspaceDraft::default(), None)?;
    return Ok(index);
  }

  Ok(ResumeWorkspaceIndex::default())
}

fn active_fallback_workspace(index: &ResumeWorkspaceIndex) -> Option<String> {
  index
    .workspaces
    .iter()
    .max_by(|left, right| left.updated_at.cmp(&right.updated_at))
    .map(|workspace| workspace.id.clone())
}

pub fn get_state(app_data_dir: &Path) -> Result<ResumeWorkspaceState, String> {
  let index = load_or_initialize_index(app_data_dir, true)?;
  state_from_index(app_data_dir, index)
}

pub fn create_workspace(app_data_dir: &Path, request: CreateResumeWorkspaceRequest) -> Result<ResumeWorkspaceState, String> {
  let mut index = load_or_initialize_index(app_data_dir, false)?;
  append_workspace(app_data_dir, &mut index, create_draft(&request), request.title)
}

pub fn switch_workspace(app_data_dir: &Path, workspace_id: &str) -> Result<ResumeWorkspaceState, String> {
  let mut index = load_or_initialize_index(app_data_dir, true)?;
  if !index.workspaces.iter().any(|workspace| workspace.id == workspace_id) {
    return Err("目标简历工作区不存在。".to_string());
  }
  index.active_workspace_id = workspace_id.to_string();
  write_index(app_data_dir, &index)?;
  state_from_index(app_data_dir, index)
}

pub fn rename_workspace(app_data_dir: &Path, workspace_id: &str, title: &str) -> Result<ResumeWorkspaceState, String> {
  let title = title.trim();
  if title.is_empty() {
    return Err("工作区标题不能为空。".to_string());
  }
  let mut index = load_or_initialize_index(app_data_dir, true)?;
  let workspace = index
    .workspaces
    .iter_mut()
    .find(|workspace| workspace.id == workspace_id)
    .ok_or("目标简历工作区不存在。")?;
  workspace.title = title.to_string();
  workspace.updated_at = now_rfc3339();
  write_index(app_data_dir, &index)?;
  state_from_index(app_data_dir, index)
}

pub fn delete_workspace(app_data_dir: &Path, workspace_id: &str) -> Result<ResumeWorkspaceState, String> {
  let mut index = load_or_initialize_index(app_data_dir, true)?;
  let original_len = index.workspaces.len();
  index.workspaces.retain(|workspace| workspace.id != workspace_id);
  if index.workspaces.len() == original_len {
    return Err("目标简历工作区不存在。".to_string());
  }

  let path = workspace_draft_path(app_data_dir, workspace_id);
  if path.exists() {
    fs::remove_file(&path).map_err(|e| format!("删除简历工作区草稿失败：{e}"))?;
  }

  if index.workspaces.is_empty() {
    let _ = append_workspace(app_data_dir, &mut index, ResumeWorkspaceDraft::default(), None)?;
    return state_from_index(app_data_dir, index);
  }

  index.active_workspace_id = active_fallback_workspace(&index).ok_or("无法确定新的激活工作区。")?;
  write_index(app_data_dir, &index)?;
  state_from_index(app_data_dir, index)
}

pub fn save_workspace_draft(
  app_data_dir: &Path,
  workspace_id: &str,
  draft: ResumeWorkspaceDraft,
) -> Result<ResumeWorkspaceState, String> {
  let mut index = load_or_initialize_index(app_data_dir, true)?;
  let workspace = index
    .workspaces
    .iter_mut()
    .find(|workspace| workspace.id == workspace_id)
    .ok_or("目标简历工作区不存在。")?;
  let saved_draft = write_workspace_draft(app_data_dir, workspace_id, draft)?;
  sync_meta(workspace, &saved_draft);
  write_index(app_data_dir, &index)?;
  state_from_index(app_data_dir, index)
}
