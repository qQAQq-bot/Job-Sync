use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};
#[cfg(test)]
use serde_json::Value;
#[cfg(test)]
use time::format_description::well_known::Rfc3339;

use crate::storage;

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ResumeDiagnosisSection {
  #[serde(default)]
  pub assessment: String,
  #[serde(default)]
  pub missing_info: Vec<String>,
  #[serde(default)]
  pub suggestions: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ResumeDiagnosis {
  #[serde(default)]
  pub overall_summary: String,
  #[serde(default)]
  pub summary: ResumeDiagnosisSection,
  #[serde(default)]
  pub projects: ResumeDiagnosisSection,
  #[serde(default)]
  pub experience: ResumeDiagnosisSection,
  #[serde(default)]
  pub skills: ResumeDiagnosisSection,
  #[serde(default)]
  pub next_steps: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ResumeBasicProfile {
  #[serde(default)]
  pub name: String,
  #[serde(default)]
  pub gender: String,
  #[serde(default)]
  pub birth_or_age: String,
  #[serde(default)]
  pub education: String,
  #[serde(default)]
  pub phone: String,
  #[serde(default)]
  pub email: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ResumeWorkspaceModuleDraft {
  #[serde(default)]
  pub input: String,
  #[serde(default)]
  pub followup_input: String,
  #[serde(default)]
  pub candidate: Option<String>,
  #[serde(default)]
  pub notes: Vec<String>,
  #[serde(default)]
  pub checklist: Vec<String>,
  #[serde(default)]
  pub confirmed: Option<String>,
  #[serde(default)]
  pub updated_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResumeWorkspaceDraft {
  #[serde(default = "default_source_mode")]
  pub source_mode: String,
  #[serde(default)]
  pub original_resume_text: String,
  #[serde(default)]
  pub original_resume_file: Option<String>,
  #[serde(default)]
  pub basic_profile: ResumeBasicProfile,
  #[serde(default)]
  pub context_text: String,
  #[serde(default)]
  pub diagnosis: Option<ResumeDiagnosis>,
  #[serde(default)]
  pub summary: ResumeWorkspaceModuleDraft,
  #[serde(default)]
  pub projects: ResumeWorkspaceModuleDraft,
  #[serde(default)]
  pub experience: ResumeWorkspaceModuleDraft,
  #[serde(default)]
  pub skills: ResumeWorkspaceModuleDraft,
  #[serde(default)]
  pub final_resume_text: Option<String>,
  #[serde(default)]
  pub updated_at: Option<String>,
}

impl Default for ResumeWorkspaceDraft {
  fn default() -> Self {
    Self {
      source_mode: default_source_mode(),
      original_resume_text: String::new(),
      original_resume_file: None,
      basic_profile: ResumeBasicProfile::default(),
      context_text: String::new(),
      diagnosis: None,
      summary: ResumeWorkspaceModuleDraft::default(),
      projects: ResumeWorkspaceModuleDraft::default(),
      experience: ResumeWorkspaceModuleDraft::default(),
      skills: ResumeWorkspaceModuleDraft::default(),
      final_resume_text: None,
      updated_at: None,
    }
  }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiagnoseResumeRequest {
  pub resume_text: String,
  #[serde(default)]
  pub context_text: Option<String>,
  #[serde(default)]
  pub resume_files: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RewriteResumeModuleRequest {
  pub module: String,
  pub resume_text: String,
  #[serde(default)]
  pub context_text: Option<String>,
  #[serde(default)]
  pub resume_files: Option<String>,
  pub module_input: String,
  #[serde(default)]
  pub confirmed_summary: Option<String>,
  #[serde(default)]
  pub confirmed_projects: Option<String>,
  #[serde(default)]
  pub confirmed_experience: Option<String>,
  #[serde(default)]
  pub confirmed_skills: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ResumeModuleCandidate {
  #[serde(default)]
  pub module: String,
  #[serde(default)]
  pub candidate: String,
  #[serde(default)]
  pub notes: Vec<String>,
  #[serde(default)]
  pub checklist: Vec<String>,
}

fn default_source_mode() -> String {
  "text".to_string()
}

#[cfg(test)]
fn now_rfc3339() -> String {
  time::OffsetDateTime::now_utc().format(&Rfc3339).unwrap()
}

pub fn draft_path(app_data_dir: &Path) -> PathBuf {
  storage::storage_dir(app_data_dir).join("resume-workspace.json")
}

pub fn load_draft(app_data_dir: &Path) -> Result<ResumeWorkspaceDraft, String> {
  let Some(raw) = storage::read_json(&draft_path(app_data_dir)).map_err(|e| e.to_string())? else {
    return Ok(ResumeWorkspaceDraft::default());
  };
  serde_json::from_value(raw).map_err(|e| format!("解析简历工作区草稿失败：{e}"))
}

#[cfg(test)]
pub fn save_draft(app_data_dir: &Path, mut draft: ResumeWorkspaceDraft) -> Result<ResumeWorkspaceDraft, String> {
  draft.updated_at = Some(now_rfc3339());
  let value: Value = serde_json::to_value(&draft).map_err(|e| e.to_string())?;
  storage::write_json(&draft_path(app_data_dir), &value).map_err(|e| e.to_string())?;
  Ok(draft)
}

pub fn assemble_resume_text(draft: &ResumeWorkspaceDraft) -> String {
  let mut parts: Vec<String> = Vec::new();

  push_section(&mut parts, "个人简介", draft.summary.confirmed.as_deref());
  push_section(&mut parts, "项目经历", draft.projects.confirmed.as_deref());
  push_section(&mut parts, "工作经历", draft.experience.confirmed.as_deref());
  push_section(&mut parts, "技能清单", draft.skills.confirmed.as_deref());

  parts.join("\n\n")
}

fn push_section(parts: &mut Vec<String>, title: &str, content: Option<&str>) {
  let Some(content) = content.map(str::trim).filter(|it| !it.is_empty()) else {
    return;
  };
  parts.push(format!("## {title}\n{content}"));
}
