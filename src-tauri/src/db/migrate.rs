use rusqlite::Connection;

use super::Result;

const JOB_FTS_TABLE: &str = "job_fts";
const JOB_FTS_CREATE_SQL: &str = r#"
CREATE VIRTUAL TABLE IF NOT EXISTS job_fts USING fts5(
  encrypt_job_id UNINDEXED,
  position_name,
  boss_name,
  brand_name,
  city_name,
  salary_desc,
  experience_name,
  degree_name,
  detail_text,
  tokenize='trigram'
);
"#;

const JOB_FTS_TRIGGERS_SQL: &str = r#"
CREATE TRIGGER IF NOT EXISTS trg_job_fts_job_ai
AFTER INSERT ON job
BEGIN
  DELETE FROM job_fts WHERE encrypt_job_id = NEW.encrypt_job_id;
  INSERT INTO job_fts(
    encrypt_job_id,
    position_name,
    boss_name,
    brand_name,
    city_name,
    salary_desc,
    experience_name,
    degree_name,
    detail_text
  )
  VALUES(
    NEW.encrypt_job_id,
    COALESCE(NEW.position_name, ''),
    COALESCE(NEW.boss_name, ''),
    COALESCE(NEW.brand_name, ''),
    COALESCE(NEW.city_name, ''),
    COALESCE(NEW.salary_desc, ''),
    COALESCE(NEW.experience_name, ''),
    COALESCE(NEW.degree_name, ''),
    COALESCE((SELECT zp_data_json FROM job_detail_raw d WHERE d.encrypt_job_id = NEW.encrypt_job_id), '')
  );
END;

CREATE TRIGGER IF NOT EXISTS trg_job_fts_job_au
AFTER UPDATE ON job
BEGIN
  DELETE FROM job_fts WHERE encrypt_job_id = NEW.encrypt_job_id;
  INSERT INTO job_fts(
    encrypt_job_id,
    position_name,
    boss_name,
    brand_name,
    city_name,
    salary_desc,
    experience_name,
    degree_name,
    detail_text
  )
  VALUES(
    NEW.encrypt_job_id,
    COALESCE(NEW.position_name, ''),
    COALESCE(NEW.boss_name, ''),
    COALESCE(NEW.brand_name, ''),
    COALESCE(NEW.city_name, ''),
    COALESCE(NEW.salary_desc, ''),
    COALESCE(NEW.experience_name, ''),
    COALESCE(NEW.degree_name, ''),
    COALESCE((SELECT zp_data_json FROM job_detail_raw d WHERE d.encrypt_job_id = NEW.encrypt_job_id), '')
  );
END;

CREATE TRIGGER IF NOT EXISTS trg_job_fts_job_ad
AFTER DELETE ON job
BEGIN
  DELETE FROM job_fts WHERE encrypt_job_id = OLD.encrypt_job_id;
END;

CREATE TRIGGER IF NOT EXISTS trg_job_fts_job_detail_raw_ai
AFTER INSERT ON job_detail_raw
BEGIN
  DELETE FROM job_fts WHERE encrypt_job_id = NEW.encrypt_job_id;
  INSERT INTO job_fts(
    encrypt_job_id,
    position_name,
    boss_name,
    brand_name,
    city_name,
    salary_desc,
    experience_name,
    degree_name,
    detail_text
  )
  SELECT
    j.encrypt_job_id,
    COALESCE(j.position_name, ''),
    COALESCE(j.boss_name, ''),
    COALESCE(j.brand_name, ''),
    COALESCE(j.city_name, ''),
    COALESCE(j.salary_desc, ''),
    COALESCE(j.experience_name, ''),
    COALESCE(j.degree_name, ''),
    NEW.zp_data_json
  FROM job j
  WHERE j.encrypt_job_id = NEW.encrypt_job_id;
END;

CREATE TRIGGER IF NOT EXISTS trg_job_fts_job_detail_raw_au
AFTER UPDATE ON job_detail_raw
BEGIN
  DELETE FROM job_fts WHERE encrypt_job_id = NEW.encrypt_job_id;
  INSERT INTO job_fts(
    encrypt_job_id,
    position_name,
    boss_name,
    brand_name,
    city_name,
    salary_desc,
    experience_name,
    degree_name,
    detail_text
  )
  SELECT
    j.encrypt_job_id,
    COALESCE(j.position_name, ''),
    COALESCE(j.boss_name, ''),
    COALESCE(j.brand_name, ''),
    COALESCE(j.city_name, ''),
    COALESCE(j.salary_desc, ''),
    COALESCE(j.experience_name, ''),
    COALESCE(j.degree_name, ''),
    NEW.zp_data_json
  FROM job j
  WHERE j.encrypt_job_id = NEW.encrypt_job_id;
