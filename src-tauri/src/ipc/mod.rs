pub mod protocol;

use tauri::{AppHandle, Emitter};

use protocol::EventOut;

pub const SIDECAR_EVENT_NAME: &str = "sidecar://event";

pub fn emit_event_all(app: &AppHandle, event: &EventOut) -> Result<(), tauri::Error> {
  app.emit(SIDECAR_EVENT_NAME, event)?;
  Ok(())
}
