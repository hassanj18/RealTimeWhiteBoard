import type { EventType } from "./types";
import rough from "roughjs/bundled/rough.esm";

export interface CanvasObject {
  objectId: string;
  type: EventType;
  payload: any;
  x: number;
  y: number;
}

function seedFromObjectId(objectId: string): number {
  let h = 2166136261;
  for (let i = 0; i < objectId.length; i++) {
    h ^= objectId.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

export class BoardRenderer {
  draw(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, objects: CanvasObject[]) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const rc = rough.canvas(canvas);

    for (const obj of objects) {
      if (obj.type === "ADD_TEXT") {
        const font = (obj.payload.font as string | undefined) ?? "16px Arial";
        const color = (obj.payload.color as string | undefined) ?? "#000000";
        const text = String(obj.payload.text ?? "");
        const lines = text.split("\n");

        const m = font.match(/(\d+(?:\.\d+)?)px\s*(.*)/);
        const fontSize = m ? Number(m[1]) : 16;
        const lineHeight = Math.round(fontSize * 1.25);

        ctx.font = font;
        ctx.fillStyle = color;

        for (let i = 0; i < lines.length; i++) {
          ctx.fillText(lines[i], obj.x, obj.y + fontSize + i * lineHeight);
        }
      }

      if (obj.type === "ADD_SHAPE") {
        const shape = obj.payload.shape as string;
        const size = (obj.payload.size as number | undefined) ?? 60;
        const width = (obj.payload.width as number | undefined) ?? size;
        const height = (obj.payload.height as number | undefined) ?? size;
        const lineWidth = (obj.payload.lineWidth as number | undefined) ?? 2;
        const strokeColor = (obj.payload.strokeColor as string | undefined) ?? "#111111";
        const fillColor = (obj.payload.fillColor as string | undefined) ?? "transparent";

        const roughOpts = {
          stroke: strokeColor,
          strokeWidth: lineWidth,
          fill: fillColor !== "transparent" ? fillColor : undefined,
          roughness: 1.6,
          bowing: 1.2,
          seed: seedFromObjectId(obj.objectId),
        };

        if (shape === "square") {
          const x = obj.x - size / 2;
          const y = obj.y - size / 2;
          rc.rectangle(x, y, size, size, roughOpts);
        } else if (shape === "rectangle") {
          const x = obj.x - width / 2;
          const y = obj.y - height / 2;
          rc.rectangle(x, y, width, height, roughOpts);
        } else if (shape === "circle") {
          const radius = (obj.payload.radius as number | undefined) ?? size / 2;
          rc.circle(obj.x, obj.y, radius * 2, roughOpts);
        } else if (shape === "triangle") {
          const half = size / 2;
          rc.polygon(
            [
              [obj.x, obj.y - half],
              [obj.x - half, obj.y + half],
              [obj.x + half, obj.y + half],
            ],
            roughOpts,
          );
        } else if (shape === "arrow") {
          const x1 = (obj.payload.x1 as number | undefined) ?? obj.x;
          const y1 = (obj.payload.y1 as number | undefined) ?? obj.y;
          const x2 = (obj.payload.x2 as number | undefined) ?? obj.x;
          const y2 = (obj.payload.y2 as number | undefined) ?? obj.y;

          rc.line(x1, y1, x2, y2, roughOpts);

          const angle = Math.atan2(y2 - y1, x2 - x1);
          const headLen = Math.max(10, lineWidth * 6);
          const a1 = angle + Math.PI * 0.85;
          const a2 = angle - Math.PI * 0.85;
          const hx1 = x2 + headLen * Math.cos(a1);
          const hy1 = y2 + headLen * Math.sin(a1);
          const hx2 = x2 + headLen * Math.cos(a2);
          const hy2 = y2 + headLen * Math.sin(a2);

          rc.line(x2, y2, hx1, hy1, roughOpts);
          rc.line(x2, y2, hx2, hy2, roughOpts);
        }
      }

      if (obj.type === "DRAW_STROKE") {
        const points = (obj.payload.points as Array<{ x: number; y: number }> | undefined) ?? [];
        if (points.length < 2) continue;

        ctx.lineWidth = (obj.payload.lineWidth as number | undefined) ?? 2;
        ctx.strokeStyle = (obj.payload.color as string | undefined) ?? "#ff0000";
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
        ctx.stroke();
      }
    }
  }

  hitTest(objects: CanvasObject[], x: number, y: number): CanvasObject | null {
    for (let i = objects.length - 1; i >= 0; i--) {
      const obj = objects[i];

      if (obj.type === "ADD_TEXT") {
        const text = String(obj.payload.text ?? "");
        const lines = text.split("\n");

        const font = (obj.payload.font as string | undefined) ?? "16px Arial";
        const m = font.match(/(\d+(?:\.\d+)?)px\s*(.*)/);
        const fontSize = m ? Number(m[1]) : 16;
        const lineHeight = Math.round(fontSize * 1.25);

        const width = (obj.payload.width as number | undefined) ?? Math.max(1, ...lines.map((l) => l.length)) * 8;
        const height = (obj.payload.height as number | undefined) ?? Math.max(1, lines.length) * lineHeight;

        if (x >= obj.x && x <= obj.x + width && y >= obj.y && y <= obj.y + height) return obj;
      }

      if (obj.type === "ADD_SHAPE") {
        const shape = obj.payload.shape as string;
        const size = (obj.payload.size as number | undefined) ?? 60;
        const width = (obj.payload.width as number | undefined) ?? size;
        const height = (obj.payload.height as number | undefined) ?? size;
        if (shape === "square" || shape === "triangle") {
          const left = obj.x - size / 2;
          const right = obj.x + size / 2;
          const top = obj.y - size / 2;
          const bottom = obj.y + size / 2;
          if (x >= left && x <= right && y >= top && y <= bottom) return obj;
        }
        if (shape === "rectangle") {
          const left = obj.x - width / 2;
          const right = obj.x + width / 2;
          const top = obj.y - height / 2;
          const bottom = obj.y + height / 2;
          if (x >= left && x <= right && y >= top && y <= bottom) return obj;
        }
        if (shape === "circle") {
          const radius = (obj.payload.radius as number | undefined) ?? size / 2;
          const dx = x - obj.x;
          const dy = y - obj.y;
          if (dx * dx + dy * dy <= radius * radius) return obj;
        }
        if (shape === "arrow") {
          const x1 = (obj.payload.x1 as number | undefined) ?? obj.x;
          const y1 = (obj.payload.y1 as number | undefined) ?? obj.y;
          const x2 = (obj.payload.x2 as number | undefined) ?? obj.x;
          const y2 = (obj.payload.y2 as number | undefined) ?? obj.y;
          const lw = (obj.payload.lineWidth as number | undefined) ?? 2;

          const minX = Math.min(x1, x2);
          const maxX = Math.max(x1, x2);
          const minY = Math.min(y1, y2);
          const maxY = Math.max(y1, y2);
          const tol = Math.max(8, lw * 3);
          if (x < minX - tol || x > maxX + tol || y < minY - tol || y > maxY + tol) continue;

          const dx = x2 - x1;
          const dy = y2 - y1;
          const lenSq = dx * dx + dy * dy;
          if (lenSq === 0) return obj;

          const t = ((x - x1) * dx + (y - y1) * dy) / lenSq;
          const clamped = Math.max(0, Math.min(1, t));
          const projX = x1 + clamped * dx;
          const projY = y1 + clamped * dy;
          const distSq = (x - projX) * (x - projX) + (y - projY) * (y - projY);
          if (distSq <= tol * tol) return obj;
        }
      }

      if (obj.type === "DRAW_STROKE") {
        const points = (obj.payload.points as Array<{ x: number; y: number }> | undefined) ?? [];
        if (points.length === 0) continue;

        let minX = points[0].x;
        let minY = points[0].y;
        let maxX = points[0].x;
        let maxY = points[0].y;

        for (let p = 1; p < points.length; p++) {
          const pt = points[p];
          minX = Math.min(minX, pt.x);
          minY = Math.min(minY, pt.y);
          maxX = Math.max(maxX, pt.x);
          maxY = Math.max(maxY, pt.y);
        }

        const tolerance = 6;
        if (x >= minX - tolerance && x <= maxX + tolerance && y >= minY - tolerance && y <= maxY + tolerance) {
          return obj;
        }
      }
    }

    return null;
  }
}
