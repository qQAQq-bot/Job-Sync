import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const tauriDir = path.join(projectRoot, "src-tauri");
const releaseConfigPath = path.join(tauriDir, "tauri.conf.release.json");
const releaseOutputDir = path.join(tauriDir, "target", "release");
const portableRootDir = path.join(projectRoot, "release-portable");
const portableDir = path.join(portableRootDir, "job-sync");

function runCommand(command, args, env = process.env) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      env,
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

async function readReleaseConfig() {
  const raw = await fs.readFile(releaseConfigPath, "utf8");
  return JSON.parse(raw);
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

async function copyFileIntoDir(sourcePath, targetDir) {
  const targetPath = path.join(targetDir, path.basename(sourcePath));
  await fs.copyFile(sourcePath, targetPath);
}

async function copyDirectoryIntoDir(sourcePath, targetDir) {
  const targetPath = path.join(targetDir, path.basename(sourcePath));
  await fs.cp(sourcePath, targetPath, { force: true, recursive: true });
}

function toPowerShellLiteral(value) {
  return `'${value.replaceAll("'", "''")}'`;
}

async function createPortableZip(sourceDir, outputFile) {
  await fs.mkdir(path.dirname(outputFile), { recursive: true });
  const command = `Compress-Archive -LiteralPath ${toPowerShellLiteral(sourceDir)} -DestinationPath ${toPowerShellLiteral(outputFile)} -Force`;
  await runCommand("powershell.exe", ["-NoProfile", "-Command", command]);
}

async function main() {
  const config = await readReleaseConfig();
  const version = config.version;
  if (!version) {
    throw new Error("missing version in src-tauri/tauri.conf.release.json");
  }

  const skipBuild = process.argv.includes("--skip-build");
  if (!skipBuild) {
    await runCommand("npm", ["run", "tauri:build"]);
  }

  const appExecutable = path.join(releaseOutputDir, "job-sync.exe");
  const bundledNode = path.join(tauriDir, "bin", "node.exe");
  const bundledWorkerDir = path.join(tauriDir, "bin", "boss-crawler-worker");

  await ensureFileExists(appExecutable, "portable app executable");
  await ensureFileExists(bundledNode, "portable node runtime");
  await ensureDirectoryExists(bundledWorkerDir, "portable worker runtime directory");
  await ensureFileExists(path.join(bundledWorkerDir, "dist", "main.js"), "portable worker entry");
  await ensureFileExists(path.join(bundledWorkerDir, "package.json"), "portable worker package.json");

  await fs.rm(portableDir, { recursive: true, force: true });
  await fs.mkdir(portableDir, { recursive: true });

  await copyFileIntoDir(appExecutable, portableDir);
  await copyFileIntoDir(bundledNode, portableDir);
  await copyDirectoryIntoDir(bundledWorkerDir, portableDir);

  const zipName = `job-sync-portable-v${version}.zip`;
  const zipPath = path.join(portableRootDir, zipName);
  await fs.rm(zipPath, { force: true });
  await createPortableZip(portableDir, zipPath);

  console.log(`Portable directory: ${portableDir}`);
  console.log(`Portable zip: ${zipPath}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exit(1);
});
