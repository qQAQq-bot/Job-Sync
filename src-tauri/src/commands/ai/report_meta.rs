use rusqlite::params;
use serde_json::Value;

use super::{config::opt_trimmed, shared::describe_job_brief};

pub(super) type ReportMetaUpdate = (i64, String, String, Option<f64>, Option<i64>);

#[derive(serde::Serialize)]
pub struct AiReportMeta {
  pub id: i64,
  pub kind: String,
  pub encrypt_job_id: String,
  pub title: String,
  pub created_at: String,
  pub match_score: Option<f64>,
  pub jobs_count: Option<i64>,
}

pub(super) struct ReportFilters {
  pub kind: Option<String>,
  pub query: Option<String>,
}

struct StoredReportRow {
  id: i64,
  encrypt_job_id: String,
  created_at: String,
  kind: Option<String>,
  title: Option<String>,
  match_score: Option<f64>,
  jobs_count: Option<i64>,
  raw: String,
}

pub(super) fn normalize_report_filters(kind: Option<String>, query: Option<String>) -> ReportFilters {
  let kind = opt_trimmed(kind).and_then(|raw| match raw.as_str() {
    "all" => None,
    "group" => Some("group".to_string()),
    "resume" | "job" => Some("resume".to_string()),
    _ => None,
  });
  let query = opt_trimmed(query);
  ReportFilters { kind, query }
}

pub(super) fn load_ai_reports(
  conn: &rusqlite::Connection,
  limit: i64,
  offset: i64,
  filters: &ReportFilters,
) -> Result<(Vec<AiReportMeta>, Vec<ReportMetaUpdate>), String> {
  let mut stmt = conn.prepare(report_query_sql(filters.kind.as_deref())).map_err(|e| e.to_string())?;
  let rows = stmt
    .query_map(params![limit, offset, filters.query.as_deref()], map_report_row)
    .map_err(|e| e.to_string())?;

  let mut out = Vec::new();
  let mut updates = Vec::new();
  for row in rows {
    let (meta, update) = build_report_meta(conn, row.map_err(|e| e.to_string())?)?;
    out.push(meta);
    if let Some(update) = update {
      updates.push(update);
    }
  }

  Ok((out, updates))
}

pub(super) fn persist_ai_report_updates(
  conn: &mut rusqlite::Connection,
  updates: Vec<ReportMetaUpdate>,
) -> Result<(), String> {
  if updates.is_empty() {
    return Ok(());
  }

  let tx = conn.transaction().map_err(|e| e.to_string())?;
  for (id, kind, title, match_score, jobs_count) in updates {
    tx.execute(
      "UPDATE ai_report SET kind = ?2, title = ?3, match_score = ?4, jobs_count = ?5 WHERE id = ?1",
      params![id, kind, title, match_score, jobs_count],
    )
    .map_err(|e| e.to_string())?;
  }
  tx.commit().map_err(|e| e.to_string())?;
  Ok(())
}

pub(super) fn compute_ai_report_meta_fields(
  conn: &rusqlite::Connection,
  encrypt_job_id: &str,
  result: &Value,
) -> (String, String, Option<f64>, Option<i64>) {
  if is_group_report(encrypt_job_id, result) {
    return compute_group_report_meta(result);
  }

  let match_score = json_get_f64(result, "matchScore");
  let title = describe_job_brief(conn, encrypt_job_id).unwrap_or_else(|| encrypt_job_id.to_string());
  ("resume".to_string(), title, match_score, None)
}

