use rusqlite::{params, Connection};
use serde_json::Value;

use crate::paths;

use super::{
  models::{map_job_row, JobRow, KeywordGroup},
  shared::{build_fts_phrase_query, open_conn, should_use_fts},
};

const LIST_JOBS_LIKE_SQL: &str = r#"
      SELECT
        j.encrypt_job_id, j.position_name, j.boss_name, j.brand_name, j.city_name,
        j.salary_desc, j.experience_name, j.degree_name, j.last_seen_at
      FROM job j
      LEFT JOIN job_detail_raw d ON d.encrypt_job_id = j.encrypt_job_id
      WHERE (?1 IS NULL
        OR j.encrypt_job_id LIKE ?1
        OR j.position_name LIKE ?1
        OR j.boss_name LIKE ?1
        OR j.brand_name LIKE ?1
        OR j.city_name LIKE ?1
        OR j.salary_desc LIKE ?1
        OR j.experience_name LIKE ?1
        OR j.degree_name LIKE ?1
        OR d.zp_data_json LIKE ?1
      )
        AND (?2 IS NULL OR j.city_name = ?2)
      ORDER BY
        COALESCE((j.position_name LIKE ?1), 0) DESC,
        CASE WHEN j.position_name LIKE ?1 THEN LENGTH(j.position_name) END ASC,
        COALESCE((j.brand_name LIKE ?1), 0) DESC,
        COALESCE((j.boss_name LIKE ?1), 0) DESC,
        COALESCE((j.encrypt_job_id LIKE ?1), 0) DESC,
        COALESCE((j.city_name LIKE ?1), 0) DESC,
        COALESCE((j.salary_desc LIKE ?1), 0) DESC,
        COALESCE((j.experience_name LIKE ?1), 0) DESC,
        COALESCE((j.degree_name LIKE ?1), 0) DESC,
        COALESCE((d.zp_data_json LIKE ?1), 0) DESC,
        j.last_seen_at DESC
      LIMIT ?3 OFFSET ?4
"#;

const LIST_JOBS_FTS_SQL: &str = r#"
      SELECT
        j.encrypt_job_id, j.position_name, j.boss_name, j.brand_name, j.city_name,
        j.salary_desc, j.experience_name, j.degree_name, j.last_seen_at
      FROM job_fts f
      INNER JOIN job j ON j.encrypt_job_id = f.encrypt_job_id
      WHERE f MATCH ?1
        AND (?2 IS NULL OR j.city_name = ?2)
      ORDER BY bm25(f) ASC, j.last_seen_at DESC
      LIMIT ?3 OFFSET ?4
"#;

fn list_jobs_like(
  conn: &Connection,
  keyword_like: Option<&str>,
  city: Option<&str>,
  limit: i64,
  offset: i64,
) -> Result<Vec<JobRow>, String> {
  let mut stmt = conn.prepare(LIST_JOBS_LIKE_SQL).map_err(|e| e.to_string())?;
  let rows = stmt
    .query_map(params![keyword_like, city, limit, offset], map_job_row)
    .map_err(|e| e.to_string())?;

  let mut out = Vec::new();
  for row in rows {
    out.push(row.map_err(|e| e.to_string())?);
  }
  Ok(out)
}

fn list_jobs_fts(
  conn: &Connection,
  keyword: &str,
  city: Option<&str>,
  limit: i64,
  offset: i64,
) -> Result<Vec<JobRow>, String> {
  let match_expr = build_fts_phrase_query(keyword);
  let mut stmt = conn.prepare(LIST_JOBS_FTS_SQL).map_err(|e| e.to_string())?;
  let rows = stmt
    .query_map(params![match_expr, city, limit, offset], map_job_row)
    .map_err(|e| e.to_string())?;

  let mut out = Vec::new();
  for row in rows {
    out.push(row.map_err(|e| e.to_string())?);
  }
  Ok(out)
}

pub fn list_jobs(
  app: tauri::AppHandle,
  keyword: Option<String>,
  city: Option<String>,
  limit: Option<u32>,
  offset: Option<u32>,
) -> Result<Vec<JobRow>, String> {
  let app_data_dir = paths::resolve_data_dir(&app)?;
  let conn = open_conn(&app_data_dir)?;
  let limit = limit.unwrap_or(200) as i64;
  let offset = offset.unwrap_or(0) as i64;
  let keyword = keyword.map(|value| value.trim().to_string()).filter(|value| !value.is_empty());

  if keyword.as_deref().map(should_use_fts).unwrap_or(false) {
    return list_jobs_fts(&conn, keyword.as_deref().unwrap_or(""), city.as_deref(), limit, offset);
  }

  let keyword_like = keyword.as_ref().map(|value| format!("%{value}%"));
  list_jobs_like(&conn, keyword_like.as_deref(), city.as_deref(), limit, offset)
}

