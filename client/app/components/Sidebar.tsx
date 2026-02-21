"use client";

import { AIModel, AI_MODELS, Tool } from "@/app/lib/types";

interface SidebarProps {
  isOpen: boolean;
  activeModel: AIModel;
  activeTool: Tool;
  onModelChange: (model: AIModel) => void;
  onToolChange: (tool: Tool) => void;
}

interface SidebarSection {
  title: string;
  items: {
    id: string;
    label: string;
    tool: Tool;
  }[];
}

const SECTIONS: SidebarSection[] = [
  {
    title: "AI",
    items: AI_MODELS.map((m) => ({
      id: m.id,
      label: m.name,
      tool: { type: "ai", model: m.id } as Tool,
    })),
  },
  {
    title: "UTILS",
    items: [
      { id: "json-formatter", label: "JSON Formatter", tool: { type: "util", name: "json-formatter" } },
      { id: "regex-tester", label: "Regex Tester", tool: { type: "util", name: "regex-tester" } },
      { id: "markdown-preview", label: "Markdown Preview", tool: { type: "util", name: "markdown-preview" } },
    ],
  },
  {
    title: "FLOW",
    items: [
      { id: "focus-timer", label: "Focus Timer", tool: { type: "flow", name: "focus-timer" } },
      { id: "ambient-sound", label: "Ambient Sound", tool: { type: "flow", name: "ambient-sound" } },
      { id: "build-notes", label: "Build Notes", tool: { type: "flow", name: "build-notes" } },
    ],
  },
];

function isToolActive(tool: Tool, activeTool: Tool): boolean {
  if (tool.type !== activeTool.type) return false;
  if (tool.type === "ai" && activeTool.type === "ai") {
    return tool.model === activeTool.model;
  }
  if (tool.type === "util" && activeTool.type === "util") {
    return tool.name === activeTool.name;
  }
  if (tool.type === "flow" && activeTool.type === "flow") {
    return tool.name === activeTool.name;
  }
  return false;
}

export function Sidebar({ isOpen, activeTool, onToolChange }: SidebarProps) {
  if (!isOpen) return null;

  return (
    <aside className="w-52 border-r border-border bg-bg-secondary flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto py-4">
        {SECTIONS.map((section) => (
          <div key={section.title} className="mb-6">
            <h3 className="px-4 mb-2 text-xs font-medium text-text-muted tracking-wider">
              {section.title}
            </h3>
            <ul>
              {section.items.map((item) => {
                const active = isToolActive(item.tool, activeTool);
                return (
                  <li key={item.id}>
                    <button
                      onClick={() => onToolChange(item.tool)}
                      className={`
                        w-full text-left px-4 py-1.5 text-sm transition-all duration-150
                        ${
                          active
                            ? "text-accent glow"
                            : "text-text-secondary hover:text-text-primary hover:underline"
                        }
                      `}
                    >
                      {active && <span className="mr-2">├─</span>}
                      {!active && <span className="mr-2 opacity-0">├─</span>}
                      {item.label}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </aside>
  );
}
