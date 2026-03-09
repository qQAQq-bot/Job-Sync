use rusqlite::{params, OptionalExtension};
use serde_json::Value;
use tauri::AppHandle;

use crate::{db, paths};

use super::{
  report_meta::{compute_ai_report_meta_fields, load_ai_reports, normalize_report_filters, persist_ai_report_updates},
  shared::now_rfc3339,
};

const DEFAULT_REPORT_LIMIT: u32 = 50;
const MAX_REPORT_LIMIT: u32 = 200;

pub(super) fn load_cached_report(
  conn: &rusqlite::Connection,
  encrypt_job_id: &str,
  resume_hash: &str,
  job_hash: &str,
) -> Result<Option<Value>, String> {
  let result_json: Option<String> = conn
    .query_row(
      "SELECT result_json FROM ai_report WHERE encrypt_job_id = ?1 AND resume_hash = ?2 AND job_hash = ?3 LIMIT 1",
      params![encrypt_job_id, resume_hash, job_hash],
      |row| row.get(0),
    )
    .optional()
    .map_err(|e| e.to_string())?;

  match result_json {
    None => Ok(None),
    Some(raw) => Ok(Some(serde_json::from_str(&raw).map_err(|e| e.to_string())?)),
  }
}

pub(super) fn upsert_cached_report(
  conn: &rusqlite::Connection,
  encrypt_job_id: &str,
  resume_hash: &str,
  job_hash: &str,
  result: &Value,
) -> Result<(), String> {
  let result_json = serde_json::to_string(result).map_err(|e| e.to_string())?;
  let created_at = now_rfc3339();
  let (kind, title, match_score, jobs_count) = compute_ai_report_meta_fields(conn, encrypt_job_id, result);

  conn
    .execute(
      r#"
      INSERT INTO ai_report (
        encrypt_job_id,
        resume_hash,
        job_hash,
        kind,
        title,
        match_score,
        jobs_count,
        result_json,
        created_at
      )
      VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
      ON CONFLICT(encrypt_job_id, resume_hash, job_hash) DO UPDATE SET
        kind = excluded.kind,
        title = excluded.title,
        match_score = excluded.match_score,
        jobs_count = excluded.jobs_count,
        result_json = excluded.result_json,
        created_at = excluded.created_at
      "#,
      params![
        encrypt_job_id,
        resume_hash,
        job_hash,
        kind,
        title,
        match_score,
        jobs_count,
        result_json,
        created_at,
      ],
    )
    .map_err(|e| e.to_string())?;

  Ok(())
}

pub fn list_ai_reports(
  app: AppHandle,
  limit: Option<u32>,
  offset: Option<u32>,
  kind: Option<String>,
  query: Option<String>,
) -> Result<Vec<super::report_meta::AiReportMeta>, String> {
  let app_data_dir = paths::resolve_data_dir(&app)?;
  let mut conn = db::init_db(&app_data_dir).map_err(|e| e.to_string())?;
  let limit = limit.unwrap_or(DEFAULT_REPORT_LIMIT).min(MAX_REPORT_LIMIT) as i64;
  let offset = offset.unwrap_or(0) as i64;
  let filters = normalize_report_filters(kind, query);
  let (out, updates) = load_ai_reports(&conn, limit, offset, &filters)?;
  persist_ai_report_updates(&mut conn, updates)?;
  Ok(out)
}

pub fn clear_ai_reports(app: AppHandle) -> Result<u64, String> {
  let app_data_dir = paths::resolve_data_dir(&app)?;
  let conn = db::init_db(&app_data_dir).map_err(|e| e.to_string())?;
  let deleted = conn.execute("DELETE FROM ai_report", []).map_err(|e| e.to_string())?;
  Ok(deleted as u64)
}

pub fn get_ai_report(app: AppHandle, id: i64) -> Result<Value, String> {
  let app_data_dir = paths::resolve_data_dir(&app)?;
  let conn = db::init_db(&app_data_dir).map_err(|e| e.to_string())?;

  let result_json: Option<String> = conn
    .query_row("SELECT result_json FROM ai_report WHERE id = ?1", [id], |row| row.get(0))
    .optional()
    .map_err(|e| e.to_string())?;

  let Some(raw) = result_json else {
    return Err("未找到该报告。".to_string());
  };

  serde_json::from_str(&raw).map_err(|e| e.to_string())
}
