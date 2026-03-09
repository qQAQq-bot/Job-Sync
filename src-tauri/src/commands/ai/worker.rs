use std::{
  fs,
  io::{BufRead, BufReader, Write},
  path::Path,
  process::{Child, Command, Stdio},
};

use serde_json::Value;
use tauri::AppHandle;

use crate::{
  ipc::protocol::{CommandIn, ErrorPayload, EventOut},
  settings,
};

use super::config::ResolvedOpenAiRequest;

pub(super) fn run_worker_command(
  app: &AppHandle,
  app_data_dir: &Path,
  input: CommandIn,
  config: &ResolvedOpenAiRequest,
  debug: bool,
) -> Result<Value, String> {
  let mut cmd = build_worker_process(app, app_data_dir, config, debug)?;
  let mut child = cmd.spawn().map_err(|e| format!("failed to spawn worker: {e}"))?;
  write_worker_input(&mut child, &input)?;
  read_worker_output(&mut child)
}

fn build_worker_process(
  app: &AppHandle,
  app_data_dir: &Path,
  config: &ResolvedOpenAiRequest,
  debug: bool,
) -> Result<Command, String> {
  let mut cmd = resolve_worker_base_command(app)?;
  configure_worker_process(&mut cmd, app_data_dir, config, debug)?;
  Ok(cmd)
}

fn resolve_worker_base_command(app: &AppHandle) -> Result<Command, String> {
  crate::worker::build_worker_command(app)
}

fn configure_worker_process(
  cmd: &mut Command,
  app_data_dir: &Path,
  config: &ResolvedOpenAiRequest,
  debug: bool,
) -> Result<(), String> {
  cmd.stdin(Stdio::piped()).stdout(Stdio::piped()).stderr(Stdio::inherit());
  settings::apply_worker_env(cmd, app_data_dir);
  cmd.env(
    "JOB_SYNC_AI_API_LOG_FILE",
    app_data_dir.join("api.log").to_string_lossy().to_string(),
  );
  apply_debug_env(cmd, app_data_dir, debug)?;
  apply_openai_overrides(cmd, config);
  Ok(())
}

fn apply_debug_env(cmd: &mut Command, app_data_dir: &Path, debug: bool) -> Result<(), String> {
  if !debug {
    return Ok(());
  }

  let trace_dir = app_data_dir.join("ai-traces");
  fs::create_dir_all(&trace_dir).map_err(|e| format!("failed to create ai trace dir: {e}"))?;
  cmd.env("JOB_SYNC_AI_DEBUG", "1");
  cmd.env("JOB_SYNC_AI_TRACE_DIR", trace_dir.to_string_lossy().to_string());
  Ok(())
}

fn apply_openai_overrides(cmd: &mut Command, config: &ResolvedOpenAiRequest) {
  if let Some(api_key) = config.api_key.as_deref() {
    cmd.env("OPENAI_API_KEY", api_key);
  }
  if let Some(base_url) = config.base_url.as_deref() {
    cmd.env("OPENAI_BASE_URL", base_url);
  }
  if let Some(model) = config.model.as_deref() {
    cmd.env("OPENAI_MODEL", model);
  }
  if let Some(api_mode) = config.api_mode.as_deref() {
    cmd.env("OPENAI_API_MODE", api_mode);
  }
}

fn write_worker_input(child: &mut Child, input: &CommandIn) -> Result<(), String> {
  let stdin = child.stdin.as_mut().ok_or("failed to open worker stdin")?;
  let line = serde_json::to_string(input).map_err(|e| format!("serialize command: {e}"))?;
  stdin
    .write_all(format!("{line}\n").as_bytes())
    .map_err(|e| format!("write command: {e}"))?;
  stdin.flush().ok();
  Ok(())
}

fn read_worker_output(child: &mut Child) -> Result<Value, String> {
  let stdout = child.stdout.take().ok_or("failed to open worker stdout")?;
  let reader = BufReader::new(stdout);

  for line in reader.lines() {
    let line = line.map_err(|e| format!("read worker stdout: {e}"))?;
    if line.trim().is_empty() {
      continue;
    }

    let evt: EventOut = serde_json::from_str(&line).map_err(|e| format!("parse worker event: {e}"))?;
    if let Some(result) = handle_worker_event(child, evt)? {
      return Ok(result);
    }
  }

  terminate_child(child);
  Err("worker finished without AI_RESULT".into())
}

fn handle_worker_event(child: &mut Child, evt: EventOut) -> Result<Option<Value>, String> {
  match evt {
    EventOut::AiResult(payload) => {
      terminate_child(child);
      Ok(Some(payload.result))
    }
    EventOut::Error(err) => {
      terminate_child(child);
      Err(format_worker_error(&err))
    }
    _ => Ok(None),
  }
}

fn terminate_child(child: &mut Child) {
  let _ = child.kill();
  let _ = child.wait();
}

fn format_worker_error(err: &ErrorPayload) -> String {
  match err.stack.as_deref().map(str::trim).filter(|value| !value.is_empty()) {
    Some(stack) => format!("{}\n{}", err.message, stack),
    None => err.message.clone(),
  }
}
