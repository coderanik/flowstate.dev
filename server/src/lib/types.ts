// ─── Shared types between frontend and backend ───

export type AIModelId =
  | "chatgpt"
  | "claude"
  | "gemini"
  | "deepseek"
  | "mixtral"
  | "codellama"
  | "starcoder2"
  | "qwen-coder"
  | "phi3"
  | "llama3"
  | "mistral";

export type ProviderId = "openai" | "anthropic" | "google" | "deepseek" | "huggingface";

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ChatRequest {
  model: AIModelId;
  messages: ChatMessage[];
  stream?: boolean;
  /** Optional: if the preferred model is rate-limited, fall back to others */
  fallback?: boolean;
}

export interface ChatResponse {
  model: AIModelId;
  provider: ProviderId;
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

// ─── Provider config ───

export interface ProviderConfig {
  id: ProviderId;
  name: string;
  apiKey: string;
  baseUrl: string;
  models: ModelConfig[];
}

export interface ModelConfig {
  id: AIModelId;
  providerModelId: string; // e.g. "gpt-4o", "claude-sonnet-4-20250514"
  displayName: string;
  maxTokens: number;
}

// ─── Rate limiting ───

export interface RateLimitState {
  provider: ProviderId;
  remaining: number | null;
  limit: number | null;
  resetsAt: number | null; // unix timestamp ms
  retryAfter: number | null; // seconds
  lastUpdated: number;
}

// ─── Streaming ───

export interface StreamChunk {
  type: "content" | "done" | "error" | "info";
  content?: string;
  model?: AIModelId;
  provider?: ProviderId;
  error?: string;
  usage?: ChatResponse["usage"];
}
