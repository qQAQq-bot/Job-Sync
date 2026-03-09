use tauri::State;

use crate::{
  ipc::protocol::{
    BossMetaSyncPayload, CommandIn, CrawlAutoStartPayload, CrawlManualStartPayload, SearchTaskPayload,
    SessionStatePayload,
  },
  sidecar::SidecarManager,
  storage,
};

fn load_session(app_data_dir: &std::path::Path) -> Result<SessionStatePayload, String> {
  let cookies_path = storage::boss_cookies_path(app_data_dir);
  let local_storage_path = storage::boss_local_storage_path(app_data_dir);

  let cookies = storage::read_json(&cookies_path)
    .map_err(|e| e.to_string())?
    .ok_or("cookies not found, please login first")?;
  let local_storage = storage::read_json(&local_storage_path)
    .map_err(|e| e.to_string())?
    .ok_or("localStorage not found, please login first")?;

  Ok(SessionStatePayload { cookies, local_storage })
}

fn load_session_optional(app_data_dir: &std::path::Path) -> SessionStatePayload {
  let cookies_path = storage::boss_cookies_path(app_data_dir);
  let local_storage_path = storage::boss_local_storage_path(app_data_dir);

  let cookies = storage::read_json(&cookies_path).ok().flatten().unwrap_or_else(|| {
    serde_json::Value::Array(vec![])
  });
  let local_storage = storage::read_json(&local_storage_path).ok().flatten().unwrap_or_else(|| {
    serde_json::Value::Object(serde_json::Map::new())
  });

  SessionStatePayload { cookies, local_storage }
}

#[tauri::command]
pub fn crawl_manual_start(sidecar: State<SidecarManager>) -> Result<(), String> {
  let session = load_session(sidecar.app_data_dir())?;
  sidecar
    .send(&CommandIn::CrawlManualStart(CrawlManualStartPayload { session }))
    .map_err(|e| e.to_string())?;
  Ok(())
}

#[tauri::command]
pub fn crawl_auto_start(sidecar: State<SidecarManager>, task: SearchTaskPayload) -> Result<(), String> {
  let session = load_session(sidecar.app_data_dir())?;
  sidecar
    .send(&CommandIn::CrawlAutoStart(CrawlAutoStartPayload { session, task }))
    .map_err(|e| e.to_string())?;
  Ok(())
}

#[tauri::command]
pub fn crawl_stop(sidecar: State<SidecarManager>) -> Result<(), String> {
  sidecar.send(&CommandIn::Stop).map_err(|e| e.to_string())?;
  Ok(())
}

#[tauri::command]
pub fn get_boss_meta(sidecar: State<SidecarManager>) -> Result<Option<serde_json::Value>, String> {
  let meta_path = storage::boss_meta_path(sidecar.app_data_dir());
  storage::read_json(&meta_path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn sync_boss_meta(sidecar: State<SidecarManager>) -> Result<(), String> {
  let session = load_session_optional(sidecar.app_data_dir());
  sidecar
    .send(&CommandIn::BossMetaSync(BossMetaSyncPayload { session }))
    .map_err(|e| e.to_string())?;
  Ok(())
}
