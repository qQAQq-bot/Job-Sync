use crate::{paths, settings};

#[tauri::command]
pub fn get_settings(app: tauri::AppHandle) -> Result<settings::AppSettings, String> {
  let app_data_dir = paths::resolve_data_dir(&app)?;

  settings::read_settings(&app_data_dir).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn set_browser_executable_path(app: tauri::AppHandle, path: Option<String>) -> Result<settings::AppSettings, String> {
  let app_data_dir = paths::resolve_data_dir(&app)?;

  let mut current = settings::read_settings(&app_data_dir).unwrap_or_else(|_| settings::AppSettings::platform_default());
  current.browser_executable_path = path.and_then(|p| {
    let trimmed = p.trim().to_string();
    if trimmed.is_empty() { None } else { Some(trimmed) }
  });

  settings::write_settings(&app_data_dir, &current).map_err(|e| e.to_string())?;
  Ok(current)
}

#[tauri::command]
pub fn set_ai_settings(
  app: tauri::AppHandle,
  resume_text: String,
  context_text: Option<String>,
  resume_files: Option<String>,
) -> Result<settings::AppSettings, String> {
  let app_data_dir = paths::resolve_data_dir(&app)?;

  let mut current = settings::read_settings(&app_data_dir).unwrap_or_else(|_| settings::AppSettings::platform_default());

  current.ai_resume_text = resume_text;
  current.ai_context_text = context_text.unwrap_or_default();
  current.ai_resume_files = resume_files.unwrap_or_default();
  current.ai_profile_updated_at = Some(time::OffsetDateTime::now_utc().format(&time::format_description::well_known::Rfc3339).unwrap());

  settings::write_settings(&app_data_dir, &current).map_err(|e| e.to_string())?;
  Ok(current)
}

fn opt_trimmed(value: Option<String>) -> Option<String> {
  value.and_then(|v| {
    let trimmed = v.trim().to_string();
    if trimmed.is_empty() { None } else { Some(trimmed) }
  })
}

#[tauri::command]
pub fn save_settings(
  app: tauri::AppHandle,
  browser_executable_path: Option<String>,
  openai_api_key: Option<String>,
  openai_base_url: Option<String>,
  openai_model: Option<String>,
  openai_api_mode: Option<String>,
) -> Result<settings::AppSettings, String> {
  let app_data_dir = paths::resolve_data_dir(&app)?;

  let mut current = settings::read_settings(&app_data_dir).unwrap_or_else(|_| settings::AppSettings::platform_default());

  current.browser_executable_path = opt_trimmed(browser_executable_path);
  current.openai_api_key = opt_trimmed(openai_api_key);
  current.openai_base_url = opt_trimmed(openai_base_url);
  current.openai_model = opt_trimmed(openai_model);
  current.openai_api_mode = opt_trimmed(openai_api_mode);

  settings::write_settings(&app_data_dir, &current).map_err(|e| e.to_string())?;
  Ok(current)
}
