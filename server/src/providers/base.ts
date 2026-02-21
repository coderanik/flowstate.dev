import type { ChatMessage, ProviderId, AIModelId, StreamChunk } from "../lib/types.js";

/**
 * Abstract base class for all AI providers.
 * Each provider implements streaming and non-streaming chat.
 */
export abstract class BaseProvider {
  abstract id: ProviderId;
  abstract name: string;

  protected apiKey: string;
  protected baseUrl: string;

  constructor(apiKey: string, baseUrl: string) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  /** Check if this provider is configured (has an API key) */
  isConfigured(): boolean {
    return this.apiKey.length > 0;
  }

  /**
   * Send a chat request and stream back chunks via a callback.
   * Returns rate limit headers from the response.
   */
  abstract streamChat(
    modelId: string,
    messages: ChatMessage[],
    onChunk: (chunk: StreamChunk) => void,
    signal?: AbortSignal
  ): Promise<RateLimitHeaders>;

  /**
   * Send a non-streaming chat request.
   */
  abstract chat(
    modelId: string,
    messages: ChatMessage[],
    signal?: AbortSignal
  ): Promise<{ content: string; usage?: { promptTokens: number; completionTokens: number; totalTokens: number }; rateLimitHeaders: RateLimitHeaders }>;
}

export interface RateLimitHeaders {
  remaining: number | null;
  limit: number | null;
  resetsAt: number | null;
  retryAfter: number | null;
}

/** Parse common rate limit headers from a fetch Response */
export function parseRateLimitHeaders(headers: Headers): RateLimitHeaders {
  const remaining =
    headers.get("x-ratelimit-remaining-requests") ??
    headers.get("x-ratelimit-remaining") ??
    headers.get("x-ratelimit-remaining-tokens");
  const limit =
    headers.get("x-ratelimit-limit-requests") ??
    headers.get("x-ratelimit-limit");
  const reset =
    headers.get("x-ratelimit-reset-requests") ??
    headers.get("x-ratelimit-reset");
  const retryAfter = headers.get("retry-after");

  return {
    remaining: remaining ? parseInt(remaining, 10) : null,
    limit: limit ? parseInt(limit, 10) : null,
    resetsAt: reset ? parseResetTime(reset) : null,
    retryAfter: retryAfter ? parseFloat(retryAfter) : null,
  };
}

/** Parse reset time -- could be a unix timestamp, ISO date, or relative seconds */
function parseResetTime(value: string): number | null {
  // If it's a number, treat as unix timestamp (seconds)
  const num = Number(value);
  if (!isNaN(num)) {
    // If it's a small number, it's relative seconds; if large, it's unix timestamp
    if (num < 1e9) {
      return Date.now() + num * 1000;
    }
    return num * 1000; // convert to ms
  }

  // Try parsing as duration string like "6m0s" or "1s"
  const durationMatch = value.match(/(?:(\d+)h)?(?:(\d+)m)?(?:(\d+(?:\.\d+)?)s)?/);
  if (durationMatch) {
    const hours = parseInt(durationMatch[1] || "0", 10);
    const minutes = parseInt(durationMatch[2] || "0", 10);
    const seconds = parseFloat(durationMatch[3] || "0");
    const totalMs = (hours * 3600 + minutes * 60 + seconds) * 1000;
    if (totalMs > 0) return Date.now() + totalMs;
  }

  // Try ISO date
  const date = new Date(value);
  if (!isNaN(date.getTime())) {
    return date.getTime();
  }

  return null;
}
