import { encrypt, decrypt } from "./crypto.js";

interface SpotifyTokens {
  accessTokenEnc: string;
  refreshTokenEnc: string;
  expiresAt: number; // unix ms
}

/**
 * Encrypted in-memory store for Spotify OAuth tokens per session.
 * Access + refresh tokens are AES-256-GCM encrypted at rest.
 */
export class SpotifyStore {
  private store = new Map<string, SpotifyTokens>();

  setTokens(sessionId: string, accessToken: string, refreshToken: string, expiresIn: number): void {
    this.store.set(sessionId, {
      accessTokenEnc: encrypt(accessToken),
      refreshTokenEnc: encrypt(refreshToken),
      expiresAt: Date.now() + expiresIn * 1000,
    });
  }

  getAccessToken(sessionId: string): string | null {
    const entry = this.store.get(sessionId);
    if (!entry) return null;

    try {
      return decrypt(entry.accessTokenEnc);
    } catch {
      this.store.delete(sessionId);
      return null;
    }
  }

  getRefreshToken(sessionId: string): string | null {
    const entry = this.store.get(sessionId);
    if (!entry) return null;

    try {
      return decrypt(entry.refreshTokenEnc);
    } catch {
      this.store.delete(sessionId);
      return null;
    }
  }

  isExpired(sessionId: string): boolean {
    const entry = this.store.get(sessionId);
    if (!entry) return true;
    // Refresh 60s before actual expiry
    return Date.now() >= entry.expiresAt - 60_000;
  }

  isConnected(sessionId: string): boolean {
    return this.store.has(sessionId);
  }

  disconnect(sessionId: string): void {
    this.store.delete(sessionId);
  }
}
