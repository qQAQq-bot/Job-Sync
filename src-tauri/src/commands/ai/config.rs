use crate::settings::AppSettings;

pub(super) const DEFAULT_OPENAI_API_MODE: &str = "chat_completions";
pub(super) const DEFAULT_OPENAI_BASE_URL: &str = "https://api.openai.com/v1";
pub(super) const DEFAULT_OPENAI_MODEL: &str = "gpt-4o-mini";

#[derive(Debug, Clone, Default)]
pub(super) struct OpenAiOverrides {
  pub api_key: Option<String>,
  pub base_url: Option<String>,
  pub model: Option<String>,
  pub api_mode: Option<String>,
}

#[derive(Debug, Clone)]
pub(super) struct ResolvedOpenAiRequest {
  pub api_key: Option<String>,
  pub base_url: Option<String>,
  pub model: Option<String>,
  pub api_mode: Option<String>,
  pub effective_base_url: String,
  pub effective_model: String,
  pub effective_api_mode: String,
}

pub(super) fn opt_trimmed(value: Option<String>) -> Option<String> {
  value.and_then(|raw| {
    let trimmed = raw.trim().to_string();
    if trimmed.is_empty() {
      None
    } else {
      Some(trimmed)
    }
  })
}

pub(super) fn resolve_openai_request(
  saved_settings: Option<&AppSettings>,
  overrides: OpenAiOverrides,
) -> ResolvedOpenAiRequest {
  let api_key = opt_trimmed(overrides.api_key);
  let base_url = opt_trimmed(overrides.base_url);
  let model = opt_trimmed(overrides.model);
  let api_mode = opt_trimmed(overrides.api_mode);

  let effective_api_mode = api_mode
    .clone()
    .or_else(|| saved_settings.and_then(|settings| settings.openai_api_mode.clone()))
    .or_else(|| std::env::var("OPENAI_API_MODE").ok())
    .unwrap_or_else(|| DEFAULT_OPENAI_API_MODE.to_string());

  let effective_model = model
    .clone()
    .or_else(|| saved_settings.and_then(|settings| settings.openai_model.clone()))
    .or_else(|| std::env::var("OPENAI_MODEL").ok())
    .unwrap_or_else(|| DEFAULT_OPENAI_MODEL.to_string());

  let effective_base_url = base_url
    .clone()
    .or_else(|| saved_settings.and_then(|settings| settings.openai_base_url.clone()))
    .or_else(|| std::env::var("OPENAI_BASE_URL").ok())
    .unwrap_or_else(|| DEFAULT_OPENAI_BASE_URL.to_string());

  ResolvedOpenAiRequest {
    api_key,
    base_url,
    model,
    api_mode,
    effective_api_mode,
    effective_model,
    effective_base_url,
  }
}
