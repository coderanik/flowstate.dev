import { encrypt, decrypt } from "./crypto.js";
import type { ProviderId } from "./types.js";

/** Paid providers that require user-supplied API keys */
export const PAID_PROVIDERS: ProviderId[] = ["openai", "anthropic", "deepseek"];

/** Free providers with server-side keys */
export const FREE_PROVIDERS: ProviderId[] = ["google", "huggingface"];

interface EncryptedKey {
  /** AES-256-GCM encrypted API key */
  encrypted: string;
  /** Provider this key belongs to */
  provider: ProviderId;
  /** When the key was stored */
  storedAt: number;
}

/**
 * Encrypted in-memory store for user API keys.
 * Keys are:
 * - Encrypted at rest using AES-256-GCM
 * - Keyed by session ID + provider
 * - Never logged, never returned via API
 * - Lost on server restart (ephemeral by design)
 */
export class KeyStore {
  /** Map<sessionId, Map<providerId, EncryptedKey>> */
  private store = new Map<string, Map<ProviderId, EncryptedKey>>();

  /** Store an encrypted API key for a session + provider */
  setKey(sessionId: string, provider: ProviderId, apiKey: string): void {
    if (!this.store.has(sessionId)) {
      this.store.set(sessionId, new Map());
    }

    const sessionKeys = this.store.get(sessionId)!;
    sessionKeys.set(provider, {
      encrypted: encrypt(apiKey),
      provider,
      storedAt: Date.now(),
    });
  }

  /** Retrieve and decrypt an API key. Returns null if not found. */
  getKey(sessionId: string, provider: ProviderId): string | null {
    const sessionKeys = this.store.get(sessionId);
    if (!sessionKeys) return null;

    const entry = sessionKeys.get(provider);
    if (!entry) return null;

    try {
      return decrypt(entry.encrypted);
    } catch {
      // Decryption failed -- key corrupted or encryption secret changed
      sessionKeys.delete(provider);
      return null;
    }
  }

  /** Check which providers have keys stored for a session */
  getStatus(sessionId: string): Record<string, boolean> {
    const sessionKeys = this.store.get(sessionId);
    const status: Record<string, boolean> = {};

    for (const provider of PAID_PROVIDERS) {
      status[provider] = sessionKeys?.has(provider) ?? false;
    }

    return status;
  }

  /** Remove a key for a session + provider */
  removeKey(sessionId: string, provider: ProviderId): void {
    this.store.get(sessionId)?.delete(provider);
  }

  /** Remove all keys for a session */
  clearSession(sessionId: string): void {
    this.store.delete(sessionId);
  }

  /** Check if a provider requires a user key */
  isPaidProvider(provider: ProviderId): boolean {
    return PAID_PROVIDERS.includes(provider);
  }
}
