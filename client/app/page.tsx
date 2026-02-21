"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import {
  Terminal,
  CommandPalette,
  MenuBar,
  Window,
  CodeEditor,
  Settings,
  Clock,
  Calendar,
  SpotifyCard,
} from "@/app/components";
import Dock from '@/app/components/Dock';
import { VscTerminal, VscSparkle, VscCode, VscBracketDot, VscDebugConsole, VscSettingsGear } from 'react-icons/vsc';
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import {
  setMode,
  setActiveModel,
  setActiveTool,
  toggleCommandPalette,
  closeCommandPalette,
  addMessage,
  clearMessages,
  updateLastAssistantMessage,
  openWindow,
  closeWindow,
  minimizeWindow,
  maximizeWindow,
  focusWindow,
  setPaidKeyStatus,
} from "@/app/store/workspaceSlice";
import { useKeyboardShortcuts } from "@/app/hooks/useKeyboardShortcuts";
import { Command, AI_MODELS, AppWindow, AIModel } from "@/app/lib/types";
import { streamChat, type ChatMessage } from "@/app/lib/api";

export default function Workspace() {
  const dispatch = useAppDispatch();
  const state = useAppSelector((s) => s.workspace);

  // Track active stream abort controller
  const abortRef = useRef<AbortController | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const streamingRef = useRef(false); // Sync guard—state updates are async

  // Handle sending messages -- streams from backend with fallback
  const handleSendMessage = useCallback(
    async (content: string) => {
      // Synchronous guard to prevent double-send race before isStreaming state updates
      if (streamingRef.current) return;
      streamingRef.current = true;
      setIsStreaming(true);

      dispatch(addMessage({ role: "user", content }));

      // Build message history for the API
      const apiMessages: ChatMessage[] = [
        ...state.messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        { role: "user" as const, content },
      ];

      // Abort any existing stream (from previous completed/incomplete request)
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      // Start with an empty assistant message that we'll stream into
      let streamedContent = "";

      dispatch(
        addMessage({
          role: "assistant",
          content: "",
        })
      );

      try {
        await streamChat(
          state.activeModel,
          apiMessages,
          (chunk) => {
            if (chunk.type === "content" && chunk.content) {
              streamedContent += chunk.content;
              // Update the last assistant message with accumulated content
              dispatch(updateLastAssistantMessage(streamedContent));
            } else if (chunk.type === "info" && chunk.content) {
              // Fallback notification -- prepend to the message
              streamedContent = chunk.content + "\n\n";
              dispatch(updateLastAssistantMessage(streamedContent));
            } else if (chunk.type === "error" && chunk.error) {
              const errMsg = chunk.error;
              const friendly =
                errMsg.includes("aborted") || errMsg.includes("AbortError")
                  ? "Request was interrupted (connection closed or cancelled). Wait for the response, then try again. Ensure the server is running: npm run dev in the server folder."
                  : errMsg;
              dispatch(updateLastAssistantMessage(`Error: ${friendly}`));
            }
          },
          { fallback: true, signal: controller.signal }
        );
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          dispatch(
            updateLastAssistantMessage(
              `Connection error: Could not reach the server. Make sure the backend is running (cd server && npm run dev) on http://localhost:3001`
            )
          );
        }
      } finally {
        streamingRef.current = false;
        setIsStreaming(false);
      }
    },
    [dispatch, state.activeModel, state.messages]
  );

  // Build command list for palette
  const commands: Command[] = useMemo(
    () => [
      // AI Models
      ...AI_MODELS.map((model, index) => ({
        id: `switch-${model.id}`,
        label: `Switch to ${model.name}`,
        shortcut: index < 3 ? `⌘${index + 1}` : undefined,
        category: "AI",
        action: () => dispatch(setActiveModel(model.id)),
      })),
      // Mode
      {
        id: "mode-focus",
        label: "Deep Focus mode",
        category: "Mode",
        action: () => dispatch(setMode("deep-focus")),
      },
      {
        id: "mode-night",
        label: "Late Night mode",
        category: "Mode",
        action: () => dispatch(setMode("late-night")),
      },
      {
        id: "mode-hack",
        label: "Hack mode",
        category: "Mode",
        action: () => dispatch(setMode("hack")),
      },
      // Utils
      {
        id: "util-json",
        label: "JSON Formatter",
        category: "Utils",
        action: () => dispatch(setActiveTool({ type: "util", name: "json-formatter" })),
      },
      {
        id: "util-regex",
        label: "Regex Tester",
        category: "Utils",
        action: () => dispatch(setActiveTool({ type: "util", name: "regex-tester" })),
      },
      {
        id: "util-markdown",
        label: "Markdown Preview",
        category: "Utils",
        action: () => dispatch(setActiveTool({ type: "util", name: "markdown-preview" })),
      },
      // Flow
      {
        id: "flow-timer",
        label: "Focus Timer",
        category: "Flow",
        action: () => dispatch(setActiveTool({ type: "flow", name: "focus-timer" })),
      },
      {
        id: "flow-ambient",
        label: "Ambient Sound",
        category: "Flow",
        action: () => dispatch(setActiveTool({ type: "flow", name: "ambient-sound" })),
      },
      {
        id: "flow-notes",
        label: "Build Notes",
        category: "Flow",
        action: () => dispatch(setActiveTool({ type: "flow", name: "build-notes" })),
      },
      // Actions
      {
        id: "open-code-editor",
        label: "Open Code editor",
        category: "Action",
        action: () =>
          dispatch(
            openWindow({
              appType: "editor",
              title: "Code",
              icon: "</>",
              tool: { type: "editor" },
            })
          ),
      },
      {
        id: "clear-session",
        label: "Clear session",
        category: "Action",
        action: () => dispatch(clearMessages()),
      },
    ],
    [dispatch]
  );

  // Keyboard shortcuts
  useKeyboardShortcuts([
    { key: "k", meta: true, handler: () => dispatch(toggleCommandPalette()) },
    { key: "Space", alt: true, handler: () => dispatch(toggleCommandPalette()) }, // Option+Space (Mac) / Alt+Space (Windows)
    { key: "Space", meta: true, alt: true, handler: () => dispatch(toggleCommandPalette()) }, // Cmd+Option+Space (Mac) / Ctrl+Alt+Space (Windows) - Spotlight-style search
    { key: "1", meta: true, handler: () => dispatch(setActiveModel("chatgpt")) },
    { key: "2", meta: true, handler: () => dispatch(setActiveModel("claude")) },
    { key: "3", meta: true, handler: () => dispatch(setActiveModel("gemini")) },
    { key: "Escape", handler: () => dispatch(closeCommandPalette()) },
  ]);

  // Render window content based on app type
  const renderWindowContent = (window: AppWindow) => {
    if (window.appType === "terminal" || window.tool.type === "ai") {
      return (
        <Terminal
          messages={state.messages}
          activeModel={state.activeModel}
          sessionStartTime={new Date(state.sessionStartTime)}
          onSendMessage={handleSendMessage}
          onModelChange={(model) => dispatch(setActiveModel(model))}
          onClear={() => dispatch(clearMessages())}
          paidKeyStatus={state.paidKeyStatus}
          isStreaming={isStreaming}
          streamingRef={streamingRef}
          onKeyConfigured={(model: AIModel) => {
            if (model === "chatgpt" || model === "claude" || model === "deepseek") {
              dispatch(setPaidKeyStatus({ model, configured: true }));
            }
          }}
          onOpenEditor={() =>
            dispatch(
              openWindow({
                appType: "editor",
                title: "Code",
                icon: "</>",
                tool: { type: "editor" },
              })
            )
          }
        />
      );
    }
    if (window.appType === "editor") {
      return <CodeEditor />;
    }
    if (window.appType === "settings") {
      return <Settings />;
    }
    // Placeholder for other app types
    return (
      <div className="flex items-center justify-center h-full text-text-muted">
        <div className="text-center">
          <p className="text-lg mb-2">{window.title}</p>
          <p className="text-sm">Coming soon...</p>
        </div>
      </div>
    );
  };

  return (
    <div
      className="h-screen flex flex-col overflow-hidden bg-bg-primary"
      data-mode={state.mode}
    >
      {/* Menu Bar (top - macOS style) */}
      <MenuBar
        mode={state.mode}
        activeModel={state.activeModel}
        sessionStartTime={new Date(state.sessionStartTime)}
        onCommandPalette={() => dispatch(toggleCommandPalette())}
      />

      {/* Main content area */}
      <div className="flex-1 overflow-hidden relative desktop-bg">
        {/* Desktop with widgets - always visible */}
        <div className="absolute inset-0 p-8">
          {/* Top row - Calendar (left) and Clock (right) */}
          <div className="flex justify-between items-start">
            {/* Calendar - top left */}
            <Calendar />
            
            {/* Clock - top right */}
            <Clock />
          </div>

          {/* Center welcome text - only show when no windows */}
          {state.windows.filter((w) => !w.isMinimized).length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <h1 className="text-4xl font-light text-text-primary mb-2">flowstate.dev</h1>
                <p className="text-text-muted">Click an app in the dock to begin</p>
              </div>
            </div>
          )}
        </div>

        {/* Windows */}
        {state.windows.map((window) => (
          <Window
            key={window.id}
            id={window.id}
            title={window.title}
            icon={window.icon}
            isActive={state.activeWindowId === window.id}
            isMinimized={window.isMinimized}
            isMaximized={window.isMaximized}
            zIndex={window.zIndex}
            initialPosition={window.position}
            initialSize={window.size}
            onClose={() => dispatch(closeWindow(window.id))}
            onMinimize={() => dispatch(minimizeWindow(window.id))}
            onMaximize={() => dispatch(maximizeWindow(window.id))}
            onFocus={() => dispatch(focusWindow(window.id))}
          >
            {renderWindowContent(window)}
          </Window>
        ))}
      </div>

      {/* Bottom bar: Spotify (left) + Dock (center) */}
      <div className="flex items-center justify-center gap-4 px-8 pb-2">
        <div className="flex-1 flex justify-start">
          <SpotifyCard />
        </div>
        <Dock
          className="mt-19"
          items={[
            {
              icon: <VscTerminal size={18} />,
              label: 'Terminal',
              onClick: () =>
                dispatch(
                  openWindow({
                    appType: 'terminal',
                    title: 'Terminal',
                    icon: '>_',
                    tool: { type: 'ai', model: state.activeModel },
                  })
                ),
            },
            {
              icon: <VscSparkle size={18} />,
              label: 'AI',
              onClick: () =>
                dispatch(
                  openWindow({
                    appType: 'ai',
                    title: `AI · ${state.activeModel === "none" ? "No model" : AI_MODELS.find((m) => m.id === state.activeModel)?.name ?? state.activeModel}`,
                    icon: '◆',
                    tool: { type: 'ai', model: state.activeModel },
                  })
                ),
            },
            {
              icon: <VscCode size={18} />,
              label: 'Code',
              onClick: () =>
                dispatch(
                  openWindow({
                    appType: 'editor',
                    title: 'Code',
                    icon: '</>',
                    tool: { type: 'editor' },
                  })
                ),
            },
            {
              icon: <VscBracketDot size={18} />,
              label: 'Utils',
              onClick: () =>
                dispatch(
                  openWindow({
                    appType: 'utils',
                    title: 'Utils',
                    icon: '{ }',
                    tool: { type: 'util', name: 'json-formatter' },
                  })
                ),
            },
            {
              icon: <VscDebugConsole size={18} />,
              label: 'Flow',
              onClick: () =>
                dispatch(
                  openWindow({
                    appType: 'flow',
                    title: 'Flow',
                    icon: '◎',
                    tool: { type: 'flow', name: 'focus-timer' },
                  })
                ),
            },
            {
              icon: <VscSettingsGear size={18} />,
              label: 'Settings',
              onClick: () =>
                dispatch(
                  openWindow({
                    appType: 'settings',
                    title: 'Settings',
                    icon: '⚙',
                    tool: { type: 'settings' },
                  })
                ),
            },
          ]}
          panelHeight={68}
          baseItemSize={50}
          magnification={70}
        />
        <div className="flex-1" />
      </div>

      {/* Command Palette (modal) */}
      <CommandPalette
        isOpen={state.commandPaletteOpen}
        onClose={() => dispatch(closeCommandPalette())}
        commands={commands}
      />
    </div>
  );
}
