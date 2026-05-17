import { useCad } from "../store/cadStore";
import type { Shape } from "../types";

function NumberRow({
  label,
  value,
  onChange,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  step?: number;
}) {
  return (
    <div className="row">
      <label>{label}</label>
      <input
        type="number"
        value={Number.isFinite(value) ? Math.round(value * 100) / 100 : 0}
        step={step}
        onChange={(e) => onChange(parseFloat(e.target.value || "0"))}
      />
    </div>
  );
}

export function PropertiesPanel() {
  const selected = useCad((s) => s.history.present.find((x) => x.id === s.selectedId));
  const updateShape = useCad((s) => s.updateShape);
  const deleteShape = useCad((s) => s.deleteShape);
  const stroke = useCad((s) => s.stroke);
  const fill = useCad((s) => s.fill);
  const strokeWidth = useCad((s) => s.strokeWidth);
  const setStroke = useCad((s) => s.setStroke);
  const setFill = useCad((s) => s.setFill);
  const setStrokeWidth = useCad((s) => s.setStrokeWidth);

  const target: Shape | undefined = selected;
  const curStroke = target?.stroke ?? stroke;
  const curFill = target?.fill ?? fill;
  const curSW = target?.strokeWidth ?? strokeWidth;

  function setShapeOrDefault(patch: Partial<Shape>) {
    if (target) {
      updateShape(target.id, patch);
    } else {
      if (patch.stroke !== undefined) setStroke(patch.stroke);
      if (patch.fill !== undefined) setFill(patch.fill);
      if (patch.strokeWidth !== undefined) setStrokeWidth(patch.strokeWidth);
    }
  }

  return (
    <aside className="panel">
      <h3>{target ? "Shape" : "Defaults"}</h3>

      <div className="row">
        <label>Stroke</label>
        <input
          type="color"
          value={hexOrDefault(curStroke)}
          onChange={(e) => setShapeOrDefault({ stroke: e.target.value })}
        />
      </div>
      <div className="row">
        <label>Fill</label>
        <input
          type="color"
          value={hexOrDefault(curFill)}
          onChange={(e) => setShapeOrDefault({ fill: e.target.value })}
        />
      </div>
      <NumberRow
        label="Stroke W"
        value={curSW}
        onChange={(n) => setShapeOrDefault({ strokeWidth: Math.max(0.5, n) })}
        step={0.5}
      />

      {target && (
        <>
          <hr />
          <h4>Geometry ({target.type})</h4>
          {target.type === "line" && (
            <>
              <NumberRow label="x1" value={target.x1} onChange={(n) => updateShape(target.id, { x1: n })} />
              <NumberRow label="y1" value={target.y1} onChange={(n) => updateShape(target.id, { y1: n })} />
              <NumberRow label="x2" value={target.x2} onChange={(n) => updateShape(target.id, { x2: n })} />
              <NumberRow label="y2" value={target.y2} onChange={(n) => updateShape(target.id, { y2: n })} />
            </>
          )}
          {target.type === "rect" && (
            <>
              <NumberRow label="x" value={target.x} onChange={(n) => updateShape(target.id, { x: n })} />
              <NumberRow label="y" value={target.y} onChange={(n) => updateShape(target.id, { y: n })} />
              <NumberRow label="width" value={target.width} onChange={(n) => updateShape(target.id, { width: Math.max(1, n) })} />
              <NumberRow label="height" value={target.height} onChange={(n) => updateShape(target.id, { height: Math.max(1, n) })} />
              <NumberRow label="rotation" value={target.rotation} onChange={(n) => updateShape(target.id, { rotation: n })} />
            </>
          )}
          {target.type === "circle" && (
            <>
              <NumberRow label="cx" value={target.cx} onChange={(n) => updateShape(target.id, { cx: n })} />
              <NumberRow label="cy" value={target.cy} onChange={(n) => updateShape(target.id, { cy: n })} />
              <NumberRow label="radius" value={target.radius} onChange={(n) => updateShape(target.id, { radius: Math.max(1, n) })} />
            </>
          )}
          <button className="danger" onClick={() => deleteShape(target.id)}>Delete</button>
        </>
      )}
    </aside>
  );
}

function hexOrDefault(c: string): string {
  // <input type="color"> requires #rrggbb. Fall back if rgba/named.
  if (/^#[0-9a-fA-F]{6}$/.test(c)) return c;
  return "#1f2937";
}
