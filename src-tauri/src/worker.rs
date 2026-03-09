use std::{
  path::{Path, PathBuf},
  process::Command,
};

use tauri::Manager;

#[derive(Debug, Clone)]
pub struct BundledNodeRuntime {
  pub executable: PathBuf,
  pub entry: PathBuf,
  pub working_dir: PathBuf,
}

impl BundledNodeRuntime {
  fn package_json(&self) -> PathBuf {
    self.working_dir.join("package.json")
  }

  fn is_ready(&self) -> bool {
    self.executable.is_file() && self.entry.is_file() && self.package_json().is_file()
  }
}

#[derive(Debug, Clone)]
pub enum WorkerProgram {
  BundledNode(BundledNodeRuntime),
  DevNodeScript { entry: PathBuf, working_dir: PathBuf },
}

fn dev_worker_dir() -> PathBuf {
  PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../packages/boss-crawler-worker")
}

fn dev_node_entry() -> PathBuf {
  dev_worker_dir().join("dist/main.js")
}

fn push_bundled_node_candidates(out: &mut Vec<BundledNodeRuntime>, base_dir: PathBuf) {
  let working_dir = base_dir.join("boss-crawler-worker");
  out.push(BundledNodeRuntime {
    executable: base_dir.join("node.exe"),
    entry: working_dir.join("dist/main.js"),
    working_dir,
  });

  let bin_dir = base_dir.join("bin");
  let working_dir = bin_dir.join("boss-crawler-worker");
  out.push(BundledNodeRuntime {
    executable: bin_dir.join("node.exe"),
    entry: working_dir.join("dist/main.js"),
    working_dir,
  });
}

fn candidate_bundled_node_runtimes(app: &tauri::AppHandle) -> Vec<BundledNodeRuntime> {
  let mut out = Vec::new();

  if let Ok(resource_dir) = app.path().resource_dir() {
    push_bundled_node_candidates(&mut out, resource_dir);
  }

  if let Ok(current_exe) = std::env::current_exe() {
    if let Some(exe_dir) = current_exe.parent() {
      push_bundled_node_candidates(&mut out, exe_dir.to_path_buf());
    }
  }

  push_bundled_node_candidates(&mut out, PathBuf::from(env!("CARGO_MANIFEST_DIR")));

  out
}

pub fn resolve_worker_program(app: &tauri::AppHandle) -> WorkerProgram {
  for runtime in candidate_bundled_node_runtimes(app) {
    if runtime.is_ready() {
      return WorkerProgram::BundledNode(runtime);
    }
  }

  WorkerProgram::DevNodeScript {
    entry: dev_node_entry(),
    working_dir: dev_worker_dir(),
  }
}

fn ensure_file_exists(path: &Path, label: &str) -> Result<(), String> {
  if path.is_file() {
    return Ok(());
  }
  Err(format!("{label} not found: {}", path.display()))
}

fn ensure_dir_exists(path: &Path, label: &str) -> Result<(), String> {
  if path.is_dir() {
    return Ok(());
  }
  Err(format!("{label} not found: {}", path.display()))
}

fn build_node_command<S>(executable: S, entry: &Path, working_dir: &Path) -> Result<Command, String>
where
  S: AsRef<std::ffi::OsStr>,
{
  ensure_file_exists(entry, "worker entry")?;
  ensure_dir_exists(working_dir, "worker working directory")?;
  ensure_file_exists(&working_dir.join("package.json"), "worker package.json")?;

  let mut cmd = Command::new(executable);
  cmd.arg(entry);
  cmd.current_dir(working_dir);
  Ok(cmd)
}

pub fn build_worker_command(app: &tauri::AppHandle) -> Result<Command, String> {
  match resolve_worker_program(app) {
    WorkerProgram::BundledNode(runtime) => {
      ensure_file_exists(&runtime.executable, "bundled node executable")?;
      build_node_command(&runtime.executable, &runtime.entry, &runtime.working_dir)
    }
    WorkerProgram::DevNodeScript { entry, working_dir } => build_node_command("node", &entry, &working_dir),
  }
}
