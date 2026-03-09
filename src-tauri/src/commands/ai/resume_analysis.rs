use serde_json::Value;
use tauri::AppHandle;

use crate::{
  db,
  ipc::protocol::{AiAnalyzePayload, CommandIn},
  paths, resume_text, settings,
};

use super::{
  config::{opt_trimmed, resolve_openai_request, OpenAiOverrides, ResolvedOpenAiRequest},
  reports::{load_cached_report, upsert_cached_report},
  shared::{load_job_detail_raw, sha256_hex},
  worker::run_worker_command,
};

const RESUME_ANALYSIS_PANIC_PREFIX: &str = "AI 分析任务异常退出：";

struct ResumeAnalysisArgs {
  app: AppHandle,
  encrypt_job_id: String,
  resume_text: String,
  context_text: Option<String>,
  resume_files: Option<String>,
  api_key: Option<String>,
  base_url: Option<String>,
  model: Option<String>,
  api_mode: Option<String>,
  force: bool,
  debug: bool,
}

pub async fn analyze_resume_for_job(
  app: AppHandle,
  encrypt_job_id: String,
  resume_text: String,
  context_text: Option<String>,
  resume_files: Option<String>,
  api_key: Option<String>,
  base_url: Option<String>,
  model: Option<String>,
  api_mode: Option<String>,
  force: Option<bool>,
  debug: Option<bool>,
) -> Result<Value, String> {
  let args = ResumeAnalysisArgs {
    app,
    encrypt_job_id,
    resume_text,
    context_text,
    resume_files,
    api_key,
    base_url,
    model,
    api_mode,
    force: force == Some(true),
    debug: debug == Some(true),
  };

  tauri::async_runtime::spawn_blocking(move || run_resume_analysis(args))
    .await
    .map_err(|e| format!("{RESUME_ANALYSIS_PANIC_PREFIX}{e}"))?
}

fn run_resume_analysis(args: ResumeAnalysisArgs) -> Result<Value, String> {
  let ResumeAnalysisArgs {
    app,
    encrypt_job_id,
    resume_text,
    context_text,
    resume_files,
    api_key,
    base_url,
    model,
    api_mode,
    force,
    debug,
  } = args;

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
  let (context_text, resume_files) = resolve_resume_sources(saved_settings.as_ref(), context_text, resume_files);
  let resolved_resume_text = resume_text::resolve_resume_text(&resume_text, resume_files.as_deref())?;
  let conn = db::init_db(&app_data_dir).map_err(|e| e.to_string())?;
  let job_detail_raw = load_job_detail_raw(&conn, &encrypt_job_id)?;
  let resume_hash = build_resume_hash(&config, &resolved_resume_text, context_text.as_deref(), resume_files.as_deref());
  let job_hash = sha256_hex(&job_detail_raw);

  if !force {
    if let Some(cached) = load_cached_report(&conn, &encrypt_job_id, &resume_hash, &job_hash)? {
      return Ok(cached);
    }
  }

  let job_detail = serde_json::from_str(&job_detail_raw).unwrap_or(Value::Null);
  let command = CommandIn::AiAnalyze(AiAnalyzePayload {
    resume_text: resolved_resume_text,
    context_text,
    resume_files,
    job_detail,
  });
  let result = run_worker_command(&app, &app_data_dir, command, &config, debug)?;
  upsert_cached_report(&conn, &encrypt_job_id, &resume_hash, &job_hash, &result)?;
  Ok(result)
}

fn resolve_resume_sources(
  saved_settings: Option<&settings::AppSettings>,
  context_text: Option<String>,
  resume_files: Option<String>,
) -> (Option<String>, Option<String>) {
  let context_text = opt_trimmed(context_text)
    .or_else(|| saved_settings.and_then(|settings| opt_trimmed(Some(settings.ai_context_text.clone()))));
  let resume_files = opt_trimmed(resume_files)
    .or_else(|| saved_settings.and_then(|settings| opt_trimmed(Some(settings.ai_resume_files.clone()))));
  (context_text, resume_files)
}

fn build_resume_hash(
  config: &ResolvedOpenAiRequest,
  resume_text: &str,
  context_text: Option<&str>,
  resume_files: Option<&str>,
) -> String {
  sha256_hex(&format!(
    "api_mode:{}\nmodel:{}\nbase_url:{}\nresume_text:{}\ncontext_text:{}\nresume_files:{}",
    config.effective_api_mode,
    config.effective_model,
    config.effective_base_url,
    resume_text,
    context_text.unwrap_or(""),
    resume_files.unwrap_or(""),
  ))
}
