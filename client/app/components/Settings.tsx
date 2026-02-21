"use client";

import { useState } from "react";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import { setClockStyle, setTimeFormat, type ClockStyle, type TimeFormat } from "@/app/store/settingsSlice";
import { setMode } from "@/app/store/workspaceSlice";
import type { Mode } from "@/app/lib/types";

// Icons (macOS-style outline, grey)
const GearIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.213-1.281z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const ClockIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const PaletteIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.098 19.902a3.75 3.75 0 005.304 0l6.401-6.402M6.75 21A3.75 3.75 0 013 17.25V4.125C3 3.504 3.504 3 4.125 3h15.75c.621 0 1.125.504 1.125 1.125v4.172a3.75 3.75 0 01-3.422 3.736.75.75 0 00-.578.53l-1.281 2.655a3.75 3.75 0 01-3.255 2.195H6.75zM6 18h.008v.008H6V18zm.375-9h.008v.008h-.008V9zm3 0h.008v.008H9.375V9zm3 0h.008v.008h-.008V9zm3 0h.008v.008h-.008V9zm3 0h.008v.008H18.375V9zm-9 3h.008v.008H9.375V12zm3 0h.008v.008h-.008V12zm3 0h.008v.008h-.008V12zm3 0h.008v.008H18.375V12zm-9 3h.008v.008H9.375V15zm3 0h.008v.008h-.008V15zm3 0h.008v.008h-.008V15zm3 0h.008v.008H18.375V15z" />
  </svg>
);

const ChevronRight = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
  </svg>
);

const SearchIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

type SettingsCategoryId = "general" | "appearance";

const CATEGORIES: { id: SettingsCategoryId; label: string; icon: React.ReactNode }[] = [
  { id: "general", label: "General", icon: <GearIcon /> },
  { id: "appearance", label: "Appearance", icon: <PaletteIcon /> },
];

