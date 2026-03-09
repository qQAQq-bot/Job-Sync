use rusqlite::Connection;

use crate::db;

pub(super) fn open_conn(app_data_dir: &std::path::Path) -> Result<Connection, String> {
  db::init_db(app_data_dir).map_err(|e| e.to_string())
}

fn count_chars(input: &str) -> usize {
  input.chars().count()
}

pub(super) fn should_use_fts(keyword: &str) -> bool {
  count_chars(keyword.trim()) >= 3
}

pub(super) fn build_fts_phrase_query(keyword: &str) -> String {
  let trimmed = keyword.trim();
  let escaped = trimmed.replace('"', "\"\"");
  format!("\"{escaped}\"")
}
