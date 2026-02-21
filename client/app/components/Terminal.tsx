"use client";

import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { Message, AIModel, AI_MODELS } from "@/app/lib/types";
import { submitApiKey } from "@/app/lib/api";

/** Models that require user-supplied API keys */
const PAID_MODELS: AIModel[] = ["chatgpt", "claude", "deepseek"];

interface TerminalProps {
  messages: Message[];
  activeModel: AIModel;
  sessionStartTime: Date;
  onSendMessage: (content: string) => void;
  onModelChange?: (model: AIModel) => void;
  onClear?: () => void;
  /** Which paid models have keys configured */
  paidKeyStatus: Record<string, boolean>;
  /** Callback when a paid model key is successfully configured */
  onKeyConfigured?: (model: AIModel) => void;
  /** When true, disable input (prevents double-send / connection abort) */
  isStreaming?: boolean;
  /** Ref for synchronous streaming check (guards against race before state updates) */
  streamingRef?: React.RefObject<boolean>;
  /** Open the Code editor window (e.g. from terminal commands: code, editor) */
  onOpenEditor?: () => void;
}

type OutputVariant = "header" | "category" | "command" | "model" | "hint";

interface TerminalLine {
  id: string;
  type: "input" | "output" | "error" | "system" | "success";
  content: string;
  /** Optional variant for output styling (help/models) */
  variant?: OutputVariant;
  /** Optional structured data for command rows */
  meta?: { command?: string; desc?: string } | { indicator?: string; name?: string; id?: string; keyStatus?: string };
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

// Terminal prompt configuration
const TERMINAL_USER = "anik";
const TERMINAL_HOST = "Aniks-MacBook-Air-3";
const TERMINAL_DIR = "flowstate.dev";
const SHORT_PROMPT = `${TERMINAL_DIR} % `;
const FULL_PROMPT = `(base) ${TERMINAL_USER}@${TERMINAL_HOST} ${TERMINAL_DIR} % `;

const COMMANDS: Record<string, string> = {
  help: "Show available commands",
  model: "Switch model (usage: model <id> e.g. model llama3)",
  models: "List models and short names",
  clear: "Clear terminal",
  date: "Show current date and time",
  whoami: "Display current session info",
  pwd: "Print working directory",
  ls: "List workspace contents",
  ask: "Ask the AI a question (usage: ask <question>)",
  apikey: "Add API key for a paid model (usage: apikey <model>)",
  code: "Open the Code editor (run LLM-generated JavaScript)",
  editor: "Same as code — open the Code editor",
};

export function Terminal({
  messages,
  activeModel,
  sessionStartTime,
  onSendMessage,
  onModelChange,
  onClear,
  paidKeyStatus,
  onKeyConfigured,
  isStreaming = false,
  streamingRef,
  onOpenEditor,
}: TerminalProps) {
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [lines, setLines] = useState<TerminalLine[]>([]);
  const [awaitingKeyFor, setAwaitingKeyFor] = useState<AIModel | null>(null);
  const [isValidatingKey, setIsValidatingKey] = useState(false);
  /** When true, all input goes to AI; exit with Cmd+C (Mac) or Ctrl+C (Win) */
  const [inModelEnv, setInModelEnv] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  const modelName =
    activeModel === "none" ? "No model" : AI_MODELS.find((m) => m.id === activeModel)?.name || activeModel;

  /** Find model by short id, full name, or partial match */
  const findModel = (query: string): { id: AIModel; name: string } | undefined => {
    const q = query.trim().toLowerCase();
    if (!q) return undefined;
    return (
      AI_MODELS.find((m) => m.id === q || m.name.toLowerCase() === q) ??
      AI_MODELS.find((m) => m.name.toLowerCase().startsWith(q) || m.id.startsWith(q))
    );
  };

  const isPaidModel = (model: AIModel) => PAID_MODELS.includes(model);
  const hasKey = (model: AIModel) => paidKeyStatus[model] ?? false;

  // Format date like macOS terminal
  const formatLoginDate = (date: Date) => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const day = days[date.getDay()];
    const month = months[date.getMonth()];
    const dateNum = date.getDate().toString().padStart(2, " ");
    const time = date.toTimeString().split(" ")[0];
    return `${day} ${month} ${dateNum} ${time}`;
  };

