use rusqlite::{params, Transaction};

use crate::{db, paths};

use super::shared::open_conn;

fn cascade_delete_job(tx: &Transaction, encrypt_job_id: &str) -> Result<(), String> {
  tx.execute("DELETE FROM ai_report WHERE encrypt_job_id = ?1", params![encrypt_job_id])
    .map_err(|e| e.to_string())?;
  tx.execute("DELETE FROM job_source_link WHERE encrypt_job_id = ?1", params![encrypt_job_id])
    .map_err(|e| e.to_string())?;
  tx.execute("DELETE FROM job_detail_raw WHERE encrypt_job_id = ?1", params![encrypt_job_id])
    .map_err(|e| e.to_string())?;
  tx.execute("DELETE FROM job WHERE encrypt_job_id = ?1", params![encrypt_job_id])
    .map_err(|e| e.to_string())?;
  Ok(())
}

pub fn delete_job(app: tauri::AppHandle, encrypt_job_id: String) -> Result<(), String> {
  let app_data_dir = paths::resolve_data_dir(&app)?;
  let mut conn = open_conn(&app_data_dir)?;
  let tx = conn.transaction().map_err(|e| e.to_string())?;
  cascade_delete_job(&tx, &encrypt_job_id)?;
  tx.commit().map_err(|e| e.to_string())?;
  Ok(())
}

pub fn delete_all_jobs(app: tauri::AppHandle) -> Result<(), String> {
  let app_data_dir = paths::resolve_data_dir(&app)?;
  let mut conn = open_conn(&app_data_dir)?;
  let tx = conn.transaction().map_err(|e| e.to_string())?;
  tx.execute_batch(
    "DELETE FROM ai_report;
     DELETE FROM job_source_link;
     DELETE FROM job_detail_raw;
     DELETE FROM job;",
  )
  .map_err(|e| e.to_string())?;
  tx.commit().map_err(|e| e.to_string())?;
  Ok(())
}

pub fn rebuild_job_fields(app: tauri::AppHandle) -> Result<u64, String> {
  let app_data_dir = paths::resolve_data_dir(&app)?;
  let conn = open_conn(&app_data_dir)?;
  db::models::rebuild_all_job_fields(&conn).map_err(|e| e.to_string())
}
