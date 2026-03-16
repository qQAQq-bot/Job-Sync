import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const tauriBinDir = path.join(projectRoot, "src-tauri", "bin");
const workerProjectDir = path.join(projectRoot, "packages", "boss-crawler-worker");
const workerDistDir = path.join(workerProjectDir, "dist");
const workerPackageJsonPath = path.join(workerProjectDir, "package.json");
const stagedWorkerDir = path.join(tauriBinDir, "boss-crawler-worker");
const stagedWorkerDistDir = path.join(stagedWorkerDir, "dist");
const stagedWorkerPackageJsonPath = path.join(stagedWorkerDir, "package.json");
const stagedNodePath = path.join(tauriBinDir, "node.exe");
const legacyWorkerExePath = path.join(tauriBinDir, "boss-crawler-worker.exe");

function runCommand(command, args, options = {}) {
  const { cwd = projectRoot, env = process.env } = options;

  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env,
      stdio: "inherit",
      shell: process.platform === "win32",
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${command} ${args.join(" ")} exited with code ${code ?? 1}`));
    });
  });
}

async function ensureFileExists(filePath, label) {
  try {
    const stat = await fs.stat(filePath);
    if (!stat.isFile()) {
      throw new Error(`${label} is not a file: ${filePath}`);
    }
  } catch {
    throw new Error(`${label} not found: ${filePath}`);
  }
}

async function ensureDirectoryExists(dirPath, label) {
  try {
    const stat = await fs.stat(dirPath);
    if (!stat.isDirectory()) {
      throw new Error(`${label} is not a directory: ${dirPath}`);
    }
  } catch {
    throw new Error(`${label} not found: ${dirPath}`);
  }
}

async function copyFile(sourcePath, targetPath) {
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.copyFile(sourcePath, targetPath);
}

async function copyDirectory(sourcePath, targetPath) {
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.cp(sourcePath, targetPath, { force: true, recursive: true });
}

async function resolveNodeExecutablePath() {
  const candidates = [];

  if (process.env.JOB_SYNC_NODE_EXE) {
    candidates.push(process.env.JOB_SYNC_NODE_EXE);
  }

  candidates.push(process.execPath);

  for (const entry of (process.env.PATH ?? "").split(path.delimiter)) {
    if (!entry) {
      continue;
    }
    candidates.push(path.join(entry, "node.exe"));
  }

  for (const candidate of candidates) {
    if (path.basename(candidate).toLowerCase() !== "node.exe") {
      continue;
    }

    try {
      const stat = await fs.stat(candidate);
      if (stat.isFile()) {
        return candidate;
      }
    } catch {
      // ignore missing candidates
    }
  }

  throw new Error(
    `Unable to locate a Windows node.exe for release staging. Set JOB_SYNC_NODE_EXE to a Windows Node runtime path if it is not on PATH. Current execPath: ${process.execPath}`,
  );
}

function workerInstallEnv() {
  return {
    ...process.env,
    NODE_ENV: "production",
    PUPPETEER_SKIP_DOWNLOAD: process.env.PUPPETEER_SKIP_DOWNLOAD ?? "1",
  };
}

async function installWorkerDependencies() {
  await runCommand("npm", ["install", "--omit=dev", "--package-lock=false"], {
    cwd: stagedWorkerDir,
    env: workerInstallEnv(),
  });
}

async function main() {
  const nodeExecutablePath = await resolveNodeExecutablePath();

  await runCommand("npm", ["run", "build:worker"]);

  await ensureDirectoryExists(workerDistDir, "worker dist directory");
  await ensureFileExists(path.join(workerDistDir, "main.js"), "worker entry file");
  await ensureFileExists(workerPackageJsonPath, "worker package.json");
  await ensureFileExists(nodeExecutablePath, "current node.exe");

  await fs.rm(stagedWorkerDir, { recursive: true, force: true });
  await fs.rm(stagedNodePath, { force: true });
  await fs.rm(legacyWorkerExePath, { force: true });
  await fs.mkdir(tauriBinDir, { recursive: true });

  await copyDirectory(workerDistDir, stagedWorkerDistDir);
  await copyFile(workerPackageJsonPath, stagedWorkerPackageJsonPath);
  await installWorkerDependencies();
  await copyFile(nodeExecutablePath, stagedNodePath);

  await ensureFileExists(stagedNodePath, "staged node.exe");
  await ensureFileExists(path.join(stagedWorkerDistDir, "main.js"), "staged worker entry file");
  await ensureFileExists(stagedWorkerPackageJsonPath, "staged worker package.json");
  await ensureDirectoryExists(path.join(stagedWorkerDir, "node_modules"), "staged worker node_modules");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exit(1);
});