  // Initialize with welcome message
  useEffect(() => {
    if (lines.length === 0) {
      const welcomeLines: TerminalLine[] = [
        { id: generateId(), type: "system", content: `Last login: ${formatLoginDate(sessionStartTime)} on ttys011` },
      ];
      setLines(welcomeLines);
    }
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines, messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = `${inputRef.current.scrollHeight}px`;
    }
  }, [input]);

  const addLine = (
    type: TerminalLine["type"],
    content: string,
    opts?: { variant?: OutputVariant; meta?: TerminalLine["meta"] }
  ) => {
    setLines((prev) => [...prev, { id: generateId(), type, content, ...opts }]);
  };

  /** Prompt user for API key when they select a paid model without one */
  const promptForApiKey = (model: AIModel) => {
    const name = AI_MODELS.find((m) => m.id === model)?.name || model;
    addLine("system", "");
    addLine("output", `${name} requires an API key.`);
    addLine("output", `Enter your API key below (it will be encrypted and stored securely):`);
    addLine("system", "");
    setAwaitingKeyFor(model);
  };

  /** Handle API key submission */
  const handleApiKeySubmit = async (key: string) => {
    const model = awaitingKeyFor;
    if (!model) return;

    addLine("input", "•".repeat(key.length)); // mask the key in terminal
    setIsValidatingKey(true);
    addLine("output", "Validating key...");

    try {
      const result = await submitApiKey(model, key);
      if (result.valid) {
        addLine("success", `✓ API key validated and stored securely.`);
        addLine("output", `You can now use ${AI_MODELS.find((m) => m.id === model)?.name}.`);
        addLine("system", "");
        onKeyConfigured?.(model);
        onModelChange?.(model);
      } else {
        addLine("error", `✗ ${result.error || "Invalid API key"}`);
        addLine("output", `Try again with: apikey ${model}`);
        addLine("system", "");
      }
    } catch {
      addLine("error", "✗ Could not connect to server. Is the backend running?");
      addLine("system", "");
    }

    setAwaitingKeyFor(null);
    setIsValidatingKey(false);
  };

  const processCommand = (cmd: string) => {
    const parts = cmd.trim().split(/\s+/);
    const command = parts[0].toLowerCase();
    const args = parts.slice(1);

    addLine("input", cmd);

    switch (command) {
      case "help":
        addLine("system", "");
        addLine("output", "Available commands:", { variant: "header" });
        addLine("system", "");
        Object.entries(COMMANDS).forEach(([name, desc]) => {
          addLine("output", `  ${name.padEnd(10)} ${desc}`, {
            variant: "command",
            meta: { command: name, desc },
          });
        });
        addLine("system", "");
        break;

      case "model":
        if (args.length === 0) {
          addLine("output", `Current model: ${modelName} (${activeModel})`);
          if (inModelEnv) {
            addLine("output", "You're in the model environment. Press ⌘C (Mac) or Ctrl+C (Win) to exit.");
          }
        } else {
          const query = args.join(" ");
          const found = findModel(query);
          if (found) {
            // Check if it's a paid model without a key
            if (isPaidModel(found.id) && !hasKey(found.id)) {
              promptForApiKey(found.id);
            } else {
              onModelChange?.(found.id);
              addLine("success", `You have switched to ${found.name}.`);
              addLine("output", `You're now in the ${found.name} environment.`);
              addLine("output", "Press ⌘C (Mac) or Ctrl+C (Win) to exit.", { variant: "hint" });
              addLine("system", "");
              setInModelEnv(true);
            }
          } else {
            addLine("error", `Unknown model: "${query}"`);
            addLine("output", 'Type "models" to see available models and short names (e.g. model llama3)');
          }
        }
        break;

      case "models":
        addLine("system", "");
        addLine("output", "Available models:", { variant: "header" });
        addLine("system", "");
        addLine("output", "  Free (ready to use):", { variant: "category" });
        AI_MODELS.filter((m) => !isPaidModel(m.id)).forEach((m) => {
          const indicator = m.id === activeModel ? "●" : "○";
          addLine("output", `    ${indicator} ${m.name.padEnd(18)} (${m.id})`, {
            variant: "model",
            meta: { indicator, name: m.name, id: m.id },
          });
        });
        addLine("system", "");
        addLine("output", "  Paid (requires API key):", { variant: "category" });
        AI_MODELS.filter((m) => isPaidModel(m.id)).forEach((m) => {
          const indicator = m.id === activeModel ? "●" : "○";
          const keyStatus = hasKey(m.id) ? "✓ key added" : "✗ no key";
          addLine("output", `    ${indicator} ${m.name.padEnd(18)} (${m.id})  ${keyStatus}`, {
            variant: "model",
            meta: { indicator, name: m.name, id: m.id, keyStatus },
          });
        });
        addLine("system", "");
        addLine("output", 'Use "model <short_id>" to switch (e.g. model llama3, model mixtral)', { variant: "hint" });
        addLine("output", 'Use "apikey <model>" to add a key for paid models', { variant: "hint" });
        break;

      case "apikey": {
        if (args.length === 0) {
          addLine("error", 'Usage: apikey <model>  (e.g. apikey chatgpt)');
          addLine("output", "Paid models: chatgpt, claude, deepseek");
          break;
        }
        const target = args[0].toLowerCase();
        const targetModel = AI_MODELS.find(
          (m) => m.id === target || m.name.toLowerCase() === target
        );
        if (!targetModel || !isPaidModel(targetModel.id)) {
          addLine("error", `"${args[0]}" is not a paid model.`);
          addLine("output", "Paid models: chatgpt, claude, deepseek");
          break;
        }
        if (hasKey(targetModel.id)) {
          addLine("output", `${targetModel.name} already has a key configured.`);
          addLine("output", `To update it, run: apikey ${targetModel.id}`);
          // Still allow re-adding
        }
        promptForApiKey(targetModel.id);
        break;
      }

      case "clear":
        setLines([]);
        setInModelEnv(false);
        onClear?.();
        break;

      case "date":
        addLine("output", new Date().toString());
        break;

      case "whoami":
        addLine("output", `${TERMINAL_USER}`);
        break;

      case "pwd":
        addLine("output", `/home/${TERMINAL_USER}/${TERMINAL_DIR}`);
        break;

      case "ls":
        addLine("output", "models/    prompts/    sessions/    .config");
        break;

      case "ask":
        if (args.length === 0) {
          addLine("error", "Usage: ask <question>");
        } else {
          const question = args.join(" ");
          onSendMessage(question);
        }
        break;

      case "code":
      case "editor":
        if (onOpenEditor) {
          onOpenEditor();
          addLine("output", "Opened Code editor.");
        } else {
          addLine("error", "Code editor is not available.");
        }
        break;

      case "":
        break;

      default:
        if (cmd.trim()) {
          if (activeModel === "none") {
            addLine("error", "No model selected.");
            addLine("output", "Run 'model <name>' to select one (e.g. model llama3).");
          } else if (isPaidModel(activeModel) && !hasKey(activeModel)) {
            addLine("error", `${modelName} requires an API key.`);
            addLine("output", `Run "apikey ${activeModel}" to add your key, or switch to a free model.`);
          } else {
            onSendMessage(cmd);
          }
        }
    }
  };

  const handleSubmit = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    if (isStreaming || streamingRef?.current) return; // Prevent double-send (sync guard)

    // If waiting for API key input, handle it separately
    if (awaitingKeyFor) {
      handleApiKeySubmit(trimmed);
      setInput("");
      return;
    }

    // In model environment: all input goes to AI
    if (inModelEnv) {
      if (activeModel === "none") {
        addLine("error", "No model selected.");
        addLine("output", "Press ⌘C / Ctrl+C to exit, then run 'model <name>' to select one.");
      } else if (isPaidModel(activeModel) && !hasKey(activeModel)) {
        addLine("error", `${modelName} requires an API key.`);
        addLine("output", "Press ⌘C / Ctrl+C to exit, then run apikey or switch to a free model.");
      } else {
        onSendMessage(trimmed);
      }
      setInput("");
      return;
    }

    processCommand(trimmed);
    setHistory((prev) => [...prev, trimmed]);
    setHistoryIndex(-1);
    setInput("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Exit model environment: Cmd+C (Mac) or Ctrl+C (Win)
    if ((e.metaKey || e.ctrlKey) && e.key === "c" && inModelEnv) {
      e.preventDefault();
      setInModelEnv(false);
      addLine("system", "");
      addLine("output", `Exited ${modelName} environment.`);
      addLine("system", "");
      setInput("");
      return;
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === "Escape" && awaitingKeyFor) {
      // Cancel API key input
      setAwaitingKeyFor(null);
      addLine("system", "Cancelled.");
      addLine("system", "");
      setInput("");
    } else if (e.key === "ArrowUp" && input === "" && !awaitingKeyFor) {
      e.preventDefault();
      if (history.length > 0) {
        const newIndex = historyIndex === -1 ? history.length - 1 : Math.max(0, historyIndex - 1);
        setHistoryIndex(newIndex);
        setInput(history[newIndex]);
      }
    } else if (e.key === "ArrowDown" && historyIndex !== -1) {
      e.preventDefault();
      if (historyIndex < history.length - 1) {
        const newIndex = historyIndex + 1;
        setHistoryIndex(newIndex);
        setInput(history[newIndex]);
      } else {
        setHistoryIndex(-1);
        setInput("");
      }
    } else if (e.key === "Tab" && !awaitingKeyFor) {
      e.preventDefault();
      const commands = Object.keys(COMMANDS);
      const match = commands.find((c) => c.startsWith(input.toLowerCase()));
      if (match) {
        setInput(match);
      }
    }
  };

  // Determine input prompt
  const getPrompt = () => {
    if (awaitingKeyFor) {
      return "API key: ";
    }
    if (inModelEnv) {
      return `(${activeModel}) % `;
    }
    // On small screens, the CSS hides the full prompt — use short version in the input line
    if (typeof window !== 'undefined' && window.innerWidth < 640) {
      return SHORT_PROMPT;
    }
    return FULL_PROMPT;
  };

  return (
    <div
      className="h-full overflow-y-auto overflow-x-hidden font-mono text-xs sm:text-sm p-3 sm:p-5 rounded-b-lg bg-gradient-to-b from-bg-primary to-bg-secondary/30"
      onClick={() => inputRef.current?.focus()}
    >
      {/* Terminal lines */}
      {lines.map((line) => (
        <div key={line.id} className="leading-6 sm:leading-7 py-0.5">
          {line.type === "input" ? (
            <div className="break-words">
              <span className="text-text-primary select-none hidden sm:inline">{FULL_PROMPT}</span>
              <span className="text-text-primary select-none sm:hidden">{SHORT_PROMPT}</span>
              <span className="text-text-primary">{line.content}</span>
            </div>
          ) : line.type === "error" ? (
            <div className="text-error">{line.content}</div>
          ) : line.type === "success" ? (
            <div className="text-success">{line.content}</div>
          ) : line.type === "system" ? (
            <div className="text-text-primary">{line.content || " "}</div>
          ) : line.type === "output" && line.variant === "header" ? (
            <div className="text-text-primary font-semibold tracking-tight mt-1 first:mt-0">{line.content}</div>
          ) : line.type === "output" && line.variant === "category" ? (
            <div className="text-text-secondary text-xs uppercase tracking-wider mt-2 mb-0.5">{line.content}</div>
          ) : line.type === "output" && line.variant === "command" && line.meta?.command ? (
            <div className="flex gap-4 text-text-primary">
              <span className="text-accent shrink-0 w-24 tabular-nums">{line.meta.command}</span>
              <span className="text-text-secondary">{line.meta.desc}</span>
            </div>
          ) : line.type === "output" && line.variant === "model" && line.meta ? (
            <div className="flex items-baseline gap-2 text-text-primary flex-wrap">
              <span className="text-accent shrink-0 w-4 text-center">{line.meta.indicator}</span>
              <span className="text-text-primary min-w-[140px]">{line.meta.name}</span>
              <span className="text-text-muted text-xs">({line.meta.id})</span>
              {line.meta.keyStatus && (
                <span className={line.meta.keyStatus?.includes("✓") ? "text-success text-xs" : "text-text-muted text-xs"}>
                  {line.meta.keyStatus}
                </span>
              )}
            </div>
          ) : line.type === "output" && line.variant === "hint" ? (
            <div className="text-text-muted text-sm">{line.content}</div>
          ) : (
            <div className="text-text-primary">{line.content}</div>
          )}
        </div>
      ))}

      {/* AI Messages */}
      {messages.map((message) => (
        <div key={message.id} className="leading-6 sm:leading-7 py-0.5">
          {message.role === "user" ? (
            <div className="break-words">
              <span className="text-text-primary select-none hidden sm:inline">{FULL_PROMPT}</span>
              <span className="text-text-primary select-none sm:hidden">{SHORT_PROMPT}</span>
              <span className="text-text-primary">{message.content}</span>
            </div>
          ) : message.role === "assistant" ? (
            <pre className="whitespace-pre-wrap break-words text-text-primary leading-6 sm:leading-7 overflow-x-hidden">
              {message.content}
            </pre>
          ) : (
            <div className="text-warning text-sm">{message.content}</div>
          )}
        </div>
      ))}

      {/* Input line - inline so cursor stays right after typed text */}
      <div className="flex items-center leading-6 sm:leading-7 gap-0 mt-1">
        <span className={`select-none whitespace-nowrap shrink-0 text-xs sm:text-sm ${awaitingKeyFor ? "text-warning" : "text-text-primary"}`}>
          {getPrompt()}
        </span>
        <span className="inline-flex items-center min-w-0 flex-1">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder=""
            rows={1}
            disabled={isValidatingKey || isStreaming}
            className="terminal-input bg-transparent resize-none text-text-primary placeholder:text-text-muted min-h-[24px] max-h-[200px] leading-6 sm:leading-7 min-w-[1ch] w-full outline-none border-none focus:ring-0 focus:outline-none text-xs sm:text-sm"
            style={{
              ...(awaitingKeyFor ? { WebkitTextSecurity: "disc" } as React.CSSProperties : {}),
            }}
            spellCheck={false}
            autoComplete="off"
          />
          <span className="text-text-primary cursor-blink select-none shrink-0">▋</span>
        </span>
      </div>

      <div ref={terminalEndRef} />
    </div>
  );
}
