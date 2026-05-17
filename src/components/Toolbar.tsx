import { useCad } from "../store/cadStore";
import type { Shape, Tool } from "../types";

const TOOLS: { id: Tool; label: string; hint: string }[] = [
  { id: "select", label: "Select", hint: "V" },
  { id: "line", label: "Line", hint: "L" },
  { id: "rect", label: "Rectangle", hint: "R" },
  { id: "circle", label: "Circle", hint: "C" },
  { id: "pan", label: "Pan", hint: "Space" },
];

function shapesToSVG(shapes: Shape[]): string {
  if (shapes.length === 0) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"></svg>`;
  }
  // Compute bounds
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const s of shapes) {
    if (s.type === "line") {
      minX = Math.min(minX, s.x1, s.x2);
      minY = Math.min(minY, s.y1, s.y2);
      maxX = Math.max(maxX, s.x1, s.x2);
      maxY = Math.max(maxY, s.y1, s.y2);
    } else if (s.type === "rect") {
      minX = Math.min(minX, s.x);
      minY = Math.min(minY, s.y);
      maxX = Math.max(maxX, s.x + s.width);
      maxY = Math.max(maxY, s.y + s.height);
    } else {
      minX = Math.min(minX, s.cx - s.radius);
      minY = Math.min(minY, s.cy - s.radius);
      maxX = Math.max(maxX, s.cx + s.radius);
      maxY = Math.max(maxY, s.cy + s.radius);
    }
  }
  const pad = 10;
  const w = maxX - minX + pad * 2;
  const h = maxY - minY + pad * 2;
  const body = shapes
    .map((s) => {
      const stroke = s.stroke;
      const sw = s.strokeWidth;
      const fill = s.type === "line" ? "none" : s.fill;
      if (s.type === "line") {
        return `<line x1="${s.x1}" y1="${s.y1}" x2="${s.x2}" y2="${s.y2}" stroke="${stroke}" stroke-width="${sw}" />`;
      }
      if (s.type === "rect") {
        const tx = s.x + s.width / 2;
        const ty = s.y + s.height / 2;
        return `<rect x="${s.x}" y="${s.y}" width="${s.width}" height="${s.height}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" transform="rotate(${s.rotation} ${tx} ${ty})" />`;
      }
      return `<circle cx="${s.cx}" cy="${s.cy}" r="${s.radius}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" />`;
    })
    .join("\n  ");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="${minX - pad} ${minY - pad} ${w} ${h}">\n  ${body}\n</svg>`;
}

function download(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function Toolbar() {
  const tool = useCad((s) => s.tool);
  const setTool = useCad((s) => s.setTool);
  const undo = useCad((s) => s.undo);
  const redo = useCad((s) => s.redo);
  const clear = useCad((s) => s.clear);
  const shapes = useCad((s) => s.history.present);
  const past = useCad((s) => s.history.past);
  const future = useCad((s) => s.history.future);
  const view = useCad((s) => s.view);
  const setView = useCad((s) => s.setView);
  const showGrid = useCad((s) => s.showGrid);
  const setShowGrid = useCad((s) => s.setShowGrid);
  const snapToGrid = useCad((s) => s.snapToGrid);
  const setSnap = useCad((s) => s.setSnap);
  const gridSize = useCad((s) => s.gridSize);
  const setGridSize = useCad((s) => s.setGridSize);

  const exportJSON = () => {
    const data = JSON.stringify({ shapes }, null, 2);
    download("drawing.json", data, "application/json");
  };
  const exportSVG = () => {
    download("drawing.svg", shapesToSVG(shapes), "image/svg+xml");
  };

  const importJSON = async (file: File) => {
    const text = await file.text();
    try {
      const parsed = JSON.parse(text);
      const list: Shape[] = Array.isArray(parsed) ? parsed : parsed.shapes ?? [];
      // Bypass history wrap by clearing and adding sequentially
      useCad.getState().clear();
      list.forEach((s) => useCad.getState().addShape(s));
    } catch (err) {
      alert("Invalid JSON file");
    }
  };

  return (
    <div className="toolbar">
      <div className="group">
        {TOOLS.map((t) => (
          <button
            key={t.id}
            className={`tool-btn ${tool === t.id ? "active" : ""}`}
            onClick={() => setTool(t.id)}
            title={`${t.label} (${t.hint})`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="group">
        <button onClick={undo} disabled={past.length === 0} title="Undo (Ctrl+Z)">Undo</button>
        <button onClick={redo} disabled={future.length === 0} title="Redo (Ctrl+Y)">Redo</button>
        <button onClick={() => { if (confirm("Clear all shapes?")) clear(); }}>Clear</button>
      </div>

      <div className="group">
        <label className="chk">
          <input type="checkbox" checked={showGrid} onChange={(e) => setShowGrid(e.target.checked)} />
          Grid
        </label>
        <label className="chk">
          <input type="checkbox" checked={snapToGrid} onChange={(e) => setSnap(e.target.checked)} />
          Snap
        </label>
        <label className="chk">
          Size
          <input
            type="number"
            min={2}
            max={200}
            value={gridSize}
            onChange={(e) => setGridSize(parseInt(e.target.value || "20", 10))}
            style={{ width: 56 }}
          />
        </label>
      </div>

      <div className="group">
        <button onClick={() => setView({ scale: Math.min(20, view.scale * 1.2) })}>Zoom +</button>
        <button onClick={() => setView({ scale: Math.max(0.1, view.scale / 1.2) })}>Zoom −</button>
        <button onClick={() => setView({ scale: 1, offsetX: 0, offsetY: 0 })}>Reset View</button>
        <span className="zoom-readout">{Math.round(view.scale * 100)}%</span>
      </div>

      <div className="group right">
        <button onClick={exportJSON}>Export JSON</button>
        <button onClick={exportSVG}>Export SVG</button>
        <label className="file-btn">
          Import JSON
          <input
            type="file"
            accept="application/json"
            style={{ display: "none" }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) importJSON(f);
              e.currentTarget.value = "";
            }}
          />
        </label>
      </div>
    </div>
  );
}
