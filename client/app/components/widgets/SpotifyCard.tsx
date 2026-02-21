"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  getSpotifyAuthUrl,
  getSpotifyStatus,
  getSpotifyNowPlaying,
  spotifyPlay,
  spotifyPause,
  spotifyNext,
  spotifyPrevious,
  spotifyDisconnect,
  type SpotifyTrack,
} from "@/app/lib/api";

/** Format milliseconds to mm:ss */
function formatMs(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

/** Spotify logo SVG */
function SpotifyLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
    </svg>
  );
}

export function SpotifyCard() {
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [track, setTrack] = useState<SpotifyTrack | null>(null);
  const [progressMs, setProgressMs] = useState(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Check connection status on mount
  useEffect(() => {
    getSpotifyStatus()
      .then((s) => {
        setConnected(s.connected);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Check URL params for OAuth redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("spotify") === "connected") {
      setConnected(true);
      // Clean up URL
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  // Poll now-playing when connected
  const fetchNowPlaying = useCallback(async () => {
    try {
      const data = await getSpotifyNowPlaying();
      if (data.playing && data.track) {
        setTrack(data.track);
        setIsPlaying(true);
        setProgressMs(data.track.progressMs);
      } else {
        setIsPlaying(false);
        if (!data.track) setTrack(null);
      }
    } catch {
      // Silently fail -- will retry on next poll
    }
  }, []);

  useEffect(() => {
    if (!connected) return;

    // Fetch immediately
    fetchNowPlaying();

    // Poll every 5s
    pollRef.current = setInterval(fetchNowPlaying, 5000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [connected, fetchNowPlaying]);

  // Tick progress locally every second when playing
  useEffect(() => {
    if (isPlaying && track) {
      tickRef.current = setInterval(() => {
        setProgressMs((prev) => Math.min(prev + 1000, track.durationMs));
      }, 1000);
    }

    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [isPlaying, track]);

  // Handlers
  const handleConnect = async () => {
    try {
      const { url } = await getSpotifyAuthUrl();
      window.location.href = url;
    } catch {
      // Server not running or Spotify not configured
    }
  };

  const handleDisconnect = async () => {
    await spotifyDisconnect();
    setConnected(false);
    setTrack(null);
    setIsPlaying(false);
  };

  const handlePlayPause = async () => {
    if (isPlaying) {
      await spotifyPause();
      setIsPlaying(false);
    } else {
      await spotifyPlay();
      setIsPlaying(true);
    }
  };

  const handleNext = async () => {
    await spotifyNext();
    // Fetch updated track after a short delay
    setTimeout(fetchNowPlaying, 300);
  };

  const handlePrevious = async () => {
    await spotifyPrevious();
    setTimeout(fetchNowPlaying, 300);
  };

  const progressPercent = track ? (progressMs / track.durationMs) * 100 : 0;

  // ─── Not connected state ───
  if (!connected) {
    return (
      <div className="bg-bg-secondary/60 backdrop-blur-md rounded-2xl p-4 border border-border/30 w-[200px]">
        <div className="flex items-center gap-2 mb-3">
          <SpotifyLogo className="w-4 h-4 text-[#1DB954]" />
          <span className="text-xs text-text-muted">Spotify</span>
        </div>

        <div className="text-center py-2">
          <p className="text-text-muted text-xs mb-3">Connect to see what&apos;s playing</p>
          <button
            onClick={handleConnect}
            disabled={loading}
            className="w-full py-1.5 px-3 rounded-full bg-[#1DB954] text-white text-xs font-medium hover:bg-[#1ed760] transition-colors disabled:opacity-50"
          >
            {loading ? "..." : "Connect Spotify"}
          </button>
        </div>
      </div>
    );
  }

  // ─── Connected but nothing playing ───
  if (!track) {
    return (
      <div className="bg-bg-secondary/60 backdrop-blur-md rounded-2xl p-4 border border-border/30 w-[200px]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <SpotifyLogo className="w-4 h-4 text-[#1DB954]" />
            <span className="text-xs text-text-muted">Spotify</span>
          </div>
          <button
            onClick={handleDisconnect}
            className="text-text-muted hover:text-text-secondary text-[10px] transition-colors"
          >
            Disconnect
          </button>
        </div>

        <div className="text-center py-4">
          <div className="w-10 h-10 rounded-lg bg-bg-tertiary flex items-center justify-center mx-auto mb-2">
            <svg className="w-5 h-5 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
          </div>
          <p className="text-text-muted text-xs">Nothing playing</p>
          <p className="text-text-muted text-[10px] mt-1">Play something on Spotify</p>
        </div>
      </div>
    );
  }

  // ─── Now playing ───
  return (
    <div className="bg-bg-secondary/60 backdrop-blur-md rounded-2xl p-4 border border-border/30 w-[200px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <SpotifyLogo className="w-4 h-4 text-[#1DB954]" />
          <span className="text-xs text-text-muted">
            {isPlaying ? "Now Playing" : "Paused"}
          </span>
        </div>
        <button
          onClick={handleDisconnect}
          className="text-text-muted hover:text-text-secondary text-[10px] transition-colors"
        >
          Disconnect
        </button>
      </div>

      {/* Track info */}
      <div className="flex gap-3 mb-3">
        {track.albumArt ? (
          <img
            src={track.albumArt}
            alt={track.album}
            className="w-12 h-12 rounded-lg object-cover shrink-0"
          />
        ) : (
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center shrink-0">
            <svg className="w-6 h-6 text-white/80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <a
            href={track.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-text-primary font-medium truncate text-sm block hover:underline"
          >
            {track.title}
          </a>
          <p className="text-text-secondary text-xs truncate">{track.artist}</p>
          <p className="text-text-muted text-xs truncate">{track.album}</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-3">
        <div className="h-1 bg-bg-tertiary rounded-full overflow-hidden">
          <div
            className="h-full bg-accent rounded-full transition-all duration-1000 linear"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-text-muted mt-1">
          <span>{formatMs(progressMs)}</span>
          <span>{formatMs(track.durationMs)}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={handlePrevious}
          className="text-text-secondary hover:text-text-primary transition-colors"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
          </svg>
        </button>
        <button
          onClick={handlePlayPause}
          className="w-10 h-10 rounded-full bg-text-primary flex items-center justify-center hover:scale-105 transition-transform"
        >
          {isPlaying ? (
            <svg className="w-5 h-5 text-bg-primary" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-bg-primary ml-0.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>
        <button
          onClick={handleNext}
          className="text-text-secondary hover:text-text-primary transition-colors"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
