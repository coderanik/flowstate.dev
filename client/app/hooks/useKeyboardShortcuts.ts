"use client";

import { useEffect, useCallback } from "react";

interface ShortcutHandler {
  key: string;
  meta?: boolean;
  shift?: boolean;
  alt?: boolean;
  handler: () => void;
  preventDefault?: boolean;
}

export function useKeyboardShortcuts(shortcuts: ShortcutHandler[]) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      for (const shortcut of shortcuts) {
        const metaMatch = shortcut.meta ? event.metaKey || event.ctrlKey : !event.metaKey && !event.ctrlKey;
        const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;
        const altMatch = shortcut.alt ? event.altKey : !event.altKey;
        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();

        // Special case: space key might come as " " 
        const spaceMatch = shortcut.key === "Space" && event.code === "Space";

        if (metaMatch && shiftMatch && altMatch && (keyMatch || spaceMatch)) {
          if (shortcut.preventDefault !== false) {
            event.preventDefault();
          }
          shortcut.handler();
          return;
        }
      }
    },
    [shortcuts]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}

// Format shortcut for display
export function formatShortcut(key: string, meta?: boolean, shift?: boolean): string {
  const isMac = typeof navigator !== "undefined" && navigator.platform.includes("Mac");
  const parts: string[] = [];
  
  if (meta) parts.push(isMac ? "⌘" : "Ctrl");
  if (shift) parts.push(isMac ? "⇧" : "Shift");
  parts.push(key.toUpperCase());
  
  return parts.join("");
}
