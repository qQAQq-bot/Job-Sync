use rusqlite::OptionalExtension;
use serde_json::Value;
use tauri::AppHandle;

use crate::{
  db,
  ipc::protocol::{AiAnalyzeGroupPayload, CommandIn},
  paths, settings,
};

use super::{
  config::{opt_trimmed, resolve_openai_request, OpenAiOverrides, ResolvedOpenAiRequest},
  reports::{load_cached_report, upsert_cached_report},
  shared::{build_group_encrypt_job_id, build_job_outline, describe_job_brief, sha256_hex, sha256_hex_job_details},
  worker::run_worker_command,
};

const GROUP_ANALYSIS_PANIC_PREFIX: &str = "AI 综合分析任务异常退出：";
const GROUP_ANALYSIS_MAX_JOBS: usize = 20;
const SELECT_JOB_ERROR: &str = "请至少选择一个职位。";
const CONTEXT_REQUIRED_ERROR: &str = "请填写当前情况说明。";
const MISSING_DETAIL_HEADER: &str = "以下职位缺少详情数据，请先采集详情（在职位库展开该职位，或运行自动采集）后再分析：";

struct ProfileAnalysisArgs {
  app: AppHandle,
  job_ids: Vec<String>,
  context_text: Option<String>,
  api_key: Option<String>,
  base_url: Option<String>,
  model: Option<String>,
  api_mode: Option<String>,
  force: bool,
  debug: bool,
}

pub async fn analyze_profile_for_jobs(
  app: AppHandle,
  job_ids: Vec<String>,
  context_text: Option<String>,
  api_key: Option<String>,
  base_url: Option<String>,
  model: Option<String>,
  api_mode: Option<String>,
  force: Option<bool>,
  debug: Option<bool>,
) -> Result<Value, String> {
  let args = ProfileAnalysisArgs {
    app,
    job_ids,
    context_text,
    api_key,
    base_url,
    model,
    api_mode,
    force: force == Some(true),
    debug: debug == Some(true),
  };

  tauri::async_runtime::spawn_blocking(move || run_profile_analysis(args))
    .await
    .map_err(|e| format!("{GROUP_ANALYSIS_PANIC_PREFIX}{e}"))?
}

fn run_profile_analysis(args: ProfileAnalysisArgs) -> Result<Value, String> {
  let ProfileAnalysisArgs {
    app,
    job_ids,
    context_text,
    api_key,
    base_url,
    model,
    api_mode,
    force,
    debug,
  } = args;

  let job_ids = normalize_job_ids(job_ids)?;
  let app_data_dir = paths::resolve_data_dir(&app)?;
  let saved_settings = settings::read_settings(&app_data_dir).ok();
  let config = resolve_openai_request(
    saved_settings.as_ref(),
    OpenAiOverrides {
      api_key,
      base_url,
      model,
      api_mode,
    },
  );
  let context_text = resolve_context_text(saved_settings.as_ref(), context_text)?;
  let group_encrypt_job_id = build_group_encrypt_job_id(&job_ids);
  let conn = db::init_db(&app_data_dir).map_err(|e| e.to_string())?;
  let details = load_job_details(&conn, &job_ids)?;
  let profile_hash = build_profile_hash(&config, &context_text);
  let job_hash = sha256_hex_job_details(&details);

  if !force {
    if let Some(cached) = load_cached_report(&conn, &group_encrypt_job_id, &profile_hash, &job_hash)? {
      return Ok(cached);
    }
  }

  let command = CommandIn::AiAnalyzeGroup(AiAnalyzeGroupPayload {
    context_text,
    jobs: build_job_outlines(&details),
  });
  let result = run_worker_command(&app, &app_data_dir, command, &config, debug)?;
  upsert_cached_report(&conn, &group_encrypt_job_id, &profile_hash, &job_hash, &result)?;
  Ok(result)
}

fn normalize_job_ids(job_ids: Vec<String>) -> Result<Vec<String>, String> {
  let mut normalized: Vec<String> = job_ids
    .into_iter()
    .map(|value| value.trim().to_string())
    .filter(|value| !value.is_empty())
    .collect();
  normalized.sort();
  normalized.dedup();

  if normalized.is_empty() {
    return Err(SELECT_JOB_ERROR.to_string());
  }
  if normalized.len() > GROUP_ANALYSIS_MAX_JOBS {
    return Err("综合分析最多支持 20 个职位，请减少选择数量。".to_string());
  }

  Ok(normalized)
}

fn resolve_context_text(
  saved_settings: Option<&settings::AppSettings>,
  context_text: Option<String>,
) -> Result<String, String> {
  let resolved = opt_trimmed(context_text)
    .or_else(|| saved_settings.and_then(|settings| opt_trimmed(Some(settings.ai_context_text.clone()))))
    .unwrap_or_default();

  if resolved.trim().is_empty() {
    return Err(CONTEXT_REQUIRED_ERROR.to_string());
  }

  Ok(resolved)
}

fn load_job_details(
  conn: &rusqlite::Connection,
  job_ids: &[String],
) -> Result<Vec<(String, String)>, String> {
  let mut details = Vec::with_capacity(job_ids.len());
  let mut missing = Vec::new();

  for job_id in job_ids {
    let raw: Option<String> = conn
      .query_row(
        "SELECT zp_data_json FROM job_detail_raw WHERE encrypt_job_id = ?1",
        [job_id],
        |row| row.get(0),
      )
      .optional()
      .map_err(|e| e.to_string())?;

    match raw {
      Some(raw) => details.push((job_id.clone(), raw)),
      None => missing.push(job_id.clone()),
    }
  }

  if missing.is_empty() {
    return Ok(details);
  }

  Err(missing_job_details_error(conn, &missing))
}

fn missing_job_details_error(conn: &rusqlite::Connection, missing: &[String]) -> String {
  let mut lines = vec![MISSING_DETAIL_HEADER.to_string()];
  for job_id in missing {
    let label = describe_job_brief(conn, job_id).unwrap_or_else(|| job_id.clone());
    lines.push(format!("- {label}"));
  }
  lines.join("\n")
}

fn build_profile_hash(config: &ResolvedOpenAiRequest, context_text: &str) -> String {
  sha256_hex(&format!(
    "api_mode:{}\nmodel:{}\nbase_url:{}\ncontext_text:{}",
    config.effective_api_mode,
    config.effective_model,
    config.effective_base_url,
    context_text,
  ))
}

fn build_job_outlines(details: &[(String, String)]) -> Vec<Value> {
  details
    .iter()
    .map(|(job_id, raw)| {
      let zp_data = serde_json::from_str(raw).unwrap_or(Value::Null);
      build_job_outline(job_id, &zp_data)
    })
    .collect()
}