fn report_query_sql(kind: Option<&str>) -> &'static str {
  match kind {
    None => {
      "SELECT id, encrypt_job_id, created_at, kind, title, match_score, jobs_count, result_json
      FROM ai_report
      WHERE (?3 IS NULL OR title LIKE '%' || ?3 || '%' OR encrypt_job_id LIKE '%' || ?3 || '%')
      ORDER BY created_at DESC
      LIMIT ?1 OFFSET ?2"
    }
    Some("group") => {
      "SELECT id, encrypt_job_id, created_at, kind, title, match_score, jobs_count, result_json
      FROM ai_report
      WHERE (kind = 'group' OR encrypt_job_id LIKE 'group:%')
        AND (?3 IS NULL OR title LIKE '%' || ?3 || '%' OR encrypt_job_id LIKE '%' || ?3 || '%')
      ORDER BY created_at DESC
      LIMIT ?1 OFFSET ?2"
    }
    Some("resume") => {
      "SELECT id, encrypt_job_id, created_at, kind, title, match_score, jobs_count, result_json
      FROM ai_report
      WHERE encrypt_job_id NOT LIKE 'group:%'
        AND (kind IS NULL OR kind = 'resume')
        AND (?3 IS NULL OR title LIKE '%' || ?3 || '%' OR encrypt_job_id LIKE '%' || ?3 || '%')
      ORDER BY created_at DESC
      LIMIT ?1 OFFSET ?2"
    }
    _ => {
      "SELECT id, encrypt_job_id, created_at, kind, title, match_score, jobs_count, result_json
      FROM ai_report
      WHERE (?3 IS NULL OR title LIKE '%' || ?3 || '%' OR encrypt_job_id LIKE '%' || ?3 || '%')
      ORDER BY created_at DESC
      LIMIT ?1 OFFSET ?2"
    }
  }
}

fn map_report_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<StoredReportRow> {
  Ok(StoredReportRow {
    id: row.get(0)?,
    encrypt_job_id: row.get(1)?,
    created_at: row.get(2)?,
    kind: row.get(3)?,
    title: row.get(4)?,
    match_score: row.get(5)?,
    jobs_count: row.get(6)?,
    raw: row.get(7)?,
  })
}

fn build_report_meta(
  conn: &rusqlite::Connection,
  row: StoredReportRow,
) -> Result<(AiReportMeta, Option<ReportMetaUpdate>), String> {
  let kind = opt_trimmed(row.kind);
  let title = opt_trimmed(row.title);

  if let (Some(kind), Some(title)) = (kind, title) {
    return Ok((
      AiReportMeta {
        id: row.id,
        kind,
        encrypt_job_id: row.encrypt_job_id,
        title,
        created_at: row.created_at,
        match_score: row.match_score,
        jobs_count: row.jobs_count,
      },
      None,
    ));
  }

  let parsed: Value = serde_json::from_str(&row.raw).unwrap_or(Value::Null);
  let (kind, title, match_score, jobs_count) =
    compute_ai_report_meta_fields(conn, &row.encrypt_job_id, &parsed);
  let update = Some((row.id, kind.clone(), title.clone(), match_score, jobs_count));
  Ok((
    AiReportMeta {
      id: row.id,
      kind,
      encrypt_job_id: row.encrypt_job_id,
      title,
      created_at: row.created_at,
      match_score,
      jobs_count,
    },
    update,
  ))
}

fn json_get_f64(value: &Value, key: &str) -> Option<f64> {
  let raw = value.get(key)?;
  if let Some(number) = raw.as_f64() {
    return Some(number);
  }
  if let Some(number) = raw.as_i64() {
    return Some(number as f64);
  }
  raw.as_u64().map(|number| number as f64)
}

fn is_group_report(encrypt_job_id: &str, result: &Value) -> bool {
  if encrypt_job_id.starts_with("group:") {
    return true;
  }
  result.get("jobRanking").and_then(|value| value.as_array()).is_some()
}

fn compute_group_report_meta(result: &Value) -> (String, String, Option<f64>, Option<i64>) {
  let ranking = result
    .get("jobRanking")
    .and_then(|value| value.as_array())
    .cloned()
    .unwrap_or_default();
  let jobs_count = Some(ranking.len() as i64);
  let best = ranking.first().and_then(|value| value.as_object());
  let best_pos = best
    .and_then(|item| item.get("position_name").and_then(|value| value.as_str()))
    .map(str::trim)
    .filter(|value| !value.is_empty());
  let best_brand = best
    .and_then(|item| item.get("brand_name").and_then(|value| value.as_str()))
    .map(str::trim)
    .filter(|value| !value.is_empty());
  let match_score = best.and_then(|item| json_get_f64(&Value::Object(item.clone()), "matchScore"));

  let title = match (best_pos, best_brand) {
    (Some(position), Some(brand)) => format!("综合分析：{position} · {brand}"),
    (Some(position), None) => format!("综合分析：{position}"),
    _ => format!("综合分析（{} 个职位）", jobs_count.unwrap_or(0)),
  };

  ("group".to_string(), title, match_score, jobs_count)
}