function ToggleButtonGroup<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex bg-bg-tertiary rounded-lg p-0.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
            value === opt.value ? "bg-accent text-bg-primary font-medium" : "text-text-secondary hover:text-text-primary"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export function Settings() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<SettingsCategoryId>("general");

  const dispatch = useAppDispatch();
  const clockStyle = useAppSelector((s) => s.settings.clockStyle);
  const timeFormat = useAppSelector((s) => s.settings.timeFormat);
  const mode = useAppSelector((s) => s.workspace.mode);

  const filteredCategories = search.trim()
    ? CATEGORIES.filter((c) => c.label.toLowerCase().includes(search.trim().toLowerCase()))
    : CATEGORIES;

  return (
    <div className="flex flex-col sm:flex-row h-full bg-bg-primary text-text-primary">
      {/* Sidebar: vertical on desktop, horizontal tabs on mobile */}
      <aside className="hidden sm:flex w-[170px] shrink-0 flex-col border-r border-border bg-bg-secondary overflow-hidden">
        <div className="shrink-0 pt-3 pr-3 pl-3 pb-2">
          <div className="flex items-center gap-2 rounded-lg bg-bg-tertiary border border-border px-3 py-2 min-h-[36px]">
            <SearchIcon className="w-4 h-4 text-text-muted shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search"
              className="flex-1 min-w-0 bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none"
            />
          </div>
        </div>
        <nav className="flex flex-col min-h-0 overflow-y-auto overflow-x-hidden px-3 pb-4 pr-4 settings-nav gap-2">
          {filteredCategories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategory(cat.id)}
              className={`w-[140px] h-[30px] flex items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                category === cat.id
                  ? "bg-blue-600/40 text-white"
                  : "text-text-secondary hover:bg-bg-hover hover:text-text-primary"
              }`}
            >
              <span className="text-text-muted [.bg-blue-600\/40_&]:text-white">{cat.icon}</span>
              <span className="flex-1">{cat.label}</span>
              {/* <ChevronRight className="text-text-muted [.bg-blue-600\/40_&]:text-white/80 shrink-0" /> */}
            </button>
          ))}
        </nav>
      </aside>

      {/* Mobile tabs */}
      <div className="flex sm:hidden border-b border-border bg-bg-secondary overflow-x-auto shrink-0">
        {filteredCategories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setCategory(cat.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm whitespace-nowrap transition-colors border-b-2 ${
              category === cat.id
                ? "border-blue-500 text-white bg-blue-600/20"
                : "border-transparent text-text-secondary hover:text-text-primary"
            }`}
          >
            <span className="text-text-muted">{cat.icon}</span>
            <span>{cat.label}</span>
          </button>
        ))}
      </div>

      {/* Main content pane */}
      <main className="flex-1 overflow-y-auto">
        {category === "general" && (
          <div className="max-w-2xl mx-auto py-6 sm:py-8 px-4 sm:px-10">
            <div className="flex flex-col items-center text-center mb-8">
              <div className="w-10 h-10 rounded-2xl bg-bg-tertiary flex items-center justify-center mb-4 text-text-muted">
                <GearIcon className="w-6 h-6" />
              </div>
              <h1 className="text-xl font-semibold text-text-primary mb-1">General</h1>
              <p className="text-text-muted text-xs">
                Manage your overall setup and preferences for flowstate, <br/> such as clock style, time format and more.
              </p>
            </div>

            <div className="space-y-2 ">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 rounded-lg bg-bg-secondary border border-border/50 px-4 py-3 hover:bg-bg-tertiary/50 transition-colors">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <span className="text-text-muted shrink-0">
                    <ClockIcon />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text-primary">Clock Style</p>
                    <p className="text-xs text-text-muted">Digital or analog display on the desktop</p>
                  </div>
                </div>
                <div className="shrink-0 self-end sm:self-center">
                <ToggleButtonGroup
                  value={clockStyle}
                  options={[
                    { value: "digital" as ClockStyle, label: "Digital" },
                    { value: "analog" as ClockStyle, label: "Analog" },
                  ]}
                  onChange={(v) => dispatch(setClockStyle(v))}
                />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 rounded-lg bg-bg-secondary border border-border/50 px-4 py-3 hover:bg-bg-tertiary/50 transition-colors">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <span className="text-text-muted shrink-0">
                    <ClockIcon />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text-primary">Time Format</p>
                    <p className="text-xs text-text-muted">12-hour or 24-hour</p>
                  </div>
                </div>
                <div className="shrink-0 self-end sm:self-center">
                <ToggleButtonGroup
                  value={timeFormat}
                  options={[
                    { value: "12h" as TimeFormat, label: "12 Hour" },
                    { value: "24h" as TimeFormat, label: "24 Hour" },
                  ]}
                  onChange={(v) => dispatch(setTimeFormat(v))}
                />
                </div>
              </div>
            </div>
          </div>
        )}

        {category === "appearance" && (
          <div className="max-w-2xl mx-auto py-6 sm:py-8 px-4 sm:px-10">
            <div className="flex flex-col items-center text-center mb-8">
              <div className="w-10 h-10 rounded-2xl bg-bg-tertiary flex items-center justify-center mb-4 text-text-muted">
                <PaletteIcon className="w-6 h-6" />
              </div>
              <h1 className="text-xl font-semibold text-text-primary mb-1">Appearance</h1>
              <p className="text-text-muted text-xs">
                Choose the workspace mode: focus, late night, or hack. <br/> Affects menu bar and accent colors.
              </p>
            </div>

            <div className="space-y-1">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 rounded-lg bg-bg-secondary border border-border/50 px-4 py-3 hover:bg-bg-tertiary/50 transition-colors">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <span className="text-text-muted shrink-0">
                    <PaletteIcon />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text-primary">Workspace Mode</p>
                    <p className="text-xs text-text-muted break-words">Deep Focus, Late Night, or Hack</p>
                  </div>
                </div>
                <div className="shrink-0 self-end sm:self-center">
                <ToggleButtonGroup<Mode>
                  value={mode}
                  options={[
                    { value: "deep-focus", label: "Deep Focus" },
                    { value: "late-night", label: "Late Night" },
                    { value: "hack", label: "Hack" },
                  ]}
                  onChange={(v) => dispatch(setMode(v))}
                />
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
