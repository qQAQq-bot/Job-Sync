/**
 * Laodeng-style stealth injection.
 *
 * Hides automation traces by:
 * 1. Hijacking `Function.prototype.toString` via WeakMap so wrapped functions
 *    still return `[native code]`.
 * 2. Wrapping console methods to filter object params, preventing CDP detection.
 *
 * Ported from geekgeekrun packages/laodeng/index.js.
 */

import type { Browser, Page } from "puppeteer";

const stealthScript = (): void => {
  (() => {
    "use strict";

    /* 1. Save native Function.prototype.toString */
    const nativeFunctionToString = Function.prototype.toString;

    /* 2. WeakMap: function -> fake native source */
    const nativeSourceMap = new WeakMap<Function, string>();

    /* 3. Register fake native source */
    const registerNativeSource = (fn: Function, source: string): void => {
      try {
        nativeSourceMap.set(fn, source);
      } catch {
        // ignore
      }
    };

    /* 4. Hijack Function.prototype.toString */
    Object.defineProperty(Function.prototype, "toString", {
      configurable: true,
      writable: true,
      value: function toString(this: Function): string {
        if (nativeSourceMap.has(this)) {
          return nativeSourceMap.get(this)!;
        }
        return nativeFunctionToString.call(this);
      },
    });

    /* 5. Disguise Function.prototype.toString itself */
    registerNativeSource(Function.prototype.toString, nativeFunctionToString.toString());

    /* 6. stealthify: wrap a function while preserving native appearance */
    const stealthify = (
      obj: Record<string, any>,
      prop: string,
      handler: (original: (...args: any[]) => any, args: any[]) => any,
    ): void => {
      const original = obj[prop];
      if (typeof original !== "function") return;

      const wrapped = function (this: any, ...args: any[]): any {
        return handler.call(this, original, args);
      };

      const nameDesc = Object.getOwnPropertyDescriptor(wrapped, "name");
      Object.defineProperty(wrapped, "name", { ...nameDesc, value: prop });

      try {
        Object.setPrototypeOf(wrapped, Object.getPrototypeOf(original));
      } catch {
        // ignore
      }

      registerNativeSource(wrapped, nativeFunctionToString.call(original));

      const desc = Object.getOwnPropertyDescriptor(obj, prop);
      Object.defineProperty(obj, prop, { ...desc, value: wrapped });
    };

    /* 7. Stealth console methods -- filter object params to prevent CDP detection */
    const filterConsoleArgs = (args: any[]): any[] =>
      args.map((arg) => {
        if (arg && typeof arg === "object") return {};
        return arg;
      });

    ["log", "debug", "info", "warn", "error", "dir", "table"].forEach((name) => {
      stealthify(console as unknown as Record<string, any>, name, (original, args) => {
        return original.apply(console, filterConsoleArgs(args));
      });
    });

    /* 8. Defensive self-patching */
    registerNativeSource(registerNativeSource, "function registerNativeSource() { [native code] }");
  })();
};

export async function injectStealthScript(page: Page): Promise<void> {
  await page.evaluateOnNewDocument(stealthScript);
}

export async function applyStealthToAllPages(browser: Browser): Promise<void> {
  const pages = await browser.pages();
  for (const page of pages) {
    await injectStealthScript(page);
  }
}
