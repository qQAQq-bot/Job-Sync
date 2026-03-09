/**
 * SageTime rate limiter.
 *
 * Pauses execution after a configurable number of operations to avoid
 * triggering anti-bot rate limits.
 *
 * Ported from geekgeekrun packages/geek-auto-start-chat-with-boss/sage-time.mjs.
 */

import { delay } from "./delay.js";

export interface SageTimeConfig {
  enabled?: boolean;
  maxOps?: number;
  pauseMinutes?: number;
}

export class SageTime {
  private readonly enabled: boolean;
  private readonly maxOps: number;
  private readonly pauseMinutes: number;
  private totalEnabledTimes = 0;
  private recordedOpCount = 0;

  constructor(config: SageTimeConfig = {}) {
    const maxOps = typeof config.maxOps === "number" && config.maxOps >= 1 ? config.maxOps : 100;
    const pauseMinutes =
      typeof config.pauseMinutes === "number" && config.pauseMinutes >= 0 ? config.pauseMinutes : 15;

    this.maxOps = maxOps;
    this.pauseMinutes = pauseMinutes;
    this.enabled = pauseMinutes === 0 ? false : (config.enabled ?? true);
  }

  async checkpoint(signal: AbortSignal, log?: (msg: string) => void): Promise<void> {
    if (!this.enabled) return;

    if (this.recordedOpCount > this.maxOps) {
      this.totalEnabledTimes++;
      log?.(
        `[SageTime] 请求已达限制，暂停；当前记录次数 ${this.recordedOpCount}；第 ${this.totalEnabledTimes} 次暂停`,
      );
      await delay(this.pauseMinutes * 60 * 1000, signal);
      log?.(
        `[SageTime] 暂停结束，继续；当前记录次数 ${this.recordedOpCount}；第 ${this.totalEnabledTimes} 次恢复`,
      );
      this.recordedOpCount = 0;
    } else {
      log?.(
        `[SageTime] 请求未达限制；当前记录次数 ${this.recordedOpCount}；已暂停过 ${this.totalEnabledTimes} 次`,
      );
      this.recordedOpCount++;
    }
  }
}
