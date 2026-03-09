use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct JobRow {
  pub encrypt_job_id: String,
  pub position_name: Option<String>,
  pub boss_name: Option<String>,
  pub brand_name: Option<String>,
  pub city_name: Option<String>,
  pub salary_desc: Option<String>,
  pub experience_name: Option<String>,
  pub degree_name: Option<String>,
  pub last_seen_at: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct KeywordGroup {
  pub keyword: Option<String>,
  pub label: String,
  pub job_count: i64,
}

pub(super) fn map_job_row(row: &rusqlite::Row) -> rusqlite::Result<JobRow> {
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
}
