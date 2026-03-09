import { spawn } from "node:child_process";
import process from "node:process";

const child = spawn("tauri", ["build", "--config", "src-tauri/tauri.conf.release.json"], {
  stdio: "inherit",
  env: process.env,
  shell: process.platform === "win32",
});

child.on("exit", (code) => {
  process.exit(code ?? 1);
});
