"use client";

import { AIModel, AI_MODELS } from "@/app/lib/types";

interface TopBarProps {
  activeModel: AIModel;
  onModelChange: (model: AIModel) => void;
}

export function TopBar({ activeModel, onModelChange }: TopBarProps) {
  return (
    <header className="flex items-center justify-between h-12 px-4 border-b border-border bg-bg-secondary">
      {/* Left: Logo */}
      <div className="flex items-center gap-2">
        <span className="text-accent">&gt;</span>
        <span className="text-text-primary font-medium">flowstate.dev</span>
      </div>

      {/* Center: Workspace name (optional) */}
      <div className="hidden sm:block text-text-muted text-sm">
        workspace / deep-focus
      </div>

      {/* Right: Model switcher */}
      <div className="flex items-center gap-1">
        {AI_MODELS.slice(0, 3).map((model) => (
          <button
            key={model.id}
            onClick={() => onModelChange(model.id)}
            className={`
              px-3 py-1.5 text-sm transition-all duration-200 relative
              ${
                activeModel === model.id
                  ? "text-text-primary"
                  : "text-text-muted hover:text-text-secondary"
              }
            `}
          >
            {model.name}
            {activeModel === model.id && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4/5 h-0.5 bg-accent rounded-full" />
            )}
          </button>
        ))}
      </div>
    </header>
  );
}
