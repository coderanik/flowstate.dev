import type { AIModel } from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface StreamChunk {
  type: "content" | "done" | "error" | "info";
  content?: string;
  model?: AIModel;
  provider?: string;
  error?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * Stream a chat response from the backend.
 * Calls the callback for each chunk of content received.
 */
export async function streamChat(
  model: AIModel,
  messages: ChatMessage[],
  onChunk: (chunk: StreamChunk) => void,
  options?: { fallback?: boolean; signal?: AbortSignal }
): Promise<void> {
  const response = await fetch(`${API_BASE}/api/chat/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      model,
      messages,
      fallback: options?.fallback ?? true,
    }),
    signal: options?.signal,
  });

  if (!response.ok) {
    const error = await response.text();
    onChunk({ type: "error", error: `Server error: ${error}` });
    return;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    onChunk({ type: "error", error: "No response stream" });
    return;
  }

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith("data: ")) continue;

      try {
        const chunk: StreamChunk = JSON.parse(trimmed.slice(6));
        onChunk(chunk);
      } catch {
        // Skip malformed SSE lines
      }
    }
  }
}

/**
 * Fetch available models and their status from the backend.
 */
export async function getModels(): Promise<{
  models: Array<{ id: AIModel; name: string; provider: string; available: boolean }>;
}> {
  const response = await fetch(`${API_BASE}/api/models`, { credentials: "include" });
  if (!response.ok) throw new Error("Failed to fetch models");
  return response.json();
}

/**
 * Submit an API key for a paid model. The key is validated and encrypted server-side.
 */
export async function submitApiKey(
  model: string,
  apiKey: string
): Promise<{ valid: boolean; error?: string }> {
  const response = await fetch(`${API_BASE}/api/keys`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ model, apiKey }),
  });

  const data = await response.json();
  return data;
}

/**
 * Check which paid providers have keys configured for this session.
 */
export async function getKeyStatus(): Promise<{
  configured: Record<string, boolean>;
  models: Array<{ model: string; provider: string; hasKey: boolean }>;
}> {
  const response = await fetch(`${API_BASE}/api/keys/status`, {
    credentials: "include",
  });
  if (!response.ok) throw new Error("Failed to fetch key status");
  return response.json();
}

/**
 * Run code via server (Piston API) for Python, Java, C, C++.
 */
export async function runCode(
  language: "python" | "java" | "c" | "cpp",
  code: string
): Promise<{
  outputLines: string[];
  error: string | null;
  errorType: string | null;
}> {
  const response = await fetch(`${API_BASE}/api/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ language, code }),
  });
  const data = await response.json();
  if (!response.ok) {
    return {
      outputLines: [],
      error: data.error ?? "Request failed",
      errorType: data.errorType ?? "RequestError",
    };
  }
  return {
    outputLines: data.outputLines ?? [],
    error: data.error ?? null,
    errorType: data.errorType ?? null,
  };
}

/**
 * Health check -- verify the server is running.
 */
export async function healthCheck(): Promise<{
  status: string;
  providers: number;
  models: Array<{ id: string; name: string; available: boolean }>;
}> {
  const response = await fetch(`${API_BASE}/api/health`);
  if (!response.ok) throw new Error("Server unavailable");
  return response.json();
}

// ─── Spotify ───

export interface SpotifyTrack {
  title: string;
  artist: string;
  album: string;
  albumArt: string | null;
  durationMs: number;
  progressMs: number;
  url: string;
}

export interface NowPlayingResponse {
  playing: boolean;
  track?: SpotifyTrack;
}

/** Get the Spotify OAuth URL to connect */
export async function getSpotifyAuthUrl(): Promise<{ url: string }> {
  const response = await fetch(`${API_BASE}/api/spotify/auth`, { credentials: "include" });
  if (!response.ok) throw new Error("Failed to get Spotify auth URL");
  return response.json();
}

/** Check if Spotify is connected for this session */
export async function getSpotifyStatus(): Promise<{ connected: boolean }> {
  const response = await fetch(`${API_BASE}/api/spotify/status`, { credentials: "include" });
  if (!response.ok) return { connected: false };
  return response.json();
}

/** Get currently playing track */
export async function getSpotifyNowPlaying(): Promise<NowPlayingResponse> {
  const response = await fetch(`${API_BASE}/api/spotify/now-playing`, { credentials: "include" });
  if (!response.ok) return { playing: false };
  return response.json();
}

/** Resume playback */
export async function spotifyPlay(): Promise<void> {
  await fetch(`${API_BASE}/api/spotify/play`, { method: "POST", credentials: "include" });
}

/** Pause playback */
export async function spotifyPause(): Promise<void> {
  await fetch(`${API_BASE}/api/spotify/pause`, { method: "POST", credentials: "include" });
}

/** Skip to next track */
export async function spotifyNext(): Promise<void> {
  await fetch(`${API_BASE}/api/spotify/next`, { method: "POST", credentials: "include" });
}

/** Skip to previous track */
export async function spotifyPrevious(): Promise<void> {
  await fetch(`${API_BASE}/api/spotify/previous`, { method: "POST", credentials: "include" });
}

/** Disconnect Spotify */
export async function spotifyDisconnect(): Promise<void> {
  await fetch(`${API_BASE}/api/spotify/disconnect`, { method: "POST", credentials: "include" });
}
