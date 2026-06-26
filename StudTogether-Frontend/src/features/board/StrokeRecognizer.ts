import type { ShapePayload, ShapeType } from "./types";

export type RecognizedShape =
  | {
      shape: Extract<ShapeType, "circle" | "rectangle" | "triangle">;
      payload: ShapePayload;
    }
  | null;

function distance(a: { x: number; y: number }, b: { x: number; y: number }) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function boundingBox(points: Array<{ x: number; y: number }>) {
  let minX = points[0].x;
  let minY = points[0].y;
  let maxX = points[0].x;
  let maxY = points[0].y;

  for (let i = 1; i < points.length; i++) {
    const p = points[i];
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }

  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}

function isClosed(points: Array<{ x: number; y: number }>) {
  if (points.length < 6) return false;
  const start = points[0];
  const end = points[points.length - 1];
  const { width, height } = boundingBox(points);
  const diag = Math.sqrt(width * width + height * height);
  return distance(start, end) <= Math.max(12, diag * 0.15);
}

function perpendicularDistance(p: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return distance(p, a);
  const t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
  const clamped = Math.max(0, Math.min(1, t));
  const projX = a.x + clamped * dx;
  const projY = a.y + clamped * dy;
  return Math.sqrt((p.x - projX) ** 2 + (p.y - projY) ** 2);
}

function simplifyRDP(points: Array<{ x: number; y: number }>, epsilon: number): Array<{ x: number; y: number }> {
  if (points.length <= 2) return points;

  const a = points[0];
  const b = points[points.length - 1];

  let maxDist = -1;
  let index = -1;
  for (let i = 1; i < points.length - 1; i++) {
    const d = perpendicularDistance(points[i], a, b);
    if (d > maxDist) {
      maxDist = d;
      index = i;
    }
  }

  if (maxDist <= epsilon || index === -1) return [a, b];

  const left = simplifyRDP(points.slice(0, index + 1), epsilon);
  const right = simplifyRDP(points.slice(index), epsilon);
  return [...left.slice(0, -1), ...right];
}

function recognizeCircle(points: Array<{ x: number; y: number }>): ShapePayload | null {
  if (points.length < 12) return null;
  if (!isClosed(points)) return null;

  const box = boundingBox(points);
  if (box.width < 20 || box.height < 20) return null;

  const aspect = box.width / box.height;
  if (aspect < 0.75 || aspect > 1.33) return null;

  const cx = (box.minX + box.maxX) / 2;
  const cy = (box.minY + box.maxY) / 2;

  let sum = 0;
  let sumSq = 0;
  for (const p of points) {
    const r = Math.sqrt((p.x - cx) ** 2 + (p.y - cy) ** 2);
    sum += r;
    sumSq += r * r;
  }

  const mean = sum / points.length;
  const variance = sumSq / points.length - mean * mean;
  const std = Math.sqrt(Math.max(0, variance));

  if (std / mean > 0.22) return null;

  return {
    shape: "circle",
    x: cx,
    y: cy,
    radius: mean,
    strokeColor: "#111111",
    fillColor: "transparent",
    lineWidth: 2,
  };
}

export function recognizeStrokeAsArrow(points: Array<{ x: number; y: number }>): ShapePayload | null {
  return recognizeArrow(points);
}

function recognizeRectangle(points: Array<{ x: number; y: number }>): ShapePayload | null {
  if (points.length < 10) return null;
  if (!isClosed(points)) return null;

  const box = boundingBox(points);
  if (box.width < 25 || box.height < 25) return null;

  const tol = Math.max(8, Math.min(box.width, box.height) * 0.08);

  let nearEdgeCount = 0;
  for (const p of points) {
    const nearLeft = Math.abs(p.x - box.minX) <= tol;
    const nearRight = Math.abs(p.x - box.maxX) <= tol;
    const nearTop = Math.abs(p.y - box.minY) <= tol;
    const nearBottom = Math.abs(p.y - box.maxY) <= tol;

    if (nearLeft || nearRight || nearTop || nearBottom) nearEdgeCount++;
  }

  const ratio = nearEdgeCount / points.length;
  if (ratio < 0.72) return null;

  return {
    shape: "rectangle",
    x: (box.minX + box.maxX) / 2,
    y: (box.minY + box.maxY) / 2,
    width: box.width,
    height: box.height,
    strokeColor: "#111111",
    fillColor: "transparent",
    lineWidth: 2,
  };
}

function recognizeArrow(points: Array<{ x: number; y: number }>): ShapePayload | null {
  if (points.length < 8) return null;
  if (isClosed(points)) return null;

  const start = points[0];
  const end = points[points.length - 1];
  const len = distance(start, end);
  if (len < 40) return null;

  let maxDev = 0;
  for (let i = 1; i < points.length - 1; i++) {
    maxDev = Math.max(maxDev, perpendicularDistance(points[i], start, end));
  }

  if (maxDev / len > 0.12) return null;

  return {
    shape: "arrow",
    x: (start.x + end.x) / 2,
    y: (start.y + end.y) / 2,
    x1: start.x,
    y1: start.y,
    x2: end.x,
    y2: end.y,
    strokeColor: "#111111",
    fillColor: "transparent",
    lineWidth: 2,
  };
}

function recognizeTriangle(points: Array<{ x: number; y: number }>): ShapePayload | null {
  if (points.length < 10) return null;
  if (!isClosed(points)) return null;

  const box = boundingBox(points);
  const diag = Math.sqrt(box.width * box.width + box.height * box.height);
  const epsilon = Math.max(8, diag * 0.05);

  const simplified = simplifyRDP(points, epsilon);
  const unique: Array<{ x: number; y: number }> = [];
  const tol = Math.max(10, diag * 0.04);
  for (const p of simplified) {
    if (!unique.some((u) => distance(u, p) <= tol)) unique.push(p);
  }

  if (unique.length !== 3) return null;

  const cx = (box.minX + box.maxX) / 2;
  const cy = (box.minY + box.maxY) / 2;
  const size = Math.max(box.width, box.height);

  return {
    shape: "triangle",
    x: cx,
    y: cy,
    size,
    strokeColor: "#111111",
    fillColor: "transparent",
    lineWidth: 2,
  };
}

export function recognizeStrokeAsShape(points: Array<{ x: number; y: number }>): RecognizedShape {
  const circle = recognizeCircle(points);
  if (circle) return { shape: "circle", payload: circle };

  const rect = recognizeRectangle(points);
  if (rect) return { shape: "rectangle", payload: rect };

  const tri = recognizeTriangle(points);
  if (tri) return { shape: "triangle", payload: tri };

  return null;
}
