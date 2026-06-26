import type { BoardEvent } from "./types";

export interface SnapshotPoint {
  x: number;
  y: number;
}

export interface SnapshotObject {
  objectId: string;
  kind: number | string;
  x: number;
  y: number;
  strokeColor?: string | null;
  fillColor?: string | null;
  lineWidth?: number | null;
  size?: number | null;
  width?: number | null;
  height?: number | null;
  radius?: number | null;
  points?: SnapshotPoint[] | null;
  color?: string | null;
  text?: string | null;
  font?: string | null;
  createdByUserId?: string | null;
  updatedAt: number;
}

export interface BoardSnapshotResponse {
  boardId: string;
  objects: SnapshotObject[];
  lastEventTimestamp?: number;
}

function normalizeKind(kind: number | string): string {
  if (typeof kind === "number") {
    return ["Square", "Rectangle", "Circle", "Triangle", "Stroke", "Text"][kind] ?? "Square";
  }
  return kind;
}

function readObjectId(obj: SnapshotObject): string {
  return obj.objectId || (obj as { ObjectId?: string }).ObjectId || "";
}

function readPoints(obj: SnapshotObject): SnapshotPoint[] {
  const points = obj.points ?? (obj as { Points?: SnapshotPoint[] }).Points ?? [];
  if (points.length === 0) {
    return points;
  }

  const first = points[0];
  const dx = obj.x - first.x;
  const dy = obj.y - first.y;
  if (Math.abs(dx) < 0.01 && Math.abs(dy) < 0.01) {
    return points;
  }

  return points.map((p) => ({ x: p.x + dx, y: p.y + dy }));
}

export function snapshotObjectsToEvents(
  boardId: string,
  objects: SnapshotObject[],
  fallbackUserId = "snapshot"
): BoardEvent[] {
  return objects.map((obj) => {
    const objectId = readObjectId(obj);
    const userId = obj.createdByUserId ?? (obj as { CreatedByUserId?: string }).CreatedByUserId ?? fallbackUserId;
    const timestamp = obj.updatedAt ?? (obj as { UpdatedAt?: number }).UpdatedAt ?? Date.now();
    const kind = normalizeKind(obj.kind ?? (obj as { Kind?: number | string }).Kind ?? "Square");

    switch (kind) {
      case "Stroke":
        return {
          boardId,
          objectId,
          type: "DRAW_STROKE",
          payload: {
            points: readPoints(obj),
            color: obj.color ?? (obj as { Color?: string }).Color ?? "#111827",
            lineWidth: obj.lineWidth ?? (obj as { LineWidth?: number }).LineWidth ?? 2,
          },
          userId,
          timestamp,
        };

      case "Text":
        return {
          boardId,
          objectId,
          type: "ADD_TEXT",
          payload: {
            text: obj.text ?? (obj as { Text?: string }).Text ?? "",
            x: obj.x,
            y: obj.y,
            width: obj.width ?? (obj as { Width?: number }).Width ?? 120,
            height: obj.height ?? (obj as { Height?: number }).Height ?? 44,
            font: obj.font ?? (obj as { Font?: string }).Font ?? "16px Arial",
            color: obj.color ?? (obj as { Color?: string }).Color ?? "#000000",
          },
          userId,
          timestamp,
        };

      case "Square":
        return {
          boardId,
          objectId,
          type: "ADD_SHAPE",
          payload: {
            shape: "square",
            x: obj.x,
            y: obj.y,
            size: obj.size ?? (obj as { Size?: number }).Size ?? 60,
            strokeColor: obj.strokeColor ?? (obj as { StrokeColor?: string }).StrokeColor ?? "#111111",
            fillColor: obj.fillColor ?? (obj as { FillColor?: string }).FillColor ?? "transparent",
            lineWidth: obj.lineWidth ?? (obj as { LineWidth?: number }).LineWidth ?? 2,
          },
          userId,
          timestamp,
        };

      case "Rectangle":
        return {
          boardId,
          objectId,
          type: "ADD_SHAPE",
          payload: {
            shape: "rectangle",
            x: obj.x,
            y: obj.y,
            width: obj.width ?? (obj as { Width?: number }).Width ?? 60,
            height: obj.height ?? (obj as { Height?: number }).Height ?? 60,
            strokeColor: obj.strokeColor ?? (obj as { StrokeColor?: string }).StrokeColor ?? "#111111",
            fillColor: obj.fillColor ?? (obj as { FillColor?: string }).FillColor ?? "transparent",
            lineWidth: obj.lineWidth ?? (obj as { LineWidth?: number }).LineWidth ?? 2,
          },
          userId,
          timestamp,
        };

      case "Circle":
        return {
          boardId,
          objectId,
          type: "ADD_SHAPE",
          payload: {
            shape: "circle",
            x: obj.x,
            y: obj.y,
            radius: obj.radius ?? (obj as { Radius?: number }).Radius ?? 30,
            strokeColor: obj.strokeColor ?? (obj as { StrokeColor?: string }).StrokeColor ?? "#111111",
            fillColor: obj.fillColor ?? (obj as { FillColor?: string }).FillColor ?? "transparent",
            lineWidth: obj.lineWidth ?? (obj as { LineWidth?: number }).LineWidth ?? 2,
          },
          userId,
          timestamp,
        };

      case "Triangle":
        return {
          boardId,
          objectId,
          type: "ADD_SHAPE",
          payload: {
            shape: "triangle",
            x: obj.x,
            y: obj.y,
            size: obj.size ?? (obj as { Size?: number }).Size ?? 60,
            strokeColor: obj.strokeColor ?? (obj as { StrokeColor?: string }).StrokeColor ?? "#111111",
            fillColor: obj.fillColor ?? (obj as { FillColor?: string }).FillColor ?? "transparent",
            lineWidth: obj.lineWidth ?? (obj as { LineWidth?: number }).LineWidth ?? 2,
          },
          userId,
          timestamp,
        };

      default:
        return {
          boardId,
          objectId,
          type: "ADD_SHAPE",
          payload: {
            shape: "square",
            x: obj.x,
            y: obj.y,
            size: obj.size ?? (obj as { Size?: number }).Size ?? 60,
            strokeColor: obj.strokeColor ?? (obj as { StrokeColor?: string }).StrokeColor ?? "#111111",
            fillColor: obj.fillColor ?? (obj as { FillColor?: string }).FillColor ?? "transparent",
            lineWidth: obj.lineWidth ?? (obj as { LineWidth?: number }).LineWidth ?? 2,
          },
          userId,
          timestamp,
        };
    }
  });
}
