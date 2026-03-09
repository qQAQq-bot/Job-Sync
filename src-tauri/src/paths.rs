use std::{
  env,
  fs,
  path::{Path, PathBuf},
};

use tauri::Manager;

fn looks_like_project_root(dir: &Path) -> bool {
  dir.join("package.json").is_file() && dir.join("src-tauri").is_dir()
}

fn find_project_root(start: &Path) -> Option<PathBuf> {
  let mut cursor = start;
  for _ in 0..12 {
    if looks_like_project_root(cursor) {
      return Some(cursor.to_path_buf());
    }
    cursor = cursor.parent()?;
  }
  None
}

pub fn resolve_data_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
  if let Ok(p) = env::var("JOB_SYNC_DATA_DIR") {
    let candidate = PathBuf::from(p);
    fs::create_dir_all(&candidate).map_err(|e| format!("failed to create JOB_SYNC_DATA_DIR: {e}"))?;
    return Ok(candidate);
  }

  if let Ok(cwd) = env::current_dir() {
    if let Some(root) = find_project_root(&cwd) {
      let data_dir = root.join("data");
      fs::create_dir_all(&data_dir).map_err(|e| format!("failed to create data dir: {e}"))?;
      return Ok(data_dir);
    }
  }

  let fallback = app
    .path()
    .app_data_dir()
    .map_err(|e| format!("failed to resolve app_data_dir: {e}"))?;
  fs::create_dir_all(&fallback).map_err(|e| format!("failed to create app_data_dir: {e}"))?;
  Ok(fallback)
}

