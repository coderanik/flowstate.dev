export type Mode = "deep-focus" | "late-night" | "hack";

export type AIModel =
  | "none" // No model selected (user must run "model <name>")
  | "chatgpt"
  | "claude"
  | "gemini"
  | "deepseek"
  | "mixtral"
  | "codellama"
  | "starcoder2"
  | "qwen-coder"
  | "phi3"
  | "llama3"
  | "mistral";

export type Tool = 
  | { type: "ai"; model: AIModel }
  | { type: "util"; name: "json-formatter" | "regex-tester" | "markdown-preview" | "hash-generator" | "yaml-json" | "xml-formatter" | "qr-generator" | "uuid-generator" | "color-converter" }
  | { type: "flow"; name: "focus-timer" | "ambient-sound" | "build-notes" }
  | { type: "editor" }
  | { type: "settings" };

export type AppType = "terminal" | "ai" | "utils" | "flow" | "editor" | "settings";

export interface AppWindow {
  id: string;
  appType: AppType;
  title: string;
  icon: string;
  tool: Tool;
  isMinimized: boolean;
  isMaximized: boolean;
  zIndex: number;
  position: { x: number; y: number };
  size: { width: number; height: number };
}

export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
}

export interface WorkspaceState {
  mode: Mode;
  activeModel: AIModel;
  activeTool: Tool;
  sidebarOpen: boolean;
  helpPanelOpen: boolean;
  commandPaletteOpen: boolean;
  sessionStartTime: Date;
  messages: Message[];
  windows: AppWindow[];
  activeWindowId: string | null;
  nextZIndex: number;
}

export interface Command {
  id: string;
  label: string;
  shortcut?: string;
  action: () => void;
  category?: string;
}

export const AI_MODELS: { id: AIModel; name: string }[] = [
  // Paid providers
  { id: "chatgpt", name: "ChatGPT" },
  { id: "claude", name: "Claude" },
  { id: "gemini", name: "Gemini" },
  { id: "deepseek", name: "DeepSeek" },
  // HF Free tier
  { id: "mixtral", name: "Mixtral 8x7B" },
  { id: "llama3", name: "Llama 3.1 8B" },
  { id: "mistral", name: "Mistral 7B" },
  { id: "codellama", name: "CodeLlama 34B" },
  { id: "starcoder2", name: "StarCoder2 15B" },
  { id: "qwen-coder", name: "Qwen 2.5 Coder" },
  { id: "phi3", name: "SmolLM 3B" },
];

export const PROMPT_PRESETS = [
  { id: "explain", label: "Explain code", prompt: "Explain this code:" },
  { id: "refactor", label: "Refactor", prompt: "Refactor this code to be cleaner:" },
  { id: "bugs", label: "Find bugs", prompt: "Find potential bugs in this code:" },
  { id: "tests", label: "Write tests", prompt: "Write tests for this code:" },
  { id: "optimize", label: "Optimize", prompt: "Optimize this code for performance:" },
  { id: "document", label: "Document", prompt: "Add documentation to this code:" },
];
