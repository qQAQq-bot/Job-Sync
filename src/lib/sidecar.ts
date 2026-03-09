import { listen } from "@tauri-apps/api/event";

import type { SidecarEvent } from "./protocol";
import { isTauri } from "./tauri";

export async function startSidecarListener(onEvent: (evt: SidecarEvent) => void): Promise<() => void> {
  if (!isTauri()) return () => undefined;
  return await listen<SidecarEvent>("sidecar://event", (event) => {
    onEvent(event.payload);
  });
}

