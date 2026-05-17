import { useEffect } from "react";
import { Canvas } from "./components/Canvas";
import { Toolbar } from "./components/Toolbar";
import { PropertiesPanel } from "./components/PropertiesPanel";
import { useCad } from "./store/cadStore";

export default function App() {
  const setTool = useCad((s) => s.setTool);
  const shapeCount = useCad((s) => s.history.present.length);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
      const k = e.key.toLowerCase();
      if (k === "v") setTool("select");
      else if (k === "l") setTool("line");
      else if (k === "r") setTool("rect");
      else if (k === "c") setTool("circle");
      else if (e.code === "Space") setTool("pan");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setTool]);

  return (
    <div className="app">
      <header className="header">
        <div className="brand">Kiro CAD</div>
        <Toolbar />
      </header>
      <main className="main">
        <Canvas />
        <PropertiesPanel />
      </main>
      <footer className="status">
        <span>{shapeCount} shape{shapeCount === 1 ? "" : "s"}</span>
        <span>Shortcuts: V Select · L Line · R Rect · C Circle · Space Pan · Ctrl+Z/Y Undo/Redo · Del Delete</span>
      </footer>
    </div>
  );
}