pub fn list_source_keywords(app: tauri::AppHandle, search: Option<String>) -> Result<Vec<KeywordGroup>, String> {
  let app_data_dir = paths::resolve_data_dir(&app)?;
  let conn = open_conn(&app_data_dir)?;
  let search_like = search.as_ref().map(|value| format!("%{}%", value));

  let mut stmt = conn
    .prepare(
      r#"
      SELECT
        s.keyword,
        COUNT(DISTINCT s.encrypt_job_id) AS job_count
      FROM job_source_link s
      WHERE s.keyword IS NOT NULL
        AND (?1 IS NULL OR s.keyword LIKE ?1)
      GROUP BY s.keyword
      ORDER BY MAX(s.captured_at) DESC
      "#,
    )
    .map_err(|e| e.to_string())?;

  let mut out: Vec<KeywordGroup> = stmt
    .query_map(params![search_like.as_deref()], |row| {
      let keyword: String = row.get(0)?;
      let count: i64 = row.get(1)?;
      Ok(KeywordGroup {
        label: keyword.clone(),
        keyword: Some(keyword),
        job_count: count,
      })
    })
    .map_err(|e| e.to_string())?
    .filter_map(|row| row.ok())
    .collect();

  let show_manual = search
    .as_ref()
    .map(|value| "手动采集".contains(value.as_str()))
    .unwrap_or(true);

  if show_manual {
    let manual_count: i64 = conn
      .query_row(
        r#"
        SELECT COUNT(DISTINCT id) FROM (
          SELECT j.encrypt_job_id AS id
          FROM job j
          INNER JOIN job_source_link s ON s.encrypt_job_id = j.encrypt_job_id
          WHERE s.keyword IS NULL
          UNION
          SELECT j.encrypt_job_id AS id
          FROM job j
          WHERE NOT EXISTS (
            SELECT 1 FROM job_source_link s WHERE s.encrypt_job_id = j.encrypt_job_id
          )
        )
        "#,
        [],
        |row| row.get(0),
      )
      .unwrap_or(0);

    if manual_count > 0 {
      out.push(KeywordGroup {
        keyword: None,
        label: "手动采集".to_string(),
        job_count: manual_count,
      });
    }
  }

  Ok(out)
}

pub fn list_jobs_by_source(app: tauri::AppHandle, source_keyword: Option<String>) -> Result<Vec<JobRow>, String> {
  let app_data_dir = paths::resolve_data_dir(&app)?;
  let conn = open_conn(&app_data_dir)?;

  let sql = match &source_keyword {
    Some(_) => {
      r#"
      SELECT DISTINCT
        j.encrypt_job_id, j.position_name, j.boss_name, j.brand_name, j.city_name,
        j.salary_desc, j.experience_name, j.degree_name, j.last_seen_at
      FROM job j
      INNER JOIN job_source_link s ON s.encrypt_job_id = j.encrypt_job_id
      WHERE s.keyword = ?1
      ORDER BY j.last_seen_at DESC
      "#
    }
    None => {
      r#"
      SELECT DISTINCT
        j.encrypt_job_id, j.position_name, j.boss_name, j.brand_name, j.city_name,
        j.salary_desc, j.experience_name, j.degree_name, j.last_seen_at
      FROM job j
      WHERE NOT EXISTS (
        SELECT 1 FROM job_source_link s
        WHERE s.encrypt_job_id = j.encrypt_job_id AND s.keyword IS NOT NULL
      )
      ORDER BY j.last_seen_at DESC
      "#
    }
  };

  let mut stmt = conn.prepare(sql).map_err(|e| e.to_string())?;
  let rows = match &source_keyword {
    Some(keyword) => stmt.query_map(params![keyword], map_job_row).map_err(|e| e.to_string())?,
    None => stmt.query_map([], map_job_row).map_err(|e| e.to_string())?,
  };

  let mut out = Vec::new();
  for row in rows {
    out.push(row.map_err(|e| e.to_string())?);
  }
  Ok(out)
}

pub fn get_job_detail(app: tauri::AppHandle, encrypt_job_id: String) -> Result<Option<Value>, String> {
  let app_data_dir = paths::resolve_data_dir(&app)?;
  let conn = open_conn(&app_data_dir)?;
  let mut stmt = conn
    .prepare("SELECT zp_data_json FROM job_detail_raw WHERE encrypt_job_id = ?1")
    .map_err(|e| e.to_string())?;
  let result: Option<String> = stmt.query_row(params![encrypt_job_id], |row| row.get(0)).ok();

  match result {
    Some(json_str) => {
      let value: Value = serde_json::from_str(&json_str).map_err(|e| e.to_string())?;
      Ok(Some(value))
    }
    None => Ok(None),
  }
}
