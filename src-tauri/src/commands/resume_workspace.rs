use std::{
  fs,
  io::{BufRead, BufReader, Write},
  path::{Path, PathBuf},
  process::{Command, Stdio},
};

use serde_json::Value;

use crate::{
  ipc::protocol::{CommandIn, EventOut, ResumeDiagnosePayload, ResumeRewriteModulePayload},
  paths, resume_pdf_template, resume_text,
  resume_workspace::{self, DiagnoseResumeRequest, ResumeModuleCandidate, ResumeWorkspaceDraft, RewriteResumeModuleRequest},
  resume_workspaces::{self, CreateResumeWorkspaceRequest, ResumeWorkspaceState},
  settings, worker,
};

fn spawn_worker_event(app: &tauri::AppHandle, app_data_dir: &Path, command: &CommandIn) -> Result<Value, String> {
  let mut cmd = worker::build_worker_command(app)?;

  cmd.stdin(Stdio::piped()).stdout(Stdio::piped()).stderr(Stdio::inherit());
  settings::apply_worker_env(&mut cmd, app_data_dir);

  let mut child = cmd.spawn().map_err(|e| format!("failed to spawn worker: {e}"))?;
  let stdin = child.stdin.as_mut().ok_or("failed to open worker stdin")?;
  let line = serde_json::to_string(command).map_err(|e| format!("serialize command: {e}"))?;
  stdin.write_all(format!("{line}\n").as_bytes()).map_err(|e| format!("write command: {e}"))?;
  stdin.flush().ok();

  let stdout = child.stdout.take().ok_or("failed to open worker stdout")?;
  let reader = BufReader::new(stdout);
  for line in reader.lines() {
    let line = line.map_err(|e| format!("read worker stdout: {e}"))?;
    if line.trim().is_empty() {
      continue;
    }
    let event: EventOut = serde_json::from_str(&line).map_err(|e| format!("parse worker event: {e}"))?;
    match event {
      EventOut::AiResult(payload) => {
        let _ = child.kill();
        let _ = child.wait();
        return Ok(payload.result);
      }
      EventOut::Error(payload) => {
        let _ = child.kill();
        let _ = child.wait();
        return Err(payload.stack.unwrap_or(payload.message));
      }
      _ => {}
    }
  }

  let _ = child.kill();
  let _ = child.wait();
  Err("worker finished without AI_RESULT".to_string())
}

fn export_script_path() -> PathBuf {
  PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../scripts/export-resume-pdf.mjs")
}

fn diagnose_resume_workspace_blocking(app: tauri::AppHandle, request: DiagnoseResumeRequest) -> Result<resume_workspace::ResumeDiagnosis, String> {
  let app_data_dir = paths::resolve_data_dir(&app)?;
  let resume_text = resume_text::resolve_resume_text(&request.resume_text, request.resume_files.as_deref())?;
  let raw = spawn_worker_event(
    &app,
    &app_data_dir,
    &CommandIn::ResumeDiagnose(ResumeDiagnosePayload {
      resume_text,
      context_text: request.context_text,
      resume_files: request.resume_files,
    }),
  )?;
  serde_json::from_value(raw).map_err(|e| format!("解析诊断结果失败：{e}"))
}

fn rewrite_resume_workspace_module_blocking(
  app: tauri::AppHandle,
  request: RewriteResumeModuleRequest,
) -> Result<ResumeModuleCandidate, String> {
  let app_data_dir = paths::resolve_data_dir(&app)?;
  let resume_text = resume_text::resolve_resume_text(&request.resume_text, request.resume_files.as_deref())?;
  let raw = spawn_worker_event(
    &app,
    &app_data_dir,
    &CommandIn::ResumeRewriteModule(ResumeRewriteModulePayload {
      module: request.module,
      resume_text,
      context_text: request.context_text,
      resume_files: request.resume_files,
      module_input: request.module_input,
      confirmed_summary: request.confirmed_summary,
      confirmed_projects: request.confirmed_projects,
      confirmed_experience: request.confirmed_experience,
      confirmed_skills: request.confirmed_skills,
    }),
  )?;
  serde_json::from_value(raw).map_err(|e| format!("解析模块候选稿失败：{e}"))
}