END;
"#;

const JOB_FTS_BACKFILL_SQL: &str = r#"
INSERT INTO job_fts(
  encrypt_job_id,
  position_name,
  boss_name,
  brand_name,
  city_name,
  salary_desc,
  experience_name,
  degree_name,
  detail_text
)
SELECT
  j.encrypt_job_id,
  COALESCE(j.position_name, ''),
  COALESCE(j.boss_name, ''),
  COALESCE(j.brand_name, ''),
  COALESCE(j.city_name, ''),
  COALESCE(j.salary_desc, ''),
  COALESCE(j.experience_name, ''),
  COALESCE(j.degree_name, ''),
  COALESCE(d.zp_data_json, '')
FROM job j
LEFT JOIN job_detail_raw d ON d.encrypt_job_id = j.encrypt_job_id;
"#;

fn column_exists(conn: &Connection, table: &str, column: &str) -> Result<bool> {
  let mut stmt = conn.prepare(&format!("PRAGMA table_info({table})"))?;
  let mut rows = stmt.query([])?;
  while let Some(row) = rows.next()? {
    let name: String = row.get(1)?;
    if name == column {
      return Ok(true);
    }
  }
  Ok(false)
}

fn add_column_if_missing(conn: &Connection, table: &str, column: &str, column_type: &str) -> Result<()> {
  if column_exists(conn, table, column)? {
    return Ok(());
  }
  conn.execute(
    &format!("ALTER TABLE {table} ADD COLUMN {column} {column_type}"),
    [],
  )?;
  Ok(())
}

fn table_exists(conn: &Connection, table: &str) -> Result<bool> {
  let exists: bool = conn.query_row(
    "SELECT COUNT(*) > 0 FROM sqlite_master WHERE type='table' AND name=?1",
    [table],
    |row| row.get(0),
  )?;
  Ok(exists)
}

fn ensure_job_fts(conn: &Connection) -> Result<()> {
  let existed = table_exists(conn, JOB_FTS_TABLE)?;

  conn.execute_batch(JOB_FTS_CREATE_SQL)?;
  conn.execute_batch(JOB_FTS_TRIGGERS_SQL)?;

  if existed {
    return Ok(());
  }

  conn.execute_batch(JOB_FTS_BACKFILL_SQL)?;
  Ok(())
}

pub fn migrate(conn: &Connection) -> Result<()> {
  conn.execute_batch(include_str!("schema.sql"))?;

  // Forward-compatible, additive migrations for existing databases.
  add_column_if_missing(conn, "job", "boss_name", "TEXT")?;
  add_column_if_missing(conn, "ai_report", "kind", "TEXT")?;
  add_column_if_missing(conn, "ai_report", "title", "TEXT")?;
  add_column_if_missing(conn, "ai_report", "match_score", "REAL")?;
  add_column_if_missing(conn, "ai_report", "jobs_count", "INTEGER")?;

  // Deduplicate job_source_link rows and add a unique index to prevent future duplicates.
  dedup_job_source_link(conn)?;

  ensure_job_fts(conn)?;

  Ok(())
}

fn dedup_job_source_link(conn: &Connection) -> Result<()> {
  let exists: bool = conn.query_row(
    "SELECT COUNT(*) > 0 FROM sqlite_master WHERE type='index' AND name='idx_job_source_link_dedup'",
    [],
    |row| row.get(0),
  )?;

  if exists {
    return Ok(());
  }

  // Delete duplicate rows with non-NULL keyword, keeping only the latest (MAX id) per pair.
  conn.execute_batch(
    r#"
    DELETE FROM job_source_link
    WHERE keyword IS NOT NULL
      AND id NOT IN (
        SELECT MAX(id) FROM job_source_link
        WHERE keyword IS NOT NULL
        GROUP BY encrypt_job_id, keyword
      )
    "#,
  )?;

  // Create partial unique index for non-NULL keywords.
  conn.execute_batch(
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_job_source_link_dedup ON job_source_link(encrypt_job_id, keyword) WHERE keyword IS NOT NULL",
  )?;

  Ok(())
}
