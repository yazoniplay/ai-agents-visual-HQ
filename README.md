# AI HQ — Visual Headquarters

A game-inspired visual control center for a future autonomous AI workforce.

## Phase 1: Game world
- Fixed, interconnected 10-room headquarters map.
- Top-down spaceship-style environment.
- Clickable departments and character inspection.
- Room directory, search, labels and zoom controls.
- Responsive layout and reduced-motion support.

## Phase 2: Operations interface
- Department workspaces with Overview, Tasks, Chat and History tabs.
- Agent personnel profiles with role, department and responsibility.
- Local task queue with add and status-cycle interactions.
- Local department notes and a session activity journal.
- Clear offline states and explicit labels distinguishing local preview actions from real agent execution.

## Important status

This remains a **frontend-only preview**. The ten character identities and roles are placeholders, not configured model-backed agents. Tasks, notes and journal entries are held in React state for the current page session only; they are not persisted to a server. No AI model is connected, no agent executes work, and no real-time meetings, cross-agent conversations, notifications or push delivery exist yet.

The next phase should establish the persistent backend and data contracts before connecting live agents. Do not treat preview interactions as real autonomous execution.

## Run locally

Requires Node.js 20 or newer.

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Stack

- React + TypeScript
- Vite
- SVG world map
- CSS interactions and animation
- Lucide icons
