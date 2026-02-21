"use client";

import { useEffect, useState } from "react";
import { Mode, AIModel, AI_MODELS } from "@/app/lib/types";

interface StatusBarProps {
  mode: Mode;
  activeModel: AIModel;
  sessionStartTime: Date;
}

function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

const MODE_LABELS: Record<Mode, string> = {
  "deep-focus": "deep-focus",
  "late-night": "late-night",
  "hack": "hack-mode",
};

export function StatusBar({ mode, activeModel, sessionStartTime }: StatusBarProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Date.now() - sessionStartTime.getTime());
    }, 1000);

    return () => clearInterval(interval);
  }, [sessionStartTime]);

  const modelName = AI_MODELS.find((m) => m.id === activeModel)?.name || activeModel;

  return (
    <footer className="h-7 px-4 border-t border-border bg-bg-secondary flex items-center justify-between text-xs text-text-muted">
      {/* Left side: mode, model, timer */}
      <div className="flex items-center gap-4">
        <span className="text-accent">{MODE_LABELS[mode]}</span>
        <span className="text-text-secondary">·</span>
        <span>{modelName}</span>
        <span className="text-text-secondary">·</span>
        <span>{formatDuration(elapsed)}</span>
      </div>

      {/* Right side: shortcuts hint */}
      <div className="flex items-center gap-4">
        <span>
          <kbd className="text-text-secondary">⌘K</kbd> commands
        </span>
        <span>
          <kbd className="text-text-secondary">⌘/</kbd> help
        </span>
      </div>
    </footer>
  );
}
