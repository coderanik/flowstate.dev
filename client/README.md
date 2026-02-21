# flowstate.dev

Terminal-first workspace for deep focus. Pixel calm, zero noise.

```
┌──────────────────────────────────────────────────┐
│ ● ● ● flowstate.dev     deep-focus · Claude · 5m │  ← Menu Bar
├──────────────────────────────────────────────────┤
│                                                  │
│                                                  │
│              MAIN TERMINAL AREA                  │
│                                                  │
│                                                  │
├──────────────────────────────────────────────────┤
│      [>_ Terminal] [◆ AI] [{ } Utils] [◎ Flow]   │  ← Dock
└──────────────────────────────────────────────────┘
```

macOS desktop metaphor — menu bar on top, dock at bottom.

## Philosophy

- **Terminal-first**: Feels like a CLI, works like a web app
- **Monospace everything**: JetBrains Mono, no fancy fonts
- **Calm contrast**: Dark theme with mode-specific accent colors
- **Keyboard > mouse**: Everything accessible via shortcuts
- **Restraint**: No cards, no dashboards, no notifications

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `⌘K` | Command palette |
| `⌘1` | Switch to ChatGPT |
| `⌘2` | Switch to Claude |
| `⌘3` | Switch to Gemini |
| `Esc` | Close palette / clear input |
| `Enter` | Send prompt |
| `↑/↓` | Navigate input history |

## Modes

- **deep-focus**: Blue/teal accent — for concentrated work
- **late-night**: Purple accent — for evening sessions
- **hack**: Amber accent — for rapid iteration

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
app/
├── components/
│   ├── MenuBar.tsx        # Top bar (mode, model, timer) - macOS style
│   ├── Dock.tsx           # Bottom dock (Terminal, AI, Utils, Flow)
│   ├── Terminal.tsx       # Main interaction area
│   ├── CommandPalette.tsx # ⌘K command runner
│   └── ...
├── hooks/
│   ├── useWorkspaceState.ts  # Global state + localStorage
│   └── useKeyboardShortcuts.ts
├── lib/
│   └── types.ts         # TypeScript types
├── globals.css          # Terminal styling
├── layout.tsx           # Root layout
└── page.tsx             # Workspace page
```

## Connecting AI Models

The UI is ready for API integration. To connect real AI models:

1. Add API key management (stored in localStorage)
2. Implement streaming responses in `handleSendMessage`
3. Add model-specific API calls

## Tech Stack

- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS v4
- JetBrains Mono font

---

*Built for developers who want AI as a tool, not a toy.*
