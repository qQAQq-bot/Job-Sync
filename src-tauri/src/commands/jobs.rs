mod models;
mod mutations;
mod queries;
mod shared;

use serde_json::Value;

pub use models::{JobRow, KeywordGroup};

#[tauri::command]
pub fn list_jobs(
  app: tauri::AppHandle,
  keyword: Option<String>,
  city: Option<String>,
  limit: Option<u32>,
  offset: Option<u32>,
) -> Result<Vec<JobRow>, String> {
  queries::list_jobs(app, keyword, city, limit, offset)
}

#[tauri::command]
pub fn list_source_keywords(
  app: tauri::AppHandle,
  search: Option<String>,
) -> Result<Vec<KeywordGroup>, String> {
  queries::list_source_keywords(app, search)
}

#[tauri::command]
pub fn list_jobs_by_source(
  app: tauri::AppHandle,
  source_keyword: Option<String>,
) -> Result<Vec<JobRow>, String> {
  queries::list_jobs_by_source(app, source_keyword)
}

#[tauri::command]
pub fn get_job_detail(
  app: tauri::AppHandle,
  encrypt_job_id: String,
) -> Result<Option<Value>, String> {
  queries::get_job_detail(app, encrypt_job_id)
}

#[tauri::command]
pub fn delete_job(app: tauri::AppHandle, encrypt_job_id: String) -> Result<(), String> {
  mutations::delete_job(app, encrypt_job_id)
}

#[tauri::command]
pub fn delete_all_jobs(app: tauri::AppHandle) -> Result<(), String> {
  mutations::delete_all_jobs(app)
}

#[tauri::command]
pub fn rebuild_job_fields(app: tauri::AppHandle) -> Result<u64, String> {
  mutations::rebuild_job_fields(app)
}
