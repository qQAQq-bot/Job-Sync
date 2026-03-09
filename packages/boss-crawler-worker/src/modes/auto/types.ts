import type { z } from "zod";

import type { CrawlAutoStartPayloadSchema, EventOut } from "../../protocol.js";

export type CrawlAutoStartPayload = z.infer<typeof CrawlAutoStartPayloadSchema>;

export type ModeContext = {
  emit: (event: EventOut) => void;
  signal: AbortSignal;
};
