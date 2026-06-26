export type EventType =
  | "ADD_TEXT"
  | "ADD_SHAPE"
  | "DRAW_STROKE"
  | "MOVE_OBJECT"
  | "EDIT_TEXT"
  | "UPDATE_OBJECT"
  | "DELETE_OBJECT";

export interface BoardEvent {
  boardId: string;
  objectId: string;
  type: EventType;
  payload: Record<string, any>;
  userId: string;
  timestamp: number;
}

export interface TextPayload {
  text: string;
  x: number;
  y: number;
  font?: string;
  color?: string;
  backgroundColor?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
}

export interface Point {
  x: number;
  y: number;
}

export interface StrokePayload {
  points: Point[];
  color?: string;
  lineWidth?: number;
}

export type ShapeType = "square" | "rectangle" | "circle" | "triangle" | "arrow";

export interface ShapePayload {
  shape: ShapeType;
  x: number;
  y: number;
  size?: number;
  width?: number;
  height?: number;
  radius?: number;
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  strokeColor?: string;
  fillColor?: string;
  lineWidth?: number;
}
