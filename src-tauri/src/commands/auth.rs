use tauri::State;

use crate::{ipc::protocol::{CommandIn, LoginStartPayload}, settings, sidecar::SidecarManager, storage};

#[tauri::command]
pub fn get_login_status(sidecar: State<SidecarManager>) -> Result<bool, String> {
  let cookies_path = storage::boss_cookies_path(sidecar.app_data_dir());
  Ok(cookies_path.exists())
}

#[tauri::command]
pub fn start_login(sidecar: State<SidecarManager>) -> Result<(), String> {
  let payload = LoginStartPayload {
    executable_path: settings::browser_executable_path(sidecar.app_data_dir()),
    user_data_dir: None,
  };
  sidecar
    .send(&CommandIn::LoginStart(payload))
    .map_err(|e| e.to_string())?;
  Ok(())
}
