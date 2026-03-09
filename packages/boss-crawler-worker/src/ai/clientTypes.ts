export type ChatCompletionResponse = {
  choices?: Array<{ message?: { content?: string } }>;
  error?: { message?: string };
};

export type ResponsesError = { message?: string };

export type ResponsesOutputContent = {
  type?: string;
  text?: string;
};

export type ResponsesOutputItem = {
  type?: string;
  role?: string;
  content?: ResponsesOutputContent[];
};

export type ResponsesResponse = {
  output_text?: string;
  output?: ResponsesOutputItem[];
  error?: ResponsesError | string | null;
};

export type OpenAiClientOptions = {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  apiMode?: "chat_completions" | "responses";
  signal?: AbortSignal;
  temperature?: number;
};

export type OpenAiDebugOptions = {
  enabled?: boolean;
  runId?: string;
  log?: (message: string) => void;
  traceDir?: string;
  maxPreviewChars?: number;
  includePromptPreview?: boolean;
};

export type OpenAiRequestOptions = {
  apiKey: string;
  baseUrl: string;
  model: string;
  temperature: number;
  systemPrompt: string;
  userPrompt: string;
  signal?: AbortSignal;
  debug?: OpenAiDebugOptions;
};
