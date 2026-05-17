import { create } from "zustand";
import type { Shape, Tool, ViewState } from "../types";

interface HistoryState {
  past: Shape[][];
  present: Shape[];
  future: Shape[][];
}

interface CadState {
  // Document
  history: HistoryState;
  // Tool state
  tool: Tool;
  selectedId: string | null;
  // Style defaults
  stroke: string;
  fill: string;
  strokeWidth: number;
  // Viewport
  view: ViewState;
  // Snap
  gridSize: number;
  snapToGrid: boolean;
  showGrid: boolean;

  // Actions
  setTool: (t: Tool) => void;
  setSelected: (id: string | null) => void;
  setStroke: (c: string) => void;
  setFill: (c: string) => void;
  setStrokeWidth: (n: number) => void;
  setView: (v: Partial<ViewState>) => void;
  setSnap: (b: boolean) => void;
  setShowGrid: (b: boolean) => void;
  setGridSize: (n: number) => void;

  // Document actions (push to history)
  addShape: (s: Shape) => void;
  updateShape: (id: string, patch: Partial<Shape>) => void;
  deleteShape: (id: string) => void;
  clear: () => void;

  undo: () => void;
  redo: () => void;

  // Helpers
  getShapes: () => Shape[];
  getSelected: () => Shape | undefined;
}

const emptyHistory: HistoryState = { past: [], present: [], future: [] };

function commit(h: HistoryState, next: Shape[]): HistoryState {
  return { past: [...h.past, h.present], present: next, future: [] };
}

export const useCad = create<CadState>((set, get) => ({
  history: emptyHistory,
  tool: "select",
  selectedId: null,
  stroke: "#1f2937",
  fill: "rgba(59, 130, 246, 0.15)",
  strokeWidth: 2,
  view: { scale: 1, offsetX: 0, offsetY: 0 },
  gridSize: 20,
  snapToGrid: true,
  showGrid: true,

  setTool: (t) => set({ tool: t, selectedId: t === "select" ? get().selectedId : null }),
  setSelected: (id) => set({ selectedId: id }),
  setStroke: (c) => set({ stroke: c }),
  setFill: (c) => set({ fill: c }),
  setStrokeWidth: (n) => set({ strokeWidth: n }),
  setView: (v) => set({ view: { ...get().view, ...v } }),
  setSnap: (b) => set({ snapToGrid: b }),
  setShowGrid: (b) => set({ showGrid: b }),
  setGridSize: (n) => set({ gridSize: Math.max(2, Math.round(n)) }),

  addShape: (s) =>
    set((st) => ({
      history: commit(st.history, [...st.history.present, s]),
      selectedId: s.id,
    })),

  updateShape: (id, patch) =>
    set((st) => {
      const next = st.history.present.map((sh) =>
        sh.id === id ? ({ ...sh, ...patch } as Shape) : sh
      );
      return { history: commit(st.history, next) };
    }),

  deleteShape: (id) =>
    set((st) => {
      const next = st.history.present.filter((sh) => sh.id !== id);
      return {
        history: commit(st.history, next),
        selectedId: st.selectedId === id ? null : st.selectedId,
      };
    }),

  clear: () =>
    set((st) => ({
      history: commit(st.history, []),
      selectedId: null,
    })),

  undo: () =>
    set((st) => {
      const { past, present, future } = st.history;
      if (past.length === 0) return {};
      const previous = past[past.length - 1];
      return {
        history: {
          past: past.slice(0, -1),
          present: previous,
          future: [present, ...future],
        },
        selectedId: null,
      };
    }),

  redo: () =>
    set((st) => {
      const { past, present, future } = st.history;
      if (future.length === 0) return {};
      const next = future[0];
      return {
        history: { past: [...past, present], present: next, future: future.slice(1) },
        selectedId: null,
      };
    }),

  getShapes: () => get().history.present,
  getSelected: () => {
    const { selectedId, history } = get();
    return history.present.find((s) => s.id === selectedId);
  },
}));
