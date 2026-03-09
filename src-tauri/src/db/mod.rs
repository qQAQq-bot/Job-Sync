pub mod migrate;
pub mod models;

use std::{
  fs,
  path::{Path, PathBuf},
};

use rusqlite::Connection;

#[derive(thiserror::Error, Debug)]
pub enum DbError {
  #[error("io error: {0}")]
  Io(#[from] std::io::Error),
  #[error("sqlite error: {0}")]
  Sqlite(#[from] rusqlite::Error),
}

pub type Result<T> = std::result::Result<T, DbError>;

pub fn db_path(app_data_dir: &Path) -> PathBuf {
  app_data_dir.join("app.db")
}

pub fn init_db(app_data_dir: &Path) -> Result<Connection> {
  fs::create_dir_all(app_data_dir)?;

  let path = db_path(app_data_dir);
  let conn = Connection::open(path)?;
  conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;")?;
  migrate::migrate(&conn)?;
  Ok(conn)
}

#[cfg(test)]
mod tests;
