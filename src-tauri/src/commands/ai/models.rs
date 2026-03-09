use serde_json::Value;
use tauri::AppHandle;

use crate::{paths, settings};

use super::config::{opt_trimmed, DEFAULT_OPENAI_BASE_URL};

#[derive(serde::Serialize)]
pub struct ModelInfo {
  pub id: String,
  pub owned_by: String,
}

struct ModelListRequest {
  api_key: Option<String>,
  base_url: Option<String>,
}

struct ModelListConfig {
  api_key: String,
  endpoint: String,
}

pub fn list_models(
  app: AppHandle,
  api_key: Option<String>,
  base_url: Option<String>,
) -> Result<Vec<ModelInfo>, String> {
  let config = resolve_model_list_config(&app, ModelListRequest { api_key, base_url })?;
  fetch_models(&config)
}

fn resolve_model_list_config(
  app: &AppHandle,
  request: ModelListRequest,
) -> Result<ModelListConfig, String> {
  let app_data_dir = paths::resolve_data_dir(app).ok();
  let saved_settings = app_data_dir.as_deref().and_then(|dir| settings::read_settings(dir).ok());

  let api_key = opt_trimmed(request.api_key)
    .or_else(|| saved_settings.as_ref().and_then(|settings| opt_trimmed(settings.openai_api_key.clone())))
    .or_else(|| opt_trimmed(std::env::var("OPENAI_API_KEY").ok()))
    .ok_or_else(|| "请填写 API Key 或设置 OPENAI_API_KEY 环境变量。".to_string())?;

  let base_url = opt_trimmed(request.base_url)
    .or_else(|| saved_settings.as_ref().and_then(|settings| opt_trimmed(settings.openai_base_url.clone())))
    .or_else(|| opt_trimmed(std::env::var("OPENAI_BASE_URL").ok()))
    .unwrap_or_else(|| DEFAULT_OPENAI_BASE_URL.to_string());

  Ok(ModelListConfig {
    api_key,
    endpoint: build_models_endpoint(&base_url),
  })
}

fn build_models_endpoint(base_url: &str) -> String {
  let base = base_url.trim_end_matches('/').trim_end_matches("/v1");
  format!("{base}/v1/models")
}

fn fetch_models(config: &ModelListConfig) -> Result<Vec<ModelInfo>, String> {
  let response = ureq::get(&config.endpoint)
    .set("Authorization", &format!("Bearer {}", config.api_key))
    .call()
    .map_err(|e| format!("请求模型列表失败：{e}"))?;

  let body: Value = response
    .into_json()
    .map_err(|e| format!("解析模型列表失败：{e}"))?;

  parse_models(body)
}

fn parse_models(body: Value) -> Result<Vec<ModelInfo>, String> {
  let data = body
    .get("data")
    .and_then(|value| value.as_array())
    .ok_or_else(|| "模型列表响应格式异常。".to_string())?;

  let mut models: Vec<ModelInfo> = data
    .iter()
    .filter_map(|item| {
      let id = item.get("id")?.as_str()?.to_string();
      let owned_by = item
        .get("owned_by")
        .and_then(|value| value.as_str())
        .unwrap_or("")
        .to_string();
      Some(ModelInfo { id, owned_by })
    })
    .collect();

  models.sort_by(|left, right| left.id.cmp(&right.id));
  Ok(models)
}
