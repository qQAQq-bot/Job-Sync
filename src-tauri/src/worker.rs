use std::path::PathBuf;

use tauri::Manager;

#[derive(Debug, Clone)]
pub enum WorkerProgram {
  Sidecar(PathBuf),
  NodeScript(PathBuf),
}

fn dev_node_entry() -> PathBuf {
  PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../packages/boss-crawler-worker/dist/main.js")
}

fn candidate_sidecar_paths(app: &tauri::AppHandle) -> Vec<PathBuf> {
  let mut out = Vec::new();

  if let Ok(p) = std::env::var("JOB_SYNC_WORKER_EXEC") {
    out.push(PathBuf::from(p));
  }

  if let Ok(resource_dir) = app.path().resource_dir() {
    out.push(resource_dir.join("boss-crawler-worker.exe"));
    out.push(resource_dir.join("boss-crawler-worker"));
    out.push(resource_dir.join("boss-crawler-worker-x86_64-pc-windows-msvc.exe"));

    let resource_bin_dir = resource_dir.join("bin");
    out.push(resource_bin_dir.join("boss-crawler-worker.exe"));
    out.push(resource_bin_dir.join("boss-crawler-worker"));
    out.push(resource_bin_dir.join("boss-crawler-worker-x86_64-pc-windows-msvc.exe"));
  }

  let dev_bin_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("bin");
  out.push(dev_bin_dir.join("boss-crawler-worker.exe"));
  out.push(dev_bin_dir.join("boss-crawler-worker"));
  out.push(dev_bin_dir.join("boss-crawler-worker-x86_64-pc-windows-msvc.exe"));

  out
}

pub fn resolve_worker_program(app: &tauri::AppHandle) -> WorkerProgram {
  for path in candidate_sidecar_paths(app) {
    if path.exists() && path.is_file() {
      return WorkerProgram::Sidecar(path);
    }
  }

  WorkerProgram::NodeScript(dev_node_entry())
}
