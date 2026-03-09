use std::path::{Path, PathBuf};
use std::process::Command;

use serde::{Deserialize, Serialize};

use crate::storage;

pub const DEFAULT_CHROME_PATH_WINDOWS: &str = r"C:\Program Files\Google\Chrome\Application\chrome.exe";
const LEGACY_AI_PROFILE_FILENAME: &str = "ai-profile.json";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppSettings {
  #[serde(default)]
  #[serde(skip_serializing_if = "Option::is_none")]
  pub browser_executable_path: Option<String>,

  #[serde(default)]
  #[serde(skip_serializing_if = "Option::is_none")]
  pub openai_api_key: Option<String>,
  #[serde(default)]
  #[serde(skip_serializing_if = "Option::is_none")]
  pub openai_base_url: Option<String>,
  #[serde(default)]
  #[serde(skip_serializing_if = "Option::is_none")]
  pub openai_model: Option<String>,
  #[serde(default)]
  #[serde(skip_serializing_if = "Option::is_none")]
  pub openai_api_mode: Option<String>,

  #[serde(default)]
  #[serde(skip_serializing_if = "String::is_empty")]
  pub ai_resume_text: String,
  #[serde(default)]
  #[serde(skip_serializing_if = "String::is_empty")]
  pub ai_context_text: String,
  #[serde(default)]
  #[serde(skip_serializing_if = "String::is_empty")]
  pub ai_resume_files: String,
  #[serde(default)]
  #[serde(skip_serializing_if = "Option::is_none")]
  pub ai_profile_updated_at: Option<String>,
}

impl AppSettings {
  pub fn platform_default() -> Self {
    if cfg!(target_os = "windows") {
      return Self {
        browser_executable_path: Some(DEFAULT_CHROME_PATH_WINDOWS.to_string()),
        openai_api_key: None,
        openai_base_url: None,
        openai_model: None,
        openai_api_mode: None,
        ai_resume_text: String::new(),
        ai_context_text: String::new(),
        ai_resume_files: String::new(),
        ai_profile_updated_at: None,
      };
    }
    Self {
      browser_executable_path: None,
      openai_api_key: None,
      openai_base_url: None,
      openai_model: None,
      openai_api_mode: None,
      ai_resume_text: String::new(),
      ai_context_text: String::new(),
      ai_resume_files: String::new(),
      ai_profile_updated_at: None,
    }
  }
}

pub fn settings_path(app_data_dir: &Path) -> PathBuf {
  storage::storage_dir(app_data_dir).join("settings.json")
}

fn legacy_ai_profile_path(app_data_dir: &Path) -> PathBuf {
  storage::storage_dir(app_data_dir).join(LEGACY_AI_PROFILE_FILENAME)
}

fn json_get_string(value: &serde_json::Value, key: &str) -> Option<String> {
  value.get(key).and_then(|v| v.as_str()).map(|s| s.to_string())
}

