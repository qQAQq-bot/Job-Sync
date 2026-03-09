import "./styles/tailwind.css";

import { createApp } from "vue";

import App from "./App.vue";
import { applySidecarEvent } from "./lib/runtime";
import { startSidecarListener } from "./lib/sidecar";
import { router } from "./router";

createApp(App).use(router).mount("#app");

void startSidecarListener(applySidecarEvent).catch(() => undefined);
