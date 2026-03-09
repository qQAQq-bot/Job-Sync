mod config;
mod models;
mod profile_analysis;
mod report_meta;
mod reports;
mod resume_analysis;
mod shared;
mod worker;

use serde_json::Value;

pub use models::ModelInfo;
pub use report_meta::AiReportMeta;

#[tauri::command]
pub async fn analyze_resume_for_job(
  app: tauri::AppHandle,
  encrypt_job_id: String,
  resume_text: String,
  context_text: Option<String>,
  resume_files: Option<String>,
  api_key: Option<String>,
  base_url: Option<String>,
  model: Option<String>,
  api_mode: Option<String>,
  force: Option<bool>,
  debug: Option<bool>,
) -> Result<Value, String> {
  resume_analysis::analyze_resume_for_job(
    app,
    encrypt_job_id,
    resume_text,
    context_text,
    resume_files,
    api_key,
    base_url,
    model,
    api_mode,
    force,
    debug,
  )
  .await
}

#[tauri::command]
pub async fn analyze_profile_for_jobs(
  app: tauri::AppHandle,
  job_ids: Vec<String>,
  context_text: Option<String>,
  api_key: Option<String>,
  base_url: Option<String>,
  model: Option<String>,
  api_mode: Option<String>,
  force: Option<bool>,
  debug: Option<bool>,
) -> Result<Value, String> {
  profile_analysis::analyze_profile_for_jobs(
    app,
    job_ids,
    context_text,
    api_key,
    base_url,
    model,
    api_mode,
    force,
    debug,
  )
  .await
}

#[tauri::command]
pub fn list_ai_reports(
  app: tauri::AppHandle,
  limit: Option<u32>,
  offset: Option<u32>,
  kind: Option<String>,
  query: Option<String>,
) -> Result<Vec<AiReportMeta>, String> {
  reports::list_ai_reports(app, limit, offset, kind, query)
}

#[tauri::command]
pub fn clear_ai_reports(app: tauri::AppHandle) -> Result<u64, String> {
  reports::clear_ai_reports(app)
}

#[tauri::command]
pub fn get_ai_report(app: tauri::AppHandle, id: i64) -> Result<Value, String> {
  reports::get_ai_report(app, id)
}

#[tauri::command]
pub fn list_models(
  app: tauri::AppHandle,
  api_key: Option<String>,
  base_url: Option<String>,
) -> Result<Vec<ModelInfo>, String> {
  models::list_models(app, api_key, base_url)
}
