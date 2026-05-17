# Kiro CAD

A lightweight 2D CAD-style web app built with React, TypeScript, Vite, and Konva.

## Features

- Drawing tools: Select, Line, Rectangle, Circle, Pan
- Click-and-drag drawing with live preview
- Move, resize, and rotate shapes via transform handles
- Edit precise geometry from the properties panel
- Stroke / fill / stroke-width customization (per-shape or as defaults)
- Grid background with snap-to-grid (configurable grid size)
- Pan (Space + drag, middle-click, or Pan tool) and mouse-wheel zoom
- Unlimited undo / redo
- Export drawings to JSON or SVG
- Import drawings from JSON

## Keyboard shortcuts

| Key             | Action            |
| --------------- | ----------------- |
| V               | Select tool       |
| L               | Line tool         |
| R               | Rectangle tool    |
| C               | Circle tool       |
| Space           | Pan tool          |
| Ctrl/Cmd + Z    | Undo              |
| Ctrl/Cmd + Y    | Redo              |
| Ctrl/Cmd + Shift + Z | Redo         |
| Delete / Backspace | Delete selection |
| Esc             | Deselect          |

## Develop

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build
npm run preview  # preview the production build
```
