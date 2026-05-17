import { useEffect, useMemo, useRef, useState } from "react";
import { Stage, Layer, Line, Rect, Circle, Group, Transformer } from "react-konva";
import type Konva from "konva";
import { useCad } from "../store/cadStore";
import type { Shape } from "../types";

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function snap(v: number, size: number, on: boolean) {
  return on ? Math.round(v / size) * size : v;
}

interface DraftShape {
  type: "line" | "rect" | "circle";
  startX: number;
  startY: number;
  curX: number;
  curY: number;
}

export function Canvas() {
  const stageRef = useRef<Konva.Stage>(null);
  const trRef = useRef<Konva.Transformer>(null);
  const layerRef = useRef<Konva.Layer>(null);

  const tool = useCad((s) => s.tool);
  const view = useCad((s) => s.view);
  const setView = useCad((s) => s.setView);
  const shapes = useCad((s) => s.history.present);
  const selectedId = useCad((s) => s.selectedId);
  const setSelected = useCad((s) => s.setSelected);
  const addShape = useCad((s) => s.addShape);
  const updateShape = useCad((s) => s.updateShape);
  const deleteShape = useCad((s) => s.deleteShape);
  const undo = useCad((s) => s.undo);
  const redo = useCad((s) => s.redo);
  const stroke = useCad((s) => s.stroke);
  const fill = useCad((s) => s.fill);
  const strokeWidth = useCad((s) => s.strokeWidth);
  const gridSize = useCad((s) => s.gridSize);
  const snapToGrid = useCad((s) => s.snapToGrid);
  const showGrid = useCad((s) => s.showGrid);

  const [size, setSize] = useState({ w: window.innerWidth, h: window.innerHeight });
  const [draft, setDraft] = useState<DraftShape | null>(null);
  const isPanning = useRef(false);
  const panStart = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  // Resize
  useEffect(() => {
    const onResize = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      const meta = e.ctrlKey || e.metaKey;
      if (meta && e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (meta && (e.key.toLowerCase() === "y" || (e.key.toLowerCase() === "z" && e.shiftKey))) {
        e.preventDefault();
        redo();
      } else if ((e.key === "Delete" || e.key === "Backspace") && selectedId) {
        e.preventDefault();
        deleteShape(selectedId);
      } else if (e.key === "Escape") {
        setSelected(null);
        setDraft(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo, selectedId, deleteShape, setSelected]);

  // Attach transformer to selected shape
  useEffect(() => {
    const tr = trRef.current;
    const layer = layerRef.current;
    if (!tr || !layer) return;
    if (selectedId) {
      const node = layer.findOne(`#${selectedId}`);
      if (node) {
        tr.nodes([node]);
        tr.getLayer()?.batchDraw();
        return;
      }
    }
    tr.nodes([]);
    tr.getLayer()?.batchDraw();
  }, [selectedId, shapes]);

  // Convert pointer to world coords
  function getWorldPos(): { x: number; y: number } | null {
    const stage = stageRef.current;
    if (!stage) return null;
    const p = stage.getPointerPosition();
    if (!p) return null;
    return {
      x: (p.x - view.offsetX) / view.scale,
      y: (p.y - view.offsetY) / view.scale,
    };
  }

  const onMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const stage = stageRef.current;
    if (!stage) return;

    // Middle click or pan tool => pan
    if (e.evt.button === 1 || tool === "pan") {
      isPanning.current = true;
      const p = stage.getPointerPosition();
      if (p) {
        panStart.current = { x: p.x, y: p.y, ox: view.offsetX, oy: view.offsetY };
      }
      return;
    }
    if (e.evt.button !== 0) return;

    const clickedOnEmpty = e.target === stage;
    const pos = getWorldPos();
    if (!pos) return;
    const x = snap(pos.x, gridSize, snapToGrid);
    const y = snap(pos.y, gridSize, snapToGrid);

    if (tool === "select") {
      if (clickedOnEmpty) setSelected(null);
      return;
    }

    setDraft({ type: tool, startX: x, startY: y, curX: x, curY: y });
  };

  const onMouseMove = () => {
    const stage = stageRef.current;
    if (!stage) return;

    if (isPanning.current && panStart.current) {
      const p = stage.getPointerPosition();
      if (!p) return;
      setView({
        offsetX: panStart.current.ox + (p.x - panStart.current.x),
        offsetY: panStart.current.oy + (p.y - panStart.current.y),
      });
      return;
    }

    if (!draft) return;
    const pos = getWorldPos();
    if (!pos) return;
    setDraft({
      ...draft,
      curX: snap(pos.x, gridSize, snapToGrid),
      curY: snap(pos.y, gridSize, snapToGrid),
    });
  };

  const onMouseUp = () => {
    if (isPanning.current) {
      isPanning.current = false;
      panStart.current = null;
      return;
    }
    if (!draft) return;

    const { startX, startY, curX, curY, type } = draft;
    const dx = curX - startX;
    const dy = curY - startY;
    const minSize = 1;

    let shape: Shape | null = null;
    const id = uid();
    const common = { id, stroke, fill, strokeWidth };

    if (type === "line") {
      if (Math.hypot(dx, dy) < minSize) {
        setDraft(null);
        return;
      }
      shape = { ...common, type: "line", x1: startX, y1: startY, x2: curX, y2: curY };
    } else if (type === "rect") {
      const x = Math.min(startX, curX);
      const y = Math.min(startY, curY);
      const w = Math.abs(dx);
      const h = Math.abs(dy);
      if (w < minSize || h < minSize) {
        setDraft(null);
        return;
      }
      shape = { ...common, type: "rect", x, y, width: w, height: h, rotation: 0 };
    } else if (type === "circle") {
      const r = Math.hypot(dx, dy);
      if (r < minSize) {
        setDraft(null);
        return;
      }
      shape = { ...common, type: "circle", cx: startX, cy: startY, radius: r };
    }

    if (shape) addShape(shape);
    setDraft(null);
  };

  const onWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;
    const oldScale = view.scale;
    const factor = e.evt.deltaY > 0 ? 1 / 1.1 : 1.1;
    const newScale = Math.min(20, Math.max(0.1, oldScale * factor));
    const wx = (pointer.x - view.offsetX) / oldScale;
    const wy = (pointer.y - view.offsetY) / oldScale;
    setView({
      scale: newScale,
      offsetX: pointer.x - wx * newScale,
      offsetY: pointer.y - wy * newScale,
    });
  };

  // Grid lines (in screen space, computed from world bounds)
  const gridLines = useMemo(() => {
    if (!showGrid) return null;
    const lines: JSX.Element[] = [];
    const minX = -view.offsetX / view.scale;
    const minY = -view.offsetY / view.scale;
    const maxX = minX + size.w / view.scale;
    const maxY = minY + size.h / view.scale;
    const startX = Math.floor(minX / gridSize) * gridSize;
    const startY = Math.floor(minY / gridSize) * gridSize;
    const majorEvery = 5;

    for (let x = startX; x <= maxX; x += gridSize) {
      const isMajor = Math.round(x / gridSize) % majorEvery === 0;
      lines.push(
        <Line
          key={`v${x}`}
          points={[x, minY, x, maxY]}
          stroke={isMajor ? "#cbd5e1" : "#e5e7eb"}
          strokeWidth={1 / view.scale}
          listening={false}
        />
      );
    }
    for (let y = startY; y <= maxY; y += gridSize) {
      const isMajor = Math.round(y / gridSize) % majorEvery === 0;
      lines.push(
        <Line
          key={`h${y}`}
          points={[minX, y, maxX, y]}
          stroke={isMajor ? "#cbd5e1" : "#e5e7eb"}
          strokeWidth={1 / view.scale}
          listening={false}
        />
      );
    }
    // Origin axes
    lines.push(
      <Line key="ax" points={[minX, 0, maxX, 0]} stroke="#94a3b8" strokeWidth={1 / view.scale} listening={false} />,
      <Line key="ay" points={[0, minY, 0, maxY]} stroke="#94a3b8" strokeWidth={1 / view.scale} listening={false} />
    );
    return lines;
  }, [view, size, gridSize, showGrid]);

  function renderShape(s: Shape) {
    const common = {
      id: s.id,
      key: s.id,
      stroke: s.stroke,
      strokeWidth: s.strokeWidth,
      strokeScaleEnabled: false,
      fill: s.type === "line" ? undefined : s.fill,
      onClick: () => tool === "select" && setSelected(s.id),
      onTap: () => tool === "select" && setSelected(s.id),
      draggable: tool === "select",
    };
    if (s.type === "line") {
      // Use a Group around a Line so dragging the group offsets coordinates.
      return (
        <Line
          {...common}
          points={[s.x1, s.y1, s.x2, s.y2]}
          hitStrokeWidth={Math.max(8, s.strokeWidth + 6)}
          onDragEnd={(e) => {
            const dx = e.target.x();
            const dy = e.target.y();
            e.target.position({ x: 0, y: 0 });
            updateShape(s.id, { x1: s.x1 + dx, y1: s.y1 + dy, x2: s.x2 + dx, y2: s.y2 + dy });
          }}
        />
      );
    }
    if (s.type === "rect") {
      return (
        <Rect
          {...common}
          x={s.x}
          y={s.y}
          width={s.width}
          height={s.height}
          rotation={s.rotation}
          onDragEnd={(e) => updateShape(s.id, { x: e.target.x(), y: e.target.y() })}
          onTransformEnd={(e) => {
            const node = e.target as Konva.Rect;
            const sx = node.scaleX();
            const sy = node.scaleY();
            updateShape(s.id, {
              x: node.x(),
              y: node.y(),
              width: Math.max(1, node.width() * sx),
              height: Math.max(1, node.height() * sy),
              rotation: node.rotation(),
            });
            node.scaleX(1);
            node.scaleY(1);
          }}
        />
      );
    }
    return (
      <Circle
        {...common}
        x={s.cx}
        y={s.cy}
        radius={s.radius}
        onDragEnd={(e) => updateShape(s.id, { cx: e.target.x(), cy: e.target.y() })}
        onTransformEnd={(e) => {
          const node = e.target as Konva.Circle;
          const sx = node.scaleX();
          updateShape(s.id, {
            cx: node.x(),
            cy: node.y(),
            radius: Math.max(1, s.radius * sx),
          });
          node.scaleX(1);
          node.scaleY(1);
        }}
      />
    );
  }

  const cursorStyle = (() => {
    if (tool === "pan") return "grab";
    if (tool === "select") return "default";
    return "crosshair";
  })();

  return (
    <div style={{ flex: 1, position: "relative", cursor: cursorStyle, background: "#f8fafc" }}>
      <Stage
        ref={stageRef}
        width={size.w}
        height={size.h}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onTouchStart={onMouseDown as never}
        onTouchMove={onMouseMove as never}
        onTouchEnd={onMouseUp as never}
        onWheel={onWheel}
        scaleX={view.scale}
        scaleY={view.scale}
        x={view.offsetX}
        y={view.offsetY}
      >
        <Layer listening={false}>{gridLines}</Layer>
        <Layer ref={layerRef}>
          <Group>{shapes.map(renderShape)}</Group>

          {/* Draft preview */}
          {draft && draft.type === "line" && (
            <Line
              points={[draft.startX, draft.startY, draft.curX, draft.curY]}
              stroke={stroke}
              strokeWidth={strokeWidth}
              strokeScaleEnabled={false}
              dash={[6, 4]}
              listening={false}
            />
          )}
          {draft && draft.type === "rect" && (
            <Rect
              x={Math.min(draft.startX, draft.curX)}
              y={Math.min(draft.startY, draft.curY)}
              width={Math.abs(draft.curX - draft.startX)}
              height={Math.abs(draft.curY - draft.startY)}
              stroke={stroke}
              strokeWidth={strokeWidth}
              fill={fill}
              strokeScaleEnabled={false}
              dash={[6, 4]}
              listening={false}
            />
          )}
          {draft && draft.type === "circle" && (
            <Circle
              x={draft.startX}
              y={draft.startY}
              radius={Math.hypot(draft.curX - draft.startX, draft.curY - draft.startY)}
              stroke={stroke}
              strokeWidth={strokeWidth}
              fill={fill}
              strokeScaleEnabled={false}
              dash={[6, 4]}
              listening={false}
            />
          )}

          <Transformer
            ref={trRef}
            rotateEnabled={true}
            ignoreStroke={true}
            anchorSize={8}
            borderStroke="#3b82f6"
            anchorStroke="#3b82f6"
            anchorFill="#fff"
          />
        </Layer>
      </Stage>
    </div>
  );
}
