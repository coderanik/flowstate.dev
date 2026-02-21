import type { ProviderId, RateLimitState } from "./types.js";
import type { RateLimitHeaders } from "../providers/base.js";

/**
 * Tracks rate limit state for each AI provider.
 * Updated from response headers after every API call.
 */
export class RateLimitTracker {
  private state: Map<ProviderId, RateLimitState> = new Map();

  /** Update state from response headers */
  update(provider: ProviderId, headers: RateLimitHeaders): void {
    const current = this.state.get(provider);

    this.state.set(provider, {
      provider,
      remaining: headers.remaining ?? current?.remaining ?? null,
      limit: headers.limit ?? current?.limit ?? null,
      resetsAt: headers.resetsAt ?? current?.resetsAt ?? null,
      retryAfter: headers.retryAfter ?? current?.retryAfter ?? null,
      lastUpdated: Date.now(),
    });
  }

  /** Mark a provider as rate-limited (e.g. after a 429 response) */
  markLimited(provider: ProviderId, retryAfterSeconds?: number): void {
    const retryAfter = retryAfterSeconds ?? 60; // default 60s cooldown
    this.state.set(provider, {
      provider,
      remaining: 0,
      limit: this.state.get(provider)?.limit ?? null,
      resetsAt: Date.now() + retryAfter * 1000,
      retryAfter,
      lastUpdated: Date.now(),
    });
  }

  /** Check if a provider is currently available (not rate-limited) */
  isAvailable(provider: ProviderId): boolean {
    const s = this.state.get(provider);
    if (!s) return true; // no data yet, assume available

    // If we know remaining is 0, check if reset time has passed
    if (s.remaining !== null && s.remaining <= 0) {
      if (s.resetsAt && Date.now() >= s.resetsAt) {
        // Reset time has passed, clear the state
        this.state.delete(provider);
        return true;
      }
      return false;
    }

    return true;
  }

  /** Get time until a provider resets (ms), or 0 if available */
  getWaitTime(provider: ProviderId): number {
    const s = this.state.get(provider);
    if (!s || this.isAvailable(provider)) return 0;

    if (s.resetsAt) {
      return Math.max(0, s.resetsAt - Date.now());
    }

    if (s.retryAfter) {
      const elapsed = Date.now() - s.lastUpdated;
      return Math.max(0, s.retryAfter * 1000 - elapsed);
    }

    return 60_000; // fallback: wait 60s
  }

  /** Get status for all tracked providers */
  getStatus(): Record<ProviderId, { available: boolean; waitMs: number; remaining: number | null }> {
    const result: Record<string, { available: boolean; waitMs: number; remaining: number | null }> = {};

    for (const [id, state] of this.state) {
      result[id] = {
        available: this.isAvailable(id),
        waitMs: this.getWaitTime(id),
        remaining: state.remaining,
      };
    }

    return result as Record<ProviderId, { available: boolean; waitMs: number; remaining: number | null }>;
  }
}
