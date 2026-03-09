use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LoginStartPayload {
  #[serde(default)]
  #[serde(skip_serializing_if = "Option::is_none")]
  pub executable_path: Option<String>,
  #[serde(default)]
  #[serde(skip_serializing_if = "Option::is_none")]
  pub user_data_dir: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionStatePayload {
  pub cookies: Value,
  pub local_storage: Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CrawlAutoStartPayload {
  pub session: SessionStatePayload,
  pub task: SearchTaskPayload,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CrawlManualStartPayload {
  pub session: SessionStatePayload,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BossMetaSyncPayload {
  pub session: SessionStatePayload,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchTaskPayload {
  pub keywords: Vec<String>,
  #[serde(default)]
  pub filters: Value,
  #[serde(default)]
  pub limits: Value,
  #[serde(default)]
  #[serde(skip_serializing_if = "Option::is_none")]
  pub mode: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AiAnalyzePayload {
  pub resume_text: String,
  #[serde(default)]
  #[serde(skip_serializing_if = "Option::is_none")]
  pub context_text: Option<String>,
  #[serde(default)]
  #[serde(skip_serializing_if = "Option::is_none")]
  pub resume_files: Option<String>,
  pub job_detail: Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AiAnalyzeGroupPayload {
  pub context_text: String,
  pub jobs: Vec<Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResumeDiagnosePayload {
  pub resume_text: String,
  #[serde(default)]
  #[serde(skip_serializing_if = "Option::is_none")]
  pub context_text: Option<String>,
  #[serde(default)]
  #[serde(skip_serializing_if = "Option::is_none")]
  pub resume_files: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResumeRewriteModulePayload {
  pub module: String,
  pub resume_text: String,
  #[serde(default)]
  #[serde(skip_serializing_if = "Option::is_none")]
  pub context_text: Option<String>,
  #[serde(default)]
  #[serde(skip_serializing_if = "Option::is_none")]
  pub resume_files: Option<String>,
  pub module_input: String,
  #[serde(default)]
  #[serde(skip_serializing_if = "Option::is_none")]
  pub confirmed_summary: Option<String>,
  #[serde(default)]
  #[serde(skip_serializing_if = "Option::is_none")]
  pub confirmed_projects: Option<String>,
  #[serde(default)]
  #[serde(skip_serializing_if = "Option::is_none")]
  pub confirmed_experience: Option<String>,
  #[serde(default)]
  #[serde(skip_serializing_if = "Option::is_none")]
  pub confirmed_skills: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", content = "payload")]
pub enum CommandIn {
  #[serde(rename = "LOGIN_START")]
  LoginStart(LoginStartPayload),
  #[serde(rename = "CRAWL_MANUAL_START")]
  CrawlManualStart(CrawlManualStartPayload),
  #[serde(rename = "CRAWL_AUTO_START")]
  CrawlAutoStart(CrawlAutoStartPayload),
  #[serde(rename = "BOSS_META_SYNC")]
  BossMetaSync(BossMetaSyncPayload),
  #[serde(rename = "AI_ANALYZE")]
  AiAnalyze(AiAnalyzePayload),
  #[serde(rename = "AI_ANALYZE_GROUP")]
  AiAnalyzeGroup(AiAnalyzeGroupPayload),
  #[serde(rename = "RESUME_DIAGNOSE")]
  ResumeDiagnose(ResumeDiagnosePayload),
  #[serde(rename = "RESUME_REWRITE_MODULE")]
  ResumeRewriteModule(ResumeRewriteModulePayload),
  #[serde(rename = "STOP")]
  Stop,
  #[serde(rename = "PAUSE")]
  Pause,
  #[serde(rename = "RESUME")]
  Resume,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogPayload {
  pub level: String,
  pub message: String,
  #[serde(default)]
  pub ts: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProgressPayload {
  #[serde(default)]
  pub keyword: Option<String>,
  #[serde(default)]
  pub current_page: Option<u32>,
  #[serde(default)]
  pub captured_job_list: Option<u32>,
  #[serde(default)]
  pub captured_job_detail: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LoginStatusPayload {
  pub status: String,
  #[serde(default)]
  pub message: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CookieCollectedPayload {
  pub cookies: Value,
  pub local_storage: Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JobListCapturedPayload {
  #[serde(default)]
  pub keyword: Option<String>,
  #[serde(default)]
  pub filters: Option<Value>,
  pub raw: Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JobDetailCapturedPayload {
  pub encrypt_job_id: String,
  pub zp_data: Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AiResultPayload {
  pub result: Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BossMetaSyncedPayload {
  #[serde(default)]
  #[serde(skip_serializing_if = "Option::is_none")]
  pub synced_at: Option<String>,
  #[serde(default)]
  #[serde(skip_serializing_if = "Option::is_none")]
  pub city_group: Option<Value>,
  #[serde(default)]
  #[serde(skip_serializing_if = "Option::is_none")]
  pub filter_conditions: Option<Value>,
  #[serde(default)]
  #[serde(skip_serializing_if = "Option::is_none")]
  pub industry_filter_exemption: Option<Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ErrorPayload {
  pub message: String,
  #[serde(default)]
  pub stack: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", content = "payload")]
pub enum EventOut {
  #[serde(rename = "LOG")]
  Log(LogPayload),
  #[serde(rename = "PROGRESS")]
  Progress(ProgressPayload),
  #[serde(rename = "LOGIN_STATUS")]
  LoginStatus(LoginStatusPayload),
  #[serde(rename = "COOKIE_COLLECTED")]
  CookieCollected(CookieCollectedPayload),
  #[serde(rename = "JOB_LIST_CAPTURED")]
  JobListCaptured(JobListCapturedPayload),
  #[serde(rename = "JOB_DETAIL_CAPTURED")]
  JobDetailCaptured(JobDetailCapturedPayload),
  #[serde(rename = "AI_RESULT")]
  AiResult(AiResultPayload),
  #[serde(rename = "BOSS_META_SYNCED")]
  BossMetaSynced(BossMetaSyncedPayload),
  #[serde(rename = "FINISHED")]
  Finished,
  #[serde(rename = "ERROR")]
  Error(ErrorPayload),
}
