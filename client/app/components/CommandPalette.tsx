"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Command } from "@/app/lib/types";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  commands: Command[];
}

export function CommandPalette({ isOpen, onClose, commands }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredCommands = useMemo(() => {
    if (!query.trim()) return commands;
    const lower = query.toLowerCase();
    return commands.filter(
      (cmd) =>
        cmd.label.toLowerCase().includes(lower) ||
        cmd.category?.toLowerCase().includes(lower)
    );
  }, [commands, query]);

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [isOpen]);

  // Keep selection in bounds
  useEffect(() => {
    if (selectedIndex >= filteredCommands.length) {
      setSelectedIndex(Math.max(0, filteredCommands.length - 1));
    }
  }, [filteredCommands.length, selectedIndex]);

  const executeCommand = (command: Command) => {
    command.action();
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, filteredCommands.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          executeCommand(filteredCommands[selectedIndex]);
        }
        break;
      case "Escape":
        e.preventDefault();
        onClose();
        break;
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] sm:pt-[15vh] px-3 sm:px-0"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Palette */}
      <div
        className="relative w-full max-w-lg bg-bg-secondary border border-border rounded-xl shadow-2xl overflow-hidden mx-2 sm:mx-0"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <svg
            className="w-5 h-5 text-text-muted"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search commands..."
            className="flex-1 bg-transparent outline-none text-text-primary placeholder:text-text-muted"
            spellCheck={false}
            autoComplete="off"
          />
          <kbd className="text-[10px] text-text-muted bg-bg-tertiary px-1.5 py-0.5 rounded">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-72 overflow-y-auto py-2">
          {filteredCommands.length === 0 ? (
            <div className="px-4 py-3 text-text-muted text-sm">
              No commands found
            </div>
          ) : (
            filteredCommands.map((command, index) => (
              <button
                key={command.id}
                onClick={() => executeCommand(command)}
                onMouseEnter={() => setSelectedIndex(index)}
                className={`
                  w-full px-4 py-2 flex items-center justify-between text-left text-sm
                  transition-colors duration-75
                  ${
                    index === selectedIndex
                      ? "bg-bg-hover text-text-primary"
                      : "text-text-secondary hover:text-text-primary"
                  }
                `}
              >
                <span className="flex items-center gap-3">
                  {command.category && (
                    <span className="text-text-muted text-xs w-12">
                      {command.category}
                    </span>
                  )}
                  <span>{command.label}</span>
                </span>
                {command.shortcut && (
                  <kbd className="text-xs text-text-muted bg-bg-tertiary px-1.5 py-0.5 rounded">
                    {command.shortcut}
                  </kbd>
                )}
              </button>
            ))
          )}
        </div>

        {/* Footer hint */}
        <div className="px-4 py-2 border-t border-border flex items-center justify-between text-[10px] text-text-muted">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="bg-bg-tertiary px-1 py-0.5 rounded">↑</kbd>
              <kbd className="bg-bg-tertiary px-1 py-0.5 rounded">↓</kbd>
              <span>navigate</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="bg-bg-tertiary px-1 py-0.5 rounded">↵</kbd>
              <span>select</span>
            </span>
          </div>
          <div className="flex items-center gap-1">
            <kbd className="bg-bg-tertiary px-1 py-0.5 rounded">⌘</kbd>
            <kbd className="bg-bg-tertiary px-1 py-0.5 rounded">⌥</kbd>
            <kbd className="bg-bg-tertiary px-1 py-0.5 rounded">Space</kbd>
            <span>or</span>
            <kbd className="bg-bg-tertiary px-1 py-0.5 rounded">⌘</kbd>
            <kbd className="bg-bg-tertiary px-1 py-0.5 rounded">K</kbd>
            <span>to open</span>
          </div>
        </div>
      </div>
    </div>
  );
}
