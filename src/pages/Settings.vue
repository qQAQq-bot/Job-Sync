<script setup lang="ts">
import { onMounted, ref } from "vue";

import UiSelect from "../components/ui/UiSelect.vue";
import { invoke, isTauri } from "../lib/tauri";

interface AppSettings {
  browser_executable_path?: string | null;
  openai_api_key?: string | null;
  openai_base_url?: string | null;
  openai_model?: string | null;
  openai_api_mode?: string | null;
}

interface ModelInfo {
  id: string;
  owned_by: string;
}

const tauri = isTauri();

const browserExecutablePath = ref("");
const apiKey = ref("");
const baseUrl = ref("");
const model = ref("");
const apiMode = ref("chat_completions");

const models = ref<ModelInfo[]>([]);
const modelsLoading = ref(false);
const saving = ref(false);
const error = ref<string | null>(null);
const success = ref(false);

async function loadSettings(): Promise<void> {
  if (!tauri) return;
  try {
    const settings = await invoke<AppSettings>("get_settings");
    browserExecutablePath.value = settings.browser_executable_path ?? "";
    apiKey.value = settings.openai_api_key ?? "";
    baseUrl.value = settings.openai_base_url ?? "";
    model.value = settings.openai_model ?? "";
    if (settings.openai_api_mode) {
      const m = settings.openai_api_mode.trim().toLowerCase();
      if (m === "responses") apiMode.value = "responses";
      if (m === "chat_completions" || m === "chat" || m === "chat/completions") apiMode.value = "chat_completions";
    }
  } catch {
    // ignore
  }
}

async function loadModels(): Promise<void> {
  if (!tauri) return;
  modelsLoading.value = true;
  error.value = null;
  try {
    models.value = await invoke<ModelInfo[]>("list_models", {
      apiKey: apiKey.value.trim() || null,
      baseUrl: baseUrl.value.trim() || null,
    });
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e);
  } finally {
    modelsLoading.value = false;
  }
}

async function save(): Promise<void> {
  if (!tauri) return;
  saving.value = true;
  error.value = null;
  success.value = false;
  try {
    await invoke<AppSettings>("save_settings", {
      browserExecutablePath: browserExecutablePath.value.trim() || null,
      openaiApiKey: apiKey.value.trim() || null,
      openaiBaseUrl: baseUrl.value.trim() || null,
      openaiModel: model.value.trim() || null,
      openaiApiMode: apiMode.value,
    });
    success.value = true;
    setTimeout(() => { success.value = false; }, 2000);
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e);
  } finally {
    saving.value = false;
  }
}

onMounted(() => {
  void loadSettings();
});
</script>

<template>
  <section class="space-y-6">
    <header class="space-y-1">
      <h1 class="text-xl font-semibold text-content-primary">设置</h1>
      <p class="text-sm text-content-secondary">浏览器路径、OpenAI API 配置。</p>
    </header>

    <div
      v-if="!tauri"
      class="ui-status-warning p-4 text-sm"
    >
      当前是浏览器模式（非 Tauri）。设置不可用。
    </div>

    <!-- Browser Config -->
    <div class="space-y-3">
      <div class="text-[10px] font-semibold uppercase tracking-[0.24em] text-content-muted">浏览器</div>
      <div class="ui-panel-muted p-5">
        <label class="block space-y-1">
          <div class="text-xs font-medium text-content-muted">浏览器路径（用于 Puppeteer）</div>
          <input
            v-model="browserExecutablePath"
            class="ui-input w-full"
            placeholder="C:\Program Files\Google\Chrome\Application\chrome.exe"
          />
          <div class="text-xs text-content-muted">
            默认会给出 Windows 下 Chrome 的常见路径；如果你用 Edge，请改成 msedge.exe 的路径。
          </div>
        </label>
      </div>
    </div>

    <!-- OpenAI API Config -->
    <div class="space-y-3">
      <div class="text-[10px] font-semibold uppercase tracking-[0.24em] text-content-muted">OpenAI API</div>

      <div class="ui-panel-muted grid gap-4 p-5 md:grid-cols-2">
        <label class="block space-y-1">
          <div class="text-xs font-medium text-content-muted">API Key（可选，留空则用环境变量）</div>
          <input
            v-model="apiKey"
            type="password"
            class="ui-input w-full"
            placeholder="OPENAI_API_KEY"
          />
          <div class="text-xs text-content-muted">
            注意：保存会把 API Key 明文写入 <code>data/settings.json</code>。
          </div>
        </label>

        <label class="block space-y-1">
          <div class="text-xs font-medium text-content-muted">Base URL（可选）</div>
          <input
            v-model="baseUrl"
            class="ui-input w-full"
            placeholder="例如：https://api.openai.com/v1"
          />
        </label>

        <label class="block space-y-1 md:col-span-2">
          <div class="text-xs font-medium text-content-muted">API 接口（可选）</div>
          <UiSelect v-model="apiMode">
            <option value="chat_completions">Chat Completions（/v1/chat/completions）</option>
            <option value="responses">Responses（/v1/responses）</option>
          </UiSelect>
          <div class="text-xs text-content-muted">
            建议默认使用 Chat Completions；当你的服务端支持 OpenAI Responses API 时再切换到 Responses。
          </div>
        </label>

        <!-- Model dropdown with load button -->
        <div class="block space-y-1 md:col-span-2">
          <div class="text-xs font-medium text-content-muted">Model（可选）</div>
          <div class="flex items-center gap-2">
            <div class="flex-1">
              <UiSelect v-if="models.length > 0" v-model="model">
                <option value="">不指定（使用默认）</option>
                <option v-for="m in models" :key="m.id" :value="m.id">
                  {{ m.id }}
                </option>
              </UiSelect>
              <input
                v-else
                v-model="model"
                class="ui-input w-full"
                placeholder="点击右侧按钮加载模型列表，或手动输入模型名"
              />
            </div>
            <button
              class="ui-btn-secondary shrink-0"
              :disabled="!tauri || modelsLoading"
              @click="loadModels"
            >
              {{ modelsLoading ? "加载中…" : "加载模型" }}
            </button>
          </div>
          <div v-if="models.length > 0" class="ui-badge mt-1">
            已加载 {{ models.length }} 个模型
          </div>
        </div>
      </div>
    </div>

    <!-- Save button -->
    <div class="flex flex-wrap items-center gap-3">
      <button
        class="ui-btn-primary"
        :disabled="!tauri || saving"
        @click="save"
      >
        {{ saving ? "保存中…" : "保存设置" }}
      </button>
      <span v-if="success" class="ui-badge bg-emerald-400/10 text-emerald-300 ring-emerald-400/20">保存成功</span>
    </div>

    <div
      v-if="error"
      class="ui-status-danger p-4 text-sm"
    >
      {{ error }}
    </div>
  </section>
</template>
