# AI HQ — Visual Headquarters

A game-inspired visual control center for a future autonomous AI workforce.

## Phase 1: Game world

This branch establishes the visual foundation:
- Fixed, interconnected 10-room headquarters map.
- Top-down spaceship-style environment.
- Clickable departments and character inspection.
- Room directory, search, labels and zoom controls.
- Dynamic-Island-inspired notch (visual shell only).
- Responsive layout and reduced-motion support.

## Important status

This is a **frontend-only visual foundation**. Characters are illustrative placeholders, not running AI agents. Room status explicitly indicates that no backend is connected. Real agent movement, task state, meetings, notifications and push delivery will be connected in later phases.

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