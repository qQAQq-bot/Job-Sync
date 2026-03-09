import type { CommandIn, EventOut } from "./protocol.js";
import { emitEvent, readCommands } from "./stdio.js";
import { runAiMode, runAiGroupMode } from "./modes/ai.js";
import { runResumeDiagnoseMode, runResumeRewriteModuleMode } from "./modes/resumeWorkspace.js";
import { runAutoMode } from "./modes/auto.js";
import { runLoginMode } from "./modes/login.js";
import { runBossMetaSyncMode } from "./modes/meta.js";
import { runManualMode } from "./modes/manual.js";

type Running = {
  controller: AbortController;
  done: Promise<void>;
};

function safeError(err: unknown): { message: string; stack?: string } {
  if (err instanceof Error) return { message: err.message, stack: err.stack };
  return { message: String(err) };
}

function createContext(controller: AbortController): { emit: (e: EventOut) => void; signal: AbortSignal } {
  return {
    emit: emitEvent,
    signal: controller.signal,
  };
}

let running: Running | null = null;

function stopRunning(): void {
  if (!running) return;
  running.controller.abort();
  running = null;
}

async function startMode(run: (payload: any, ctx: any) => Promise<void>, payload: any): Promise<void> {
  stopRunning();
  const controller = new AbortController();
  const ctx = createContext(controller);
  const done = run(payload, ctx).catch((err) => {
    emitEvent({ type: "ERROR", payload: safeError(err) });
  });
  running = { controller, done };
  await done;
  if (running?.done === done) running = null;
}

emitEvent({ type: "LOG", payload: { level: "info", message: "boss-crawler-worker started" } });

readCommands((cmd: CommandIn) => {
  void (async () => {
    switch (cmd.type) {
      case "LOGIN_START":
        await startMode(runLoginMode, cmd.payload);
        return;
      case "CRAWL_MANUAL_START":
        await startMode(runManualMode, cmd.payload);
        return;
      case "CRAWL_AUTO_START":
        await startMode(runAutoMode, cmd.payload);
        return;
      case "BOSS_META_SYNC":
        await startMode(runBossMetaSyncMode, cmd.payload);
        return;
      case "AI_ANALYZE":
        await startMode(runAiMode, cmd.payload);
        return;
      case "AI_ANALYZE_GROUP":
        await startMode(runAiGroupMode, cmd.payload);
        return;
      case "RESUME_DIAGNOSE":
        await startMode(runResumeDiagnoseMode, cmd.payload);
        return;
      case "RESUME_REWRITE_MODULE":
        await startMode(runResumeRewriteModuleMode, cmd.payload);
        return;
      case "STOP":
        stopRunning();
        emitEvent({ type: "LOG", payload: { level: "info", message: "STOP received" } });
        return;
      case "PAUSE":
        emitEvent({ type: "LOG", payload: { level: "warn", message: "PAUSE not implemented in V1" } });
        return;
      case "RESUME":
        emitEvent({ type: "LOG", payload: { level: "warn", message: "RESUME not implemented in V1" } });
        return;
      default:
        emitEvent({ type: "ERROR", payload: { message: `Unknown command type: ${(cmd as any).type}` } });
    }
  })();
});

process.on("SIGINT", () => {
  stopRunning();
  emitEvent({ type: "FINISHED" });
  process.exit(0);
});
