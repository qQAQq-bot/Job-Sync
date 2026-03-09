import { reactive } from "vue";

import type { SidecarEvent } from "./protocol";

export type LogLine = {
  ts: string;
  level: string;
  message: string;
};

export const runtime = reactive({
  logs: [] as LogLine[],
  login: {
    status: undefined as string | undefined,
    message: undefined as string | undefined,
  },
  sidecarTask: {
    running: false,
    type: undefined as "login" | "meta_sync" | "crawl_manual" | "crawl_auto" | undefined,
  },
  bossMeta: undefined as
    | {
        synced_at?: string;
        city_group?: unknown;
        filter_conditions?: unknown;
        industry_filter_exemption?: unknown;
      }
    | undefined,
  progress: {
    keyword: undefined as string | undefined,
    current_page: undefined as number | undefined,
    captured_job_list: 0,
    captured_job_detail: 0,
  },
  lastCookieCollectedAt: undefined as string | undefined,
  /** Incremented each time a FINISHED event arrives — watchers can react to this. */
  finishedCounter: 0,
  /** Set to the encrypt_job_id of the most recently captured detail. */
  lastDetailCapturedId: undefined as string | undefined,
});

function nowIso(): string {
  return new Date().toISOString();
}

function pushLog(line: LogLine): void {
  runtime.logs.push(line);
  if (runtime.logs.length > 500) runtime.logs.splice(0, runtime.logs.length - 500);
}

export function clearLogs(): void {
  runtime.logs.splice(0, runtime.logs.length);
}

export function applySidecarEvent(evt: SidecarEvent): void {
  switch (evt.type) {
    case "LOG":
      pushLog({
        ts: evt.payload.ts ?? nowIso(),
        level: evt.payload.level,
        message: evt.payload.message,
      });
      return;
    case "ERROR":
      pushLog({
        ts: nowIso(),
        level: "error",
        message: evt.payload.message,
      });
      return;
    case "LOGIN_STATUS":
      runtime.login.status = evt.payload.status;
      runtime.login.message = evt.payload.message;
      return;
    case "PROGRESS":
      runtime.progress.keyword = evt.payload.keyword ?? runtime.progress.keyword;
      runtime.progress.current_page = evt.payload.current_page ?? runtime.progress.current_page;
      if (typeof evt.payload.captured_job_list === "number")
        runtime.progress.captured_job_list = evt.payload.captured_job_list;
      if (typeof evt.payload.captured_job_detail === "number")
        runtime.progress.captured_job_detail = evt.payload.captured_job_detail;
      return;
    case "JOB_LIST_CAPTURED":
      runtime.progress.captured_job_list += 1;
      return;
    case "JOB_DETAIL_CAPTURED":
      runtime.progress.captured_job_detail += 1;
      runtime.lastDetailCapturedId = evt.payload.encrypt_job_id;
      return;
    case "COOKIE_COLLECTED":
      runtime.lastCookieCollectedAt = nowIso();
      pushLog({ ts: runtime.lastCookieCollectedAt, level: "info", message: "已采集 Cookie 与 LocalStorage。" });
      return;
    case "AI_RESULT":
      pushLog({ ts: nowIso(), level: "info", message: "AI 结果已生成。" });
      return;
    case "BOSS_META_SYNCED":
      if (
        runtime.bossMeta &&
        typeof runtime.bossMeta === "object" &&
        evt.payload &&
        typeof evt.payload === "object"
      ) {
        runtime.bossMeta = { ...(runtime.bossMeta as any), ...(evt.payload as any) };
      } else {
        runtime.bossMeta = evt.payload;
      }
      pushLog({ ts: nowIso(), level: "info", message: "已同步城市、行业与筛选项。" });
      return;
    case "FINISHED":
      pushLog({ ts: nowIso(), level: "info", message: "任务已结束。" });
      runtime.finishedCounter += 1;
      runtime.sidecarTask.running = false;
      runtime.sidecarTask.type = undefined;
      return;
    default: {
      const _exhaustive: never = evt;
      return _exhaustive;
    }
  }
}
