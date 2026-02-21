"use client";

import { useState, useCallback } from "react";
import { runCode as runCodeApi } from "@/app/lib/api";

export type CodeLanguage = "javascript" | "python" | "java" | "c" | "cpp";

const LANGUAGES: { id: CodeLanguage; label: string }[] = [
  { id: "javascript", label: "JavaScript" },
  { id: "python", label: "Python" },
  { id: "java", label: "Java" },
  { id: "c", label: "C" },
  { id: "cpp", label: "C++" },
];

const DEFAULT_BY_LANG: Record<CodeLanguage, string> = {
  javascript: `// Paste or write JavaScript, then click Run
console.log("Hello from Code");

function greet(name) {
  return "Hi, " + name + "!";
}
console.log(greet("flowstate"));
`,
  python: `# Paste or write Python, then click Run
def greet(name):
    return f"Hi, {name}!"

print(greet("flowstate"))
`,
  java: `// Paste or write Java (class must be Main), then click Run
public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, flowstate");
    }
}
`,
  c: `// Paste or write C, then click Run
#include <stdio.h>
int main() {
    printf("Hello, flowstate\\n");
    return 0;
}
`,
  cpp: `// Paste or write C++, then click Run
#include <iostream>
int main() {
    std::cout << "Hello, flowstate" << std::endl;
    return 0;
}
`,
};

export function CodeEditor() {
  const [language, setLanguage] = useState<CodeLanguage>("javascript");
  const [code, setCode] = useState(DEFAULT_BY_LANG.javascript);
  const [output, setOutput] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Error type label (e.g. SyntaxError, TypeError) */
  const [errorType, setErrorType] = useState<string | null>(null);

  const runCode = useCallback(async () => {
    setError(null);
    setErrorType(null);
    setOutput([]);
    setIsRunning(true);

    if (language !== "javascript") {
      try {
        const result = await runCodeApi(language, code);
        setOutput(result.outputLines);
        if (result.error) {
          setError(result.error);
          setErrorType(result.errorType ?? "RuntimeError");
        }
      } catch (err) {
        const msg = (err as Error).message;
        setError(msg);
        setErrorType(msg.includes("whitelist") ? "PistonRestricted" : "NetworkError");
      }
      setIsRunning(false);
      return;
    }

    const escaped = code.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$/g, "\\$");
    const runner = `
      <script>
        const __logs = [];
        function capture(...args) {
          __logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '));
        }
        console.log = (...a) => capture(...a);
        console.warn = (...a) => capture(...a);
        console.error = (...a) => capture(...a);
        try {
          ${escaped}
          parent.postMessage({ type: 'result', logs: __logs }, '*');
        } catch (e) {
          parent.postMessage({
            type: 'error',
            name: e.name || 'Error',
            message: e.message || '',
            stack: e.stack || ''
          }, '*');
        }
      </script>
    `;

    const iframe = document.createElement("iframe");
    iframe.setAttribute("sandbox", "allow-scripts");
    iframe.style.display = "none";
    document.body.appendChild(iframe);

    const timeout = setTimeout(() => {
      window.removeEventListener("message", handler);
      setIsRunning(false);
      setErrorType("TimeoutError");
      setError("Run timed out (5s)");
      try {
        document.body.removeChild(iframe);
      } catch {}
    }, 5000);

    const handler = (e: MessageEvent) => {
      if (e.data?.type === "result") {
        clearTimeout(timeout);
        setOutput(e.data.logs || []);
        window.removeEventListener("message", handler);
        try {
          document.body.removeChild(iframe);
        } catch {}
      } else if (e.data?.type === "error") {
        clearTimeout(timeout);
        const errName = e.data.name || "Error";
        const errMsg = e.data.message || "Unknown error";
        setErrorType(errName);
        setError(errMsg);
        const stack = e.data.stack || "";
        setOutput(stack ? [errMsg, "", stack] : [errMsg]);
        window.removeEventListener("message", handler);
        try {
          document.body.removeChild(iframe);
        } catch {}
      }
      setIsRunning(false);
    };

    window.addEventListener("message", handler);
    iframe.srcdoc = runner;
  }, [code, language]);

  return (
    <div className="flex flex-col h-full bg-bg-secondary">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-3 py-2 border-b border-border/50 bg-bg-tertiary shrink-0">
        <button
          type="button"
          onClick={runCode}
          disabled={isRunning}
          className="px-3 py-1.5 rounded-md bg-accent text-primary font-medium text-sm hover:opacity-90 disabled:opacity-50"
        >
          {isRunning ? "Running…" : "Run"}
        </button>
        <label className="flex items-center gap-2 text-text-muted text-xs">
          <span>Language:</span>
          <select
            value={language}
            onChange={(e) => {
              const next = e.target.value as CodeLanguage;
              setLanguage(next);
              setCode(DEFAULT_BY_LANG[next]);
              setError(null);
              setErrorType(null);
              setOutput([]);
            }}
            className="bg-bg-primary border border-border rounded px-2 py-1 text-text-primary font-mono text-xs focus:outline-none focus:ring-1 focus:ring-accent"
          >
            {LANGUAGES.map((l) => (
              <option key={l.id} value={l.id}>
                {l.label}
              </option>
            ))}
          </select>
        </label>
        <span className="text-text-muted text-xs">
          JavaScript runs in-browser; Python, Java, C, C++ run via server.
        </span>
      </div>

      {/* Code + Output split */}
      <div className="flex-1 flex min-h-0">
        <div className="flex-1 flex flex-col min-w-0 border-r border-border/50">
          <div className="px-2 py-1 text-text-muted text-xs font-mono border-b border-border/50 bg-bg-tertiary/50">
            Editor
          </div>
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            spellCheck={false}
            className="flex-1 w-full resize-none bg-bg-primary text-text-primary font-mono text-sm p-4 outline-none caret-text-primary"
            style={{ minHeight: 120 }}
            placeholder={`Write or paste ${LANGUAGES.find((l) => l.id === language)?.label ?? language}...`}
          />
        </div>
        <div className="w-72 flex flex-col shrink-0 bg-bg-primary">
          <div className="px-2 py-1 text-text-muted text-xs font-mono border-b border-border/50 bg-bg-tertiary/50">
            Output
          </div>
          <div className="flex-1 overflow-auto p-3 font-mono text-sm">
            {error && (
              <div className="text-error text-sm mb-2">
                <span className="font-semibold">{errorType ? `${errorType}: ` : ""}</span>
                {error}
              </div>
            )}
            {output.length === 0 && !error && (
              <div className="text-text-muted">Run code to see output here.</div>
            )}
            {output.map((line, i) => (
              <div key={i} className="text-text-secondary break-words">
                {line}
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}
