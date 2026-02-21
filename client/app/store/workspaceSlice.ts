import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { Mode, AIModel, Tool, Message, AppWindow, AppType } from "@/app/lib/types";

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

/** Which paid models have user-supplied API keys configured */
interface PaidKeyStatus {
  chatgpt: boolean;
  claude: boolean;
  deepseek: boolean;
}

interface WorkspaceState {
  mode: Mode;
  activeModel: AIModel;
  activeTool: Tool;
  sidebarOpen: boolean;
  helpPanelOpen: boolean;
  commandPaletteOpen: boolean;
  sessionStartTime: string; // Serialized as ISO string for Redux
  messages: Message[];
  windows: AppWindow[];
  activeWindowId: string | null;
  nextZIndex: number;
  /** Tracks which paid models have API keys configured */
  paidKeyStatus: PaidKeyStatus;
  /** When true, terminal is waiting for API key input */
  awaitingApiKey: AIModel | null;
}

const initialState: WorkspaceState = {
  mode: "deep-focus",
  activeModel: "none",
  activeTool: { type: "ai", model: "gemini" },
  sidebarOpen: false,
  helpPanelOpen: false,
  commandPaletteOpen: false,
  sessionStartTime: new Date().toISOString(),
  messages: [],
  windows: [],
  activeWindowId: null,
  nextZIndex: 100,
  paidKeyStatus: { chatgpt: false, claude: false, deepseek: false },
  awaitingApiKey: null,
};

const workspaceSlice = createSlice({
  name: "workspace",
  initialState,
  reducers: {
    setMode: (state, action: PayloadAction<Mode>) => {
      state.mode = action.payload;
    },
    setActiveModel: (state, action: PayloadAction<AIModel>) => {
      state.activeModel = action.payload;
      state.activeTool = { type: "ai", model: action.payload };
    },
    setActiveTool: (state, action: PayloadAction<Tool>) => {
      state.activeTool = action.payload;
    },
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
    toggleHelpPanel: (state) => {
      state.helpPanelOpen = !state.helpPanelOpen;
    },
    toggleCommandPalette: (state) => {
      state.commandPaletteOpen = !state.commandPaletteOpen;
    },
    closeCommandPalette: (state) => {
      state.commandPaletteOpen = false;
    },
    addMessage: (state, action: PayloadAction<{ role: Message["role"]; content: string }>) => {
      const message: Message = {
        id: generateId(),
        role: action.payload.role,
        content: action.payload.content,
        timestamp: new Date(),
      };
      state.messages.push(message);
    },
    clearMessages: (state) => {
      state.messages = [];
    },
    updateLastAssistantMessage: (state, action: PayloadAction<string>) => {
      // Find the last assistant message and update its content (for streaming)
      for (let i = state.messages.length - 1; i >= 0; i--) {
        if (state.messages[i].role === "assistant") {
          state.messages[i].content = action.payload;
          break;
        }
      }
    },
    // Window management
    openWindow: (
      state,
      action: PayloadAction<{ appType: AppType; title: string; icon: string; tool: Tool }>
    ) => {
      const { appType, title, icon, tool } = action.payload;
      const id = generateId();
      const offset = Math.random() * 50;
      const newWindow: AppWindow = {
        id,
        appType,
        title,
        icon,
        tool,
        isMinimized: false,
        isMaximized: false,
        zIndex: state.nextZIndex,
        position: { x: 100 + offset, y: 50 + offset },
        size: { width: 900, height: 600 },
      };
      state.windows.push(newWindow);
      state.activeWindowId = id;
      state.nextZIndex += 1;
      state.activeTool = tool;
    },
    closeWindow: (state, action: PayloadAction<string>) => {
      const windowId = action.payload;
      state.windows = state.windows.filter((w) => w.id !== windowId);
      if (state.activeWindowId === windowId) {
        state.activeWindowId =
          state.windows.length > 0 ? state.windows[state.windows.length - 1].id : null;
      }
    },
    minimizeWindow: (state, action: PayloadAction<string>) => {
      const windowId = action.payload;
      const window = state.windows.find((w) => w.id === windowId);
      if (window) {
        window.isMinimized = true;
      }
      if (state.activeWindowId === windowId) {
        state.activeWindowId = null;
      }
    },
    maximizeWindow: (state, action: PayloadAction<string>) => {
      const windowId = action.payload;
      const window = state.windows.find((w) => w.id === windowId);
      if (window) {
        window.isMaximized = !window.isMaximized;
      }
    },
    focusWindow: (state, action: PayloadAction<string>) => {
      const windowId = action.payload;
      const window = state.windows.find((w) => w.id === windowId);
      if (window) {
        window.zIndex = state.nextZIndex;
        window.isMinimized = false;
        state.activeWindowId = windowId;
        state.nextZIndex += 1;
      }
    },
    restoreWindow: (state, action: PayloadAction<string>) => {
      const windowId = action.payload;
      const window = state.windows.find((w) => w.id === windowId);
      if (window) {
        window.isMinimized = false;
        window.zIndex = state.nextZIndex;
        state.activeWindowId = windowId;
        state.nextZIndex += 1;
      }
    },
    // API key management for paid models
    setPaidKeyStatus: (state, action: PayloadAction<{ model: keyof PaidKeyStatus; configured: boolean }>) => {
      state.paidKeyStatus[action.payload.model] = action.payload.configured;
    },
    setAwaitingApiKey: (state, action: PayloadAction<AIModel | null>) => {
      state.awaitingApiKey = action.payload;
    },
    // Hydrate from localStorage
    hydrate: (state, action: PayloadAction<Partial<WorkspaceState>>) => {
      return { ...state, ...action.payload };
    },
  },
});

export const {
  setMode,
  setActiveModel,
  setActiveTool,
  toggleSidebar,
  toggleHelpPanel,
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
  restoreWindow,
  setPaidKeyStatus,
  setAwaitingApiKey,
  hydrate,
} = workspaceSlice.actions;

export default workspaceSlice.reducer;
