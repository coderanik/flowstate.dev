"use client";

import { Provider } from "react-redux";
import { store } from "./index";
import { useEffect } from "react";
import { hydrate } from "./workspaceSlice";
import { hydrateSettings } from "./settingsSlice";

const STORAGE_KEY = "flowstate-workspace";
const SETTINGS_KEY = "flowstate-settings";

function PersistGate({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Load workspace from localStorage on mount
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        store.dispatch(
          hydrate({
            mode: parsed.mode,
            activeModel: parsed.activeModel,
            activeTool: parsed.activeTool,
          })
        );
      }
    } catch {
      // Ignore parse errors
    }

    // Load settings from localStorage
    try {
      const storedSettings = localStorage.getItem(SETTINGS_KEY);
      if (storedSettings) {
        const parsed = JSON.parse(storedSettings);
        store.dispatch(hydrateSettings(parsed));
      }
    } catch {
      // Ignore parse errors
    }

    // Subscribe to store changes and persist
    const unsubscribe = store.subscribe(() => {
      const { workspace, settings } = store.getState();
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            mode: workspace.mode,
            activeModel: workspace.activeModel,
            activeTool: workspace.activeTool,
          })
        );
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
      } catch {
        // Ignore storage errors
      }
    });

    return () => unsubscribe();
  }, []);

  return <>{children}</>;
}

export function ReduxProvider({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <PersistGate>{children}</PersistGate>
    </Provider>
  );
}
