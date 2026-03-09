use std::{
  fs,
  path::{Path, PathBuf},
};

use rusqlite::Connection;
use serde::Serialize;
use time::format_description::well_known::Rfc3339;

use crate::{db, paths};

fn now_compact_ts() -> String {
  time::OffsetDateTime::now_utc()
    .format(&Rfc3339)
    .unwrap()
    .replace([':', '-'], "")
}

fn export_dir(app_data_dir: &Path) -> PathBuf {
  app_data_dir.join("exports")
}

#[derive(Debug, Serialize)]
struct JobRow {
  encrypt_job_id: String,
  position_name: Option<String>,
  boss_name: Option<String>,
  brand_name: Option<String>,
  city_name: Option<String>,
  salary_desc: Option<String>,
  experience_name: Option<String>,
  degree_name: Option<String>,
  last_seen_at: Option<String>,
}

fn open_conn(app_data_dir: &Path) -> Result<Connection, String> {
  db::init_db(app_data_dir).map_err(|e| e.to_string())
}

fn query_jobs(conn: &Connection) -> Result<Vec<JobRow>, String> {
  let mut stmt = conn
    .prepare(
      r#"
      SELECT
        encrypt_job_id,
        position_name,
        boss_name,
        brand_name,
        city_name,
        salary_desc,
        experience_name,
        degree_name,
        last_seen_at
      FROM job
      ORDER BY last_seen_at DESC
      "#,
    )
    .map_err(|e| e.to_string())?;

  let rows = stmt
    .query_map([], |row| {
      Ok(JobRow {
        encrypt_job_id: row.get(0)?,
        position_name: row.get(1)?,
        boss_name: row.get(2)?,
        brand_name: row.get(3)?,
        city_name: row.get(4)?,
        salary_desc: row.get(5)?,
        experience_name: row.get(6)?,
        degree_name: row.get(7)?,
        last_seen_at: row.get(8)?,
      })
    })
    .map_err(|e| e.to_string())?;

  let mut out = Vec::new();
  for row in rows {
    out.push(row.map_err(|e| e.to_string())?);
  }
  Ok(out)
}

#[tauri::command]
pub fn export_jobs_csv(app: tauri::AppHandle) -> Result<String, String> {
  let app_data_dir = paths::resolve_data_dir(&app)?;

  let conn = open_conn(&app_data_dir)?;
  let jobs = query_jobs(&conn)?;

  let dir = export_dir(&app_data_dir);
  fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
  let path = dir.join(format!("jobs-{}.csv", now_compact_ts()));

  let mut wtr = csv::Writer::from_path(&path).map_err(|e| e.to_string())?;
  for job in jobs {
    wtr.serialize(job).map_err(|e| e.to_string())?;
  }
  wtr.flush().map_err(|e| e.to_string())?;

  Ok(path.to_string_lossy().to_string())
}

#[tauri::command]
pub fn export_jobs_json(app: tauri::AppHandle) -> Result<String, String> {
  let app_data_dir = paths::resolve_data_dir(&app)?;

  let conn = open_conn(&app_data_dir)?;
  let jobs = query_jobs(&conn)?;

  let dir = export_dir(&app_data_dir);
  fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
  let path = dir.join(format!("jobs-{}.json", now_compact_ts()));

  let bytes = serde_json::to_vec_pretty(&jobs).map_err(|e| e.to_string())?;
  fs::write(&path, bytes).map_err(|e| e.to_string())?;

  Ok(path.to_string_lossy().to_string())
}