fn export_resume_workspace_pdf_blocking(
  app: tauri::AppHandle,
  draft: ResumeWorkspaceDraft,
  title: Option<String>,
) -> Result<String, String> {
  let app_data_dir = paths::resolve_data_dir(&app)?;
  let export_dir = app_data_dir.join("exports");
  fs::create_dir_all(&export_dir).map_err(|e| format!("创建导出目录失败：{e}"))?;

  let body = draft
    .final_resume_text
    .clone()
    .filter(|it| !it.trim().is_empty())
    .unwrap_or_else(|| resume_workspace::assemble_resume_text(&draft));
  if body.trim().is_empty() {
    return Err("没有可导出的最终简历内容。".to_string());
  }

  let file_name = format!("resume-workspace-{}.pdf", time::OffsetDateTime::now_utc().unix_timestamp());
  let output_path = export_dir.join(file_name);
  let script = export_script_path();
  if !script.exists() {
    return Err(format!("PDF 导出脚本不存在：{}", script.display()));
  }

  let html = resume_pdf_template::build_resume_template_html(&draft, title.as_deref().unwrap_or("修改后的简历"));
  let mut cmd = Command::new("node");
  cmd
    .arg(script)
    .arg(&output_path)
    .stdin(Stdio::piped())
    .stdout(Stdio::piped())
    .stderr(Stdio::piped());
  settings::apply_worker_env(&mut cmd, &app_data_dir);

  let mut child = cmd.spawn().map_err(|e| format!("启动 PDF 导出失败：{e}"))?;

  if let Some(stdin) = child.stdin.as_mut() {
    stdin.write_all(html.as_bytes()).map_err(|e| format!("写入 PDF HTML 失败：{e}"))?;
  }

  let output = child.wait_with_output().map_err(|e| format!("等待 PDF 导出失败：{e}"))?;
  if !output.status.success() {
    let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
    let detail = if !stderr.is_empty() { stderr } else { stdout };
    return Err(format!("PDF 导出失败：{detail}"));
  }

  Ok(output_path.to_string_lossy().to_string())
}

#[tauri::command]
pub fn get_resume_workspace_state(app: tauri::AppHandle) -> Result<ResumeWorkspaceState, String> {
  let app_data_dir = paths::resolve_data_dir(&app)?;
  resume_workspaces::get_state(&app_data_dir)
}

#[tauri::command]
pub fn create_resume_workspace(
  app: tauri::AppHandle,
  request: CreateResumeWorkspaceRequest,
) -> Result<ResumeWorkspaceState, String> {
  let app_data_dir = paths::resolve_data_dir(&app)?;
  resume_workspaces::create_workspace(&app_data_dir, request)
}

#[tauri::command]
pub fn switch_resume_workspace(app: tauri::AppHandle, workspace_id: String) -> Result<ResumeWorkspaceState, String> {
  let app_data_dir = paths::resolve_data_dir(&app)?;
  resume_workspaces::switch_workspace(&app_data_dir, &workspace_id)
}

#[tauri::command]
pub fn rename_resume_workspace(
  app: tauri::AppHandle,
  workspace_id: String,
  title: String,
) -> Result<ResumeWorkspaceState, String> {
  let app_data_dir = paths::resolve_data_dir(&app)?;
  resume_workspaces::rename_workspace(&app_data_dir, &workspace_id, &title)
}

#[tauri::command]
pub fn delete_resume_workspace(app: tauri::AppHandle, workspace_id: String) -> Result<ResumeWorkspaceState, String> {
  let app_data_dir = paths::resolve_data_dir(&app)?;
  resume_workspaces::delete_workspace(&app_data_dir, &workspace_id)
}

#[tauri::command]
pub fn save_resume_workspace_draft(
  app: tauri::AppHandle,
  workspace_id: String,
  draft: ResumeWorkspaceDraft,
) -> Result<ResumeWorkspaceState, String> {
  let app_data_dir = paths::resolve_data_dir(&app)?;
  resume_workspaces::save_workspace_draft(&app_data_dir, &workspace_id, draft)
}

#[tauri::command]
pub async fn diagnose_resume_workspace(
  app: tauri::AppHandle,
  request: DiagnoseResumeRequest,
) -> Result<resume_workspace::ResumeDiagnosis, String> {
  tauri::async_runtime::spawn_blocking(move || diagnose_resume_workspace_blocking(app, request))
    .await
    .map_err(|e| format!("简历诊断任务异常退出：{e}"))?
}

#[tauri::command]
pub async fn rewrite_resume_workspace_module(
  app: tauri::AppHandle,
  request: RewriteResumeModuleRequest,
) -> Result<ResumeModuleCandidate, String> {
  tauri::async_runtime::spawn_blocking(move || rewrite_resume_workspace_module_blocking(app, request))
    .await
    .map_err(|e| format!("简历模块改写任务异常退出：{e}"))?
}

#[tauri::command]
pub fn assemble_resume_workspace(draft: ResumeWorkspaceDraft) -> Result<ResumeWorkspaceDraft, String> {
  let mut next = draft;
  let assembled = resume_workspace::assemble_resume_text(&next);
  if assembled.trim().is_empty() {
    return Err("请先确认至少一个模块后再生成最终简历。".to_string());
  }
  next.final_resume_text = Some(assembled);
  Ok(next)
}

#[tauri::command]
pub async fn export_resume_workspace_pdf(
  app: tauri::AppHandle,
  draft: ResumeWorkspaceDraft,
  title: Option<String>,
) -> Result<String, String> {
  tauri::async_runtime::spawn_blocking(move || export_resume_workspace_pdf_blocking(app, draft, title))
    .await
    .map_err(|e| format!("简历 PDF 导出任务异常退出：{e}"))?
}
