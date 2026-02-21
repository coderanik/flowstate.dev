import { Router, type Response } from "express";
import type { SessionRequest } from "../middleware/session.js";
import type { SpotifyStore } from "../lib/spotify-store.js";

const SPOTIFY_AUTH_URL = "https://accounts.spotify.com/authorize";
const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token";
const SPOTIFY_API = "https://api.spotify.com/v1";

const SCOPES = [
  "user-read-currently-playing",
  "user-read-playback-state",
  "user-modify-playback-state",
].join(" ");

export function createSpotifyRouter(spotifyStore: SpotifyStore): Router {
  const router = Router();

  const clientId = process.env.SPOTIFY_CLIENT_ID || "";
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET || "";
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI || "http://localhost:3001/api/spotify/callback";
  const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";

  /**
   * GET /api/spotify/auth
   * Returns the Spotify OAuth URL to redirect the user to.
   */
  router.get("/auth", (req, res: Response) => {
    if (!clientId) {
      res.status(500).json({ error: "Spotify not configured. Add SPOTIFY_CLIENT_ID to .env" });
      return;
    }

    const { sessionId } = req as SessionRequest;

    const params = new URLSearchParams({
      client_id: clientId,
      response_type: "code",
      redirect_uri: redirectUri,
      scope: SCOPES,
      state: sessionId, // use session ID as state for CSRF protection
      show_dialog: "true",
    });

    res.json({ url: `${SPOTIFY_AUTH_URL}?${params.toString()}` });
  });

  /**
   * GET /api/spotify/callback
   * Handles the OAuth callback from Spotify.
   * Exchanges the code for tokens and stores them.
   */
  router.get("/callback", async (req, res: Response) => {
    const code = req.query.code as string;
    const state = req.query.state as string;
    const error = req.query.error as string;

    if (error) {
      res.redirect(`${clientUrl}?spotify_error=${error}`);
      return;
    }

    if (!code || !state) {
      res.redirect(`${clientUrl}?spotify_error=missing_params`);
      return;
    }

    try {
      // Exchange code for tokens
      const tokenResponse = await fetch(SPOTIFY_TOKEN_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: redirectUri,
        }),
      });

      if (!tokenResponse.ok) {
        const err = await tokenResponse.text();
        console.error("[spotify] Token exchange failed:", err);
        res.redirect(`${clientUrl}?spotify_error=token_failed`);
        return;
      }

      const tokens = (await tokenResponse.json()) as {
        access_token: string;
        refresh_token: string;
        expires_in: number;
      };

      // Store encrypted tokens for this session
      spotifyStore.setTokens(state, tokens.access_token, tokens.refresh_token, tokens.expires_in);
      console.log(`[spotify] ✓ Connected (session: ${state.slice(0, 8)}...)`);

      // Redirect back to client
      res.redirect(`${clientUrl}?spotify=connected`);
    } catch (err) {
      console.error("[spotify] Callback error:", (err as Error).message);
      res.redirect(`${clientUrl}?spotify_error=server_error`);
    }
  });

  /**
   * Refresh access token if expired.
   */
  async function ensureFreshToken(sessionId: string): Promise<string | null> {
    if (!spotifyStore.isExpired(sessionId)) {
      return spotifyStore.getAccessToken(sessionId);
    }

    const refreshToken = spotifyStore.getRefreshToken(sessionId);
    if (!refreshToken) return null;

    try {
      const response = await fetch(SPOTIFY_TOKEN_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
        },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: refreshToken,
        }),
      });

      if (!response.ok) return null;

      const data = (await response.json()) as {
        access_token: string;
        refresh_token?: string;
        expires_in: number;
      };

      spotifyStore.setTokens(
        sessionId,
        data.access_token,
        data.refresh_token || refreshToken,
        data.expires_in
      );

      return data.access_token;
    } catch {
      return null;
    }
  }

  /**
   * GET /api/spotify/status
   * Returns whether Spotify is connected for this session.
   */
  router.get("/status", (req, res: Response) => {
    const { sessionId } = req as SessionRequest;
    res.json({ connected: spotifyStore.isConnected(sessionId) });
  });

  /**
   * GET /api/spotify/now-playing
   * Returns the currently playing track.
   */
  router.get("/now-playing", async (req, res: Response) => {
    const { sessionId } = req as SessionRequest;
    const token = await ensureFreshToken(sessionId);

    if (!token) {
      res.status(401).json({ error: "Not connected to Spotify" });
      return;
    }

    try {
      const response = await fetch(`${SPOTIFY_API}/me/player/currently-playing`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // 204 = nothing playing
      if (response.status === 204) {
        res.json({ playing: false });
        return;
      }

      if (!response.ok) {
        res.status(response.status).json({ error: "Spotify API error" });
        return;
      }

      const data = (await response.json()) as {
        is_playing: boolean;
        progress_ms: number;
        item?: {
          name: string;
          artists: Array<{ name: string }>;
          album: { name: string; images: Array<{ url: string; width: number }> };
          duration_ms: number;
          external_urls: { spotify: string };
        };
      };

      if (!data.item) {
        res.json({ playing: false });
        return;
      }

      res.json({
        playing: data.is_playing,
        track: {
          title: data.item.name,
          artist: data.item.artists.map((a) => a.name).join(", "),
          album: data.item.album.name,
          albumArt: data.item.album.images.find((i) => i.width <= 300)?.url
            || data.item.album.images[0]?.url
            || null,
          durationMs: data.item.duration_ms,
          progressMs: data.progress_ms,
          url: data.item.external_urls.spotify,
        },
      });
    } catch (err) {
      console.error("[spotify] now-playing error:", (err as Error).message);
      res.status(500).json({ error: "Failed to fetch playback" });
    }
  });

  /**
   * POST /api/spotify/play
   */
  router.post("/play", async (req, res: Response) => {
    const { sessionId } = req as SessionRequest;
    const token = await ensureFreshToken(sessionId);
    if (!token) { res.status(401).json({ error: "Not connected" }); return; }

    const response = await fetch(`${SPOTIFY_API}/me/player/play`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
    });

    res.json({ ok: response.ok || response.status === 204 });
  });

  /**
   * POST /api/spotify/pause
   */
  router.post("/pause", async (req, res: Response) => {
    const { sessionId } = req as SessionRequest;
    const token = await ensureFreshToken(sessionId);
    if (!token) { res.status(401).json({ error: "Not connected" }); return; }

    const response = await fetch(`${SPOTIFY_API}/me/player/pause`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
    });

    res.json({ ok: response.ok || response.status === 204 });
  });

  /**
   * POST /api/spotify/next
   */
  router.post("/next", async (req, res: Response) => {
    const { sessionId } = req as SessionRequest;
    const token = await ensureFreshToken(sessionId);
    if (!token) { res.status(401).json({ error: "Not connected" }); return; }

    const response = await fetch(`${SPOTIFY_API}/me/player/next`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });

    res.json({ ok: response.ok || response.status === 204 });
  });

  /**
   * POST /api/spotify/previous
   */
  router.post("/previous", async (req, res: Response) => {
    const { sessionId } = req as SessionRequest;
    const token = await ensureFreshToken(sessionId);
    if (!token) { res.status(401).json({ error: "Not connected" }); return; }

    const response = await fetch(`${SPOTIFY_API}/me/player/previous`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });

    res.json({ ok: response.ok || response.status === 204 });
  });

  /**
   * POST /api/spotify/disconnect
   */
  router.post("/disconnect", (req, res: Response) => {
    const { sessionId } = req as SessionRequest;
    spotifyStore.disconnect(sessionId);
    res.json({ disconnected: true });
  });

  return router;
}
