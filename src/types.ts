export type Tool = "select" | "line" | "rect" | "circle" | "pan";

export interface BaseShape {
  id: string;
  type: "line" | "rect" | "circle";
  stroke: string;
  fill: string;
  strokeWidth: number;
}

export interface LineShape extends BaseShape {
  type: "line";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface RectShape extends BaseShape {
  type: "rect";
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}

export interface CircleShape extends BaseShape {
  type: "circle";
  cx: number;
  cy: number;
  radius: number;
}

export type Shape = LineShape | RectShape | CircleShape;

export interface ViewState {
  scale: number;
  offsetX: number;
  offsetY: number;
}
