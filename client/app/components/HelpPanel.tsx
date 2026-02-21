"use client";

import { PROMPT_PRESETS } from "@/app/lib/types";

interface HelpPanelProps {
  isOpen: boolean;
  onInjectPrompt: (prompt: string) => void;
  apiKeyStatus?: "configured" | "missing";
}

const SHORTCUTS = [
  { keys: "⌘K", action: "Command palette" },
  { keys: "⌘B", action: "Toggle sidebar" },
  { keys: "⌘/", action: "Toggle help" },
  { keys: "⌘1", action: "Switch to ChatGPT" },
  { keys: "⌘2", action: "Switch to Claude" },
  { keys: "⌘3", action: "Switch to Gemini" },
  { keys: "Esc", action: "Clear input" },
  { keys: "Enter", action: "Send prompt" },
  { keys: "↑/↓", action: "History navigation" },
];

export function HelpPanel({ isOpen, onInjectPrompt, apiKeyStatus = "missing" }: HelpPanelProps) {
  if (!isOpen) return null;

  return (
    <aside className="w-64 border-l border-border bg-bg-secondary flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto py-4">
        {/* Prompts section */}
        <div className="mb-6">
          <h3 className="px-4 mb-3 text-xs font-medium text-text-muted tracking-wider">
            PROMPTS
          </h3>
          <ul>
            {PROMPT_PRESETS.map((preset) => (
              <li key={preset.id}>
                <button
                  onClick={() => onInjectPrompt(preset.prompt + " ")}
                  className="
                    w-full text-left px-4 py-1.5 text-sm
                    text-text-secondary hover:text-text-primary hover:underline
                    transition-colors duration-150
                  "
                >
                  <span className="mr-2 text-text-muted">├─</span>
                  {preset.label}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Shortcuts section */}
        <div className="mb-6">
          <h3 className="px-4 mb-3 text-xs font-medium text-text-muted tracking-wider">
            SHORTCUTS
          </h3>
          <ul className="space-y-1">
            {SHORTCUTS.map((shortcut) => (
              <li
                key={shortcut.keys}
                className="px-4 py-1 flex items-center justify-between text-sm"
              >
                <span className="text-text-muted">{shortcut.action}</span>
                <kbd className="text-xs text-text-secondary bg-bg-tertiary px-1.5 py-0.5 rounded">
                  {shortcut.keys}
                </kbd>
              </li>
            ))}
          </ul>
        </div>

        {/* API Key status */}
        <div>
          <h3 className="px-4 mb-3 text-xs font-medium text-text-muted tracking-wider">
            STATUS
          </h3>
          <div className="px-4 text-sm">
            <span className="text-text-muted">API Key: </span>
            <span
              className={
                apiKeyStatus === "configured"
                  ? "text-success"
                  : "text-warning"
              }
            >
              {apiKeyStatus}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}
