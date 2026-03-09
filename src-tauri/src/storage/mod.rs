use std::{
  fs,
  path::{Path, PathBuf},
};

use serde_json::Value;

#[derive(thiserror::Error, Debug)]
pub enum StorageError {
  #[error("io error: {0}")]
  Io(#[from] std::io::Error),
  #[error("json error: {0}")]
  Json(#[from] serde_json::Error),
}

pub type Result<T> = std::result::Result<T, StorageError>;

pub fn write_json(path: &Path, value: &Value) -> Result<()> {
  if let Some(parent) = path.parent() {
    fs::create_dir_all(parent)?;
  }
  let bytes = serde_json::to_vec_pretty(value)?;
  fs::write(path, bytes)?;
  Ok(())
}

pub fn read_json(path: &Path) -> Result<Option<Value>> {
  if !path.exists() {
    return Ok(None);
  }
  let bytes = fs::read(path)?;
  Ok(Some(serde_json::from_slice(&bytes)?))
}

pub fn storage_dir(app_data_dir: &Path) -> PathBuf {
  app_data_dir.to_path_buf()
}

pub fn boss_cookies_path(app_data_dir: &Path) -> PathBuf {
  storage_dir(app_data_dir).join("boss-cookies.json")
}

pub fn boss_local_storage_path(app_data_dir: &Path) -> PathBuf {
  storage_dir(app_data_dir).join("boss-local-storage.json")
}

pub fn boss_meta_path(app_data_dir: &Path) -> PathBuf {
  storage_dir(app_data_dir).join("boss-meta.json")
}
