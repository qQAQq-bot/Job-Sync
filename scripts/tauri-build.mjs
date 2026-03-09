import { spawn } from "node:child_process";
import process from "node:process";

const env = {
  ...process.env,
  TAURI_CONFIG: "src-tauri/tauri.conf.release.json",
};

const child = spawn("tauri", ["build"], {
  stdio: "inherit",
  env,
  shell: process.platform === "win32",
});

child.on("exit", (code) => {
  process.exit(code ?? 1);
});
