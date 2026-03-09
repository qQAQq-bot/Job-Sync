import { launchBrowser } from "../../browser/launch.js";
import { blockNavigation } from "../../browser/navigationLock.js";
import { collectBossMetaByListening } from "../../boss/meta.js";
import { API_PATH, URLS } from "../../boss/selectors.js";
import { delayWithJitter } from "../../utils/delay.js";
import { SageTime } from "../../utils/sage-time.js";

import { buildJobDetailBody, buildJobDetailUrl, buildJobListBody, detectRiskUrl, extractJobList, fetchJsonFromPage, isAbnormalAccess, normalizeFilters, readApiCode, readApiMessage, safeError, setLocalStorage, waitUntilApiOk, waitUntilNoRiskUrl } from "./shared.js";
import type { CrawlAutoStartPayload, ModeContext } from "./types.js";

export async function runAutoMode(payload: CrawlAutoStartPayload, ctx: ModeContext): Promise<void> {
  const keywords = payload.task.keywords ?? [];
  const limits = (payload.task.limits ?? {}) as any;
  const maxPages: number = typeof limits.maxPages === "number" ? limits.maxPages : 3;
  const maxJobs: number = typeof limits.maxJobs === "number" ? limits.maxJobs : 50;
  const delayMs: number = typeof limits.delayMs === "number" ? limits.delayMs : 800;
  const jitterMs: number = typeof limits.jitterMs === "number" ? limits.jitterMs : 1000;
  const pageSize: number = typeof limits.pageSize === "number" ? limits.pageSize : 15;
  const sageTime = new SageTime({
    enabled: typeof limits.sageTimeEnabled === "boolean" ? limits.sageTimeEnabled : true,
    maxOps: typeof limits.sageTimeMaxOps === "number" ? limits.sageTimeMaxOps : 100,
    pauseMinutes: typeof limits.sageTimePauseMinutes === "number" ? limits.sageTimePauseMinutes : 15,
  });
  const log = (msg: string): void => {
    ctx.emit({ type: "LOG", payload: { level: "info", message: msg } });
  };
  const warn = (msg: string): void => {
    ctx.emit({ type: "LOG", payload: { level: "warn", message: msg } });
  };

  const apiFilters = normalizeFilters(payload.task.filters, warn);

  let captured_job_list = 0;
  let captured_job_detail = 0;

  const { browser, page } = await launchBrowser({ headless: false });
  try {
    await blockNavigation(page, { allow_domain_suffixes: ["zhipin.com"] });

    const cookies = payload.session.cookies;
    if (Array.isArray(cookies) && cookies.length > 0) {
      await page.setCookie(...(cookies as any[]));
    }

    await page.goto(URLS.DESKTOP, { waitUntil: "domcontentloaded" });
    const local_storage = payload.session.local_storage;
    if (local_storage && typeof local_storage === "object") {
      await setLocalStorage(page, local_storage as Record<string, string>);
    }

    await page.goto(URLS.GEEK_JOBS, { waitUntil: "domcontentloaded" });

    await waitUntilNoRiskUrl(page, ctx);
    if (ctx.signal.aborted) return;

    const meta = await collectBossMetaByListening(page, ctx.signal).catch(() => null);
    if (meta && (meta.city_group || meta.filter_conditions || meta.industry_filter_exemption)) {
      ctx.emit({ type: "BOSS_META_SYNCED", payload: meta });
    }

    for (const keyword of keywords) {
      if (ctx.signal.aborted) break;
      if (captured_job_detail >= maxJobs) break;

      log(`开始关键词：${keyword}`);

      const seenJobIds = new Set<string>();
      let hasMore = true;

      for (let pageIndex = 1; pageIndex <= maxPages; pageIndex++) {
        if (ctx.signal.aborted) break;
        if (captured_job_detail >= maxJobs) break;
        if (!hasMore) break;

        const risk = detectRiskUrl(page.url());
        if (risk) {
          await waitUntilNoRiskUrl(page, ctx);
          if (ctx.signal.aborted) break;
          pageIndex -= 1;
          continue;
        }

        ctx.emit({
          type: "PROGRESS",
          payload: { keyword, current_page: pageIndex, captured_job_list, captured_job_detail },
        });

        await sageTime.checkpoint(ctx.signal, log);
        const jobListUrl = `https://www.zhipin.com${API_PATH.JOB_LIST}?_=${Date.now()}`;
        const jobListBody = buildJobListBody(keyword, pageIndex, pageSize, apiFilters);
        let jobListRes = await fetchJsonFromPage(page, jobListUrl, {
          method: "POST",
          body: jobListBody,
          timeoutMs: 60_000,
        });

        if (ctx.signal.aborted) break;

        if (jobListRes.status === 403) {
          ctx.emit({
            type: "LOGIN_STATUS",
            payload: { status: "denied", message: "joblist 接口返回 403（可能触发风控）。" },
          });
          const recovered = await waitUntilApiOk(page, ctx, "joblist", () =>
            fetchJsonFromPage(page, jobListUrl, { method: "POST", body: jobListBody, timeoutMs: 60_000 }),
          );
          if (!recovered) return;
          jobListRes = recovered;
        }

        if (!jobListRes.json || typeof jobListRes.json !== "object") {
          ctx.emit({
            type: "ERROR",
            payload: { message: `joblist 接口未返回有效 JSON（status=${jobListRes.status}）` },
          });
          return;
        }

        let jobListRaw = jobListRes.json as any;
        if (readApiCode(jobListRaw) !== 0 && isAbnormalAccess(jobListRaw)) {
          const msg = readApiMessage(jobListRaw);
          ctx.emit({
            type: "LOGIN_STATUS",
            payload: {
              status: "captcha",
              message: `joblist 接口返回访问异常：${msg || "code=37"}。请在浏览器窗口完成人机验证后自动重试。`,
            },
          });
          const recovered = await waitUntilApiOk(page, ctx, "joblist", () =>
            fetchJsonFromPage(page, jobListUrl, { method: "POST", body: jobListBody, timeoutMs: 60_000 }),
          );
          if (!recovered) return;
          jobListRaw = recovered.json as any;
        }

        if (readApiCode(jobListRaw) !== 0) {
          ctx.emit({
            type: "ERROR",
            payload: {
              message: `joblist 接口返回异常：code=${String(readApiCode(jobListRaw))} message=${String(
                readApiMessage(jobListRaw),
              )}`,
            },
          });
          return;
        }

        captured_job_list += 1;
        ctx.emit({
          type: "JOB_LIST_CAPTURED",
          payload: { keyword, filters: payload.task.filters, raw: jobListRaw },
        });

        const extracted = extractJobList(jobListRaw);
        hasMore = extracted.hasMore;

        for (const job of extracted.jobs) {
          if (ctx.signal.aborted) break;
          if (captured_job_detail >= maxJobs) break;

          const securityId = typeof job?.securityId === "string" ? job.securityId : null;
          if (!securityId) continue;
          if (seenJobIds.has(securityId)) continue;

          const lid = typeof job?.lid === "string" ? job.lid : undefined;

          await sageTime.checkpoint(ctx.signal, log);
          const detailUrl = buildJobDetailUrl(securityId, lid);
          let detailResGet = await fetchJsonFromPage(page, detailUrl, { method: "GET", timeoutMs: 60_000 });

          if (ctx.signal.aborted) break;

          if (detailResGet.status === 403) {
            ctx.emit({
              type: "LOGIN_STATUS",
              payload: { status: "denied", message: "job/detail 接口返回 403（可能触发风控）。" },
            });
            const recovered = await waitUntilApiOk(page, ctx, "job/detail", () =>
              fetchJsonFromPage(page, detailUrl, { method: "GET", timeoutMs: 60_000 }),
            );
            if (!recovered) return;
            detailResGet = recovered;
          }

          let detailRaw = detailResGet.json as any;
          if (detailRaw && typeof detailRaw === "object" && readApiCode(detailRaw) !== 0 && isAbnormalAccess(detailRaw)) {
            const msg = readApiMessage(detailRaw);
            ctx.emit({
              type: "LOGIN_STATUS",
              payload: {
                status: "captcha",
                message: `job/detail 接口返回访问异常：${msg || "code=37"}。请在浏览器窗口完成人机验证后自动重试。`,
              },
            });
            const recovered = await waitUntilApiOk(page, ctx, "job/detail", () =>
              fetchJsonFromPage(page, detailUrl, { method: "GET", timeoutMs: 60_000 }),
            );
            if (!recovered) return;
            detailRaw = recovered.json as any;
          }
          if (!detailRaw || typeof detailRaw !== "object" || detailRaw.code !== 0) {
            const detailBody = buildJobDetailBody(securityId, lid);
            const detailResPost = await fetchJsonFromPage(page, detailUrl, {
              method: "POST",
              body: detailBody,
              timeoutMs: 60_000,
            });

            if (ctx.signal.aborted) break;

            if (detailResPost.status === 403) {
              ctx.emit({
                type: "LOGIN_STATUS",
                payload: { status: "denied", message: "job/detail 接口返回 403（可能触发风控）。" },
              });
              const recovered = await waitUntilApiOk(page, ctx, "job/detail", () =>
                fetchJsonFromPage(page, detailUrl, { method: "POST", body: detailBody, timeoutMs: 60_000 }),
              );
              if (!recovered) return;
              const recoveredRaw = recovered.json as any;
              if (recoveredRaw && typeof recoveredRaw === "object" && readApiCode(recoveredRaw) === 0) {
                detailRaw = recoveredRaw;
              } else {
                await delayWithJitter(delayMs, ctx.signal, jitterMs);
                continue;
              }
            }

            detailRaw = detailResPost.json as any;
            if (!detailRaw || typeof detailRaw !== "object") {
              warn(`job/detail 接口未返回有效 JSON（GET status=${detailResGet.status} / POST status=${detailResPost.status}，securityId=${securityId}）。`);
              await delayWithJitter(delayMs, ctx.signal, jitterMs);
              continue;
            }
            if (readApiCode(detailRaw) !== 0 && isAbnormalAccess(detailRaw)) {
              const msg = readApiMessage(detailRaw);
              ctx.emit({
                type: "LOGIN_STATUS",
                payload: {
                  status: "captcha",
                  message: `job/detail 接口返回访问异常：${msg || "code=37"}。请在浏览器窗口完成人机验证后自动重试。`,
                },
              });
              const recovered = await waitUntilApiOk(page, ctx, "job/detail", () =>
                fetchJsonFromPage(page, detailUrl, { method: "POST", body: detailBody, timeoutMs: 60_000 }),
              );
              if (!recovered) return;
              detailRaw = recovered.json as any;
            }
            if (detailRaw.code !== 0) {
              warn(`job/detail 接口返回异常：code=${String(detailRaw.code)} message=${String(detailRaw.message ?? "")}`);
              await delayWithJitter(delayMs, ctx.signal, jitterMs);
              continue;
            }
          }

          seenJobIds.add(securityId);
          captured_job_detail += 1;
          const zp_data = detailRaw?.zpData ?? detailRaw;
          ctx.emit({ type: "JOB_DETAIL_CAPTURED", payload: { encrypt_job_id: securityId, zp_data } });

          if (captured_job_detail >= maxJobs) break;
          await delayWithJitter(delayMs, ctx.signal, jitterMs);
        }

        await delayWithJitter(delayMs, ctx.signal, jitterMs);
      }
    }
  } catch (err) {
    ctx.emit({ type: "ERROR", payload: safeError(err) });
  } finally {
    await browser.close().catch(() => undefined);
    ctx.emit({ type: "FINISHED" });
  }
}
