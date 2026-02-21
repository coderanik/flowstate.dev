"use client";

import { useEffect, useState } from "react";
import { Mode, AIModel, AI_MODELS } from "@/app/lib/types";

interface MenuBarProps {
  mode: Mode;
  activeModel: AIModel;
  sessionStartTime: Date;
  onCommandPalette: () => void;
}

function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h${remainingMinutes}m`;
}

const MODE_LABELS: Record<Mode, string> = {
  "deep-focus": "deep-focus",
  "late-night": "late-night",
  hack: "hack",
};

export function MenuBar({
  mode,
  activeModel,
  sessionStartTime,
  onCommandPalette,
}: MenuBarProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Date.now() - sessionStartTime.getTime());
    }, 1000);
    return () => clearInterval(interval);
  }, [sessionStartTime]);

  const modelName =
    activeModel === "none"
      ? "No model"
      : AI_MODELS.find((m) => m.id === activeModel)?.name || activeModel;

  return (
    <header className="h-7 px-3 sm:px-4 flex items-center justify-between text-xs bg-bg-secondary/80 backdrop-blur-md border-b border-border/50 shrink-0">
      {/* Left: App name */}
      <div className="flex items-center gap-3">
        <span className="text-text-primary font-medium">flowstate.dev</span>
      </div>

      {/* Right: Status items — hide less-important items on small screens */}
      <div className="flex items-center gap-2 sm:gap-4 text-text-muted">
        <span className="text-accent">{MODE_LABELS[mode]}</span>
        {/* Model name: hide on very small mobile */}
        <span className="text-text-secondary hidden xs:inline sm:inline">{modelName}</span>
        {/* Duration: always show */}
        <span>{formatDuration(elapsed)}</span>
        <button
          onClick={onCommandPalette}
          className="flex items-center gap-1 hover:text-text-primary transition-colors"
        >
          <kbd className="text-[10px] bg-bg-tertiary px-1 py-0.5 rounded">⌘K</kbd>
        </button>
      </div>
    </header>
  );
}
