use rusqlite::{params, Connection};

use crate::db::Result;

use super::common::now_rfc3339;

const DELETE_SOURCE_LINK_WITH_KEYWORD_SQL: &str =
  "DELETE FROM job_source_link WHERE encrypt_job_id = ?1 AND keyword = ?2";
const DELETE_SOURCE_LINK_WITHOUT_KEYWORD_SQL: &str =
  "DELETE FROM job_source_link WHERE encrypt_job_id = ?1 AND keyword IS NULL";
const INSERT_SOURCE_LINK_SQL: &str = r#"
  INSERT INTO job_source_link (encrypt_job_id, keyword, filters_json, captured_at)
  VALUES (?1, ?2, ?3, ?4)
"#;

pub(crate) fn insert_job_source_link(
  conn: &Connection,
  encrypt_job_id: &str,
  keyword: Option<&str>,
  filters_json: Option<&str>,
) -> Result<()> {
  delete_existing_job_source_link(conn, encrypt_job_id, keyword)?;
  let captured_at = now_rfc3339();
  conn.execute(
    INSERT_SOURCE_LINK_SQL,
    params![encrypt_job_id, keyword, filters_json, captured_at],
  )?;
  Ok(())
}

fn delete_existing_job_source_link(
  conn: &Connection,
  encrypt_job_id: &str,
  keyword: Option<&str>,
) -> Result<()> {
  match keyword {
    Some(keyword) => {
      conn.execute(
        DELETE_SOURCE_LINK_WITH_KEYWORD_SQL,
        params![encrypt_job_id, keyword],
      )?;
    }
    None => {
      conn.execute(
        DELETE_SOURCE_LINK_WITHOUT_KEYWORD_SQL,
        params![encrypt_job_id],
      )?;
    }
  }
  Ok(())
}
