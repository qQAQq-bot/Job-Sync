import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";

const projectRoot = process.cwd();
const runtimeDir = path.resolve(projectRoot, process.argv[2] ?? "src-tauri/bin");
const workerExe = path.join(runtimeDir, "boss-crawler-worker.exe");
const nodeExe = path.join(runtimeDir, "node.exe");
const workerDir = path.join(runtimeDir, "boss-crawler-worker");
const workerEntry = path.join(workerDir, "dist", "main.js");

function runtimeCommand() {
  if (process.platform === "win32" && process.env.ComSpec) {
    if (exists(workerExe)) {
      return { command: workerExe, args: [], cwd: runtimeDir };
    }
    if (exists(nodeExe) && exists(workerEntry)) {
      return { command: nodeExe, args: [workerEntry], cwd: workerDir };
    }
  }

  throw new Error(`No runnable staged worker runtime found in ${runtimeDir}`);
}

function exists(targetPath) {
  try {
    const stat = fs.statSync(targetPath);
    return stat.isFile() || stat.isDirectory();
  } catch {
    return false;
  }
}

async function captureStartupLog() {
  const { command, args, cwd } = runtimeCommand();

  return await new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: ["pipe", "pipe", "pipe"],
      shell: false,
    });

    let stdout = "";
    let stderr = "";
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill();
      reject(new Error(`Timed out waiting for startup log.\nSTDOUT:\n${stdout}\nSTDERR:\n${stderr}`));
    }, 5000);

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");

    child.stdout.on("data", (chunk) => {
      stdout += chunk;
      const line = stdout.split(/\r?\n/).find(Boolean);
      if (!line) return;

      try {
        const event = JSON.parse(line);
        if (event?.type === "LOG" && event?.payload?.message === "boss-crawler-worker started") {
          settled = true;
          clearTimeout(timer);
          child.stdin.end();
          child.kill();
          resolve({ stdout, stderr, command, args, cwd });
        }
      } catch {
        // ignore partial lines until the process exits or a full JSON event appears
      }
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });

    child.on("exit", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(new Error(`Worker exited before startup log. code=${code}\nSTDOUT:\n${stdout}\nSTDERR:\n${stderr}`));
    });

    child.on("error", (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(error);
    });

    child.stdin.end();
  });
}

captureStartupLog()
  .then(({ command, args, cwd }) => {
    console.log(`Worker runtime OK: ${command} ${args.join(" ")} (cwd=${cwd})`);
  })
  .catch((error) => {
    console.error(error instanceof Error ? error.stack || error.message : String(error));
    process.exit(1);
  });