fn migrate_legacy_ai_profile(app_data_dir: &Path, settings: &mut AppSettings) -> bool {
  let legacy = match storage::read_json(&legacy_ai_profile_path(app_data_dir)).ok().flatten() {
    None => return false,
    Some(v) => v,
  };

  let mut changed = false;

  if settings.openai_api_key.is_none() {
    if let Some(v) = opt_trimmed(
      json_get_string(&legacy, "openai_api_key").or_else(|| json_get_string(&legacy, "api_key")),
    ) {
      settings.openai_api_key = Some(v);
      changed = true;
    }
  }

  if settings.openai_base_url.is_none() {
    if let Some(v) = opt_trimmed(
      json_get_string(&legacy, "openai_base_url").or_else(|| json_get_string(&legacy, "base_url")),
    ) {
      settings.openai_base_url = Some(v);
      changed = true;
    }
  }

  if settings.openai_model.is_none() {
    if let Some(v) = opt_trimmed(
      json_get_string(&legacy, "openai_model").or_else(|| json_get_string(&legacy, "model")),
    ) {
      settings.openai_model = Some(v);
      changed = true;
    }
  }

  if settings.openai_api_mode.is_none() {
    if let Some(v) = opt_trimmed(
      json_get_string(&legacy, "openai_api_mode")
        .or_else(|| json_get_string(&legacy, "api_mode"))
        .or_else(|| json_get_string(&legacy, "apiMode")),
    ) {
      settings.openai_api_mode = Some(v);
      changed = true;
    }
  }

  if settings.ai_resume_text.trim().is_empty() {
    if let Some(v) =
      json_get_string(&legacy, "ai_resume_text").or_else(|| json_get_string(&legacy, "resume_text"))
    {
      if !v.trim().is_empty() {
        settings.ai_resume_text = v;
        changed = true;
      }
    }
  }

  if settings.ai_context_text.trim().is_empty() {
    if let Some(v) =
      json_get_string(&legacy, "ai_context_text").or_else(|| json_get_string(&legacy, "context_text"))
    {
      if !v.trim().is_empty() {
        settings.ai_context_text = v;
        changed = true;
      }
    }
  }

  if settings.ai_resume_files.trim().is_empty() {
    if let Some(v) =
      json_get_string(&legacy, "ai_resume_files").or_else(|| json_get_string(&legacy, "resume_files"))
    {
      if !v.trim().is_empty() {
        settings.ai_resume_files = v;
        changed = true;
      }
    }
  }

  if settings.ai_profile_updated_at.is_none() {
    if let Some(v) = opt_trimmed(
      json_get_string(&legacy, "ai_profile_updated_at").or_else(|| json_get_string(&legacy, "updated_at")),
    ) {
      settings.ai_profile_updated_at = Some(v);
      changed = true;
    }
  }

  changed
}

pub fn read_settings(app_data_dir: &Path) -> storage::Result<AppSettings> {
  let path = settings_path(app_data_dir);
  let raw = storage::read_json(&path)?;
  let mut settings = match raw {
    Some(value) => serde_json::from_value(value)?,
    None => AppSettings::platform_default(),
  };

  if migrate_legacy_ai_profile(app_data_dir, &mut settings) {
    write_settings(app_data_dir, &settings)?;
  }

  Ok(settings)
}

pub fn write_settings(app_data_dir: &Path, settings: &AppSettings) -> storage::Result<()> {
  let value = serde_json::to_value(settings)?;
  storage::write_json(&settings_path(app_data_dir), &value)
}

pub fn browser_executable_path(app_data_dir: &Path) -> Option<String> {
  let settings = read_settings(app_data_dir).ok()?;
  settings
    .browser_executable_path
    .and_then(|p| {
      let trimmed = p.trim().to_string();
      if trimmed.is_empty() { None } else { Some(trimmed) }
    })
}

fn opt_trimmed(value: Option<String>) -> Option<String> {
  value.and_then(|v| {
    let trimmed = v.trim().to_string();
    if trimmed.is_empty() { None } else { Some(trimmed) }
  })
}

pub fn apply_worker_env(cmd: &mut Command, app_data_dir: &Path) {
  if let Some(p) = browser_executable_path(app_data_dir) {
    cmd.env("PUPPETEER_EXECUTABLE_PATH", p);
  }

  if let Ok(settings) = read_settings(app_data_dir) {
    if let Some(v) = opt_trimmed(settings.openai_api_key) {
      cmd.env("OPENAI_API_KEY", v);
    }
    if let Some(v) = opt_trimmed(settings.openai_base_url) {
      cmd.env("OPENAI_BASE_URL", v);
    }
    if let Some(v) = opt_trimmed(settings.openai_model) {
      cmd.env("OPENAI_MODEL", v);
    }
    if let Some(v) = opt_trimmed(settings.openai_api_mode) {
      cmd.env("OPENAI_API_MODE", v);
    }
  }
}
