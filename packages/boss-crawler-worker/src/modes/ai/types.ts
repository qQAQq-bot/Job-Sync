import type { z as zType } from "zod";

import type { AiAnalyzeGroupPayloadSchema, AiAnalyzePayloadSchema, EventOut } from "../../protocol.js";

export type AiAnalyzePayload = zType.infer<typeof AiAnalyzePayloadSchema>;
export type AiAnalyzeGroupPayload = zType.infer<typeof AiAnalyzeGroupPayloadSchema>;

export type ModeContext = {
  emit: (event: EventOut) => void;
  signal: AbortSignal;
};
