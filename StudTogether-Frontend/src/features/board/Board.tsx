import React, { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import rough from "roughjs/bundled/rough.esm";
import type { AppDispatch, RootState } from "../../store/store";
import type { Participant } from "../../store/participantsSlice";
import { addEvent, redo, setBoardState, undo } from "../../store/boardSlice.ts";
import type { BoardEvent } from "./types";
import { BoardRenderer, type CanvasObject } from "./BoardRenderer";
import { recognizeStrokeAsArrow, recognizeStrokeAsShape } from "./StrokeRecognizer";

const API_BASE = (import.meta as any).env?.VITE_API_URL ?? "http://localhost:80";

interface BoardProps {
  boardId: string;
  userId: string;
  onLeave: () => void;
  onEmitEvent?: (event: BoardEvent) => void;
  canEdit?: boolean;
  userRole?: string | null;
  activeParticipants: Participant[];
}

type Tool = "select" | "text";

type DraftShape =
  | {
      shape: "square" | "rectangle" | "circle" | "triangle";
      x1: number;
      y1: number;
      x2: number;
      y2: number;
    }
  | null;

type DraftTextBox =
  | {
      x1: number;
      y1: number;
      x2: number;
      y2: number;
    }
  | null;

export const Board: React.FC<BoardProps> = ({ boardId, userId, onLeave, onEmitEvent, canEdit = true, userRole = null, activeParticipants }) => {
  const canvasWrapRef = useRef<HTMLDivElement | null>(null);
  const token = useSelector((s: RootState) => s.auth.token);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dispatch = useDispatch<AppDispatch>();
  const events = useSelector((s: RootState) => s.board.events);
  const canUndo = useSelector((s: RootState) => s.board.past.length > 0);
  const canRedo = useSelector((s: RootState) => s.board.future.length > 0);

  const safeParticipants = Array.isArray(activeParticipants) ? activeParticipants : [];
  const [participantAccessState, setParticipantAccessState] = useState<Record<string, "view" | "edit">>({});
  const [savingAccessFor, setSavingAccessFor] = useState<string | null>(null);
  const [accessMenuOpen, setAccessMenuOpen] = useState<string | null>(null);
  const isOwner = userRole === "owner";

  useEffect(() => {
    setParticipantAccessState((prev) => {
      const next = { ...prev };
      safeParticipants.forEach((p) => {
        if (p.access && next[p.userId] !== p.access) {
          next[p.userId] = p.access;
        } else if (!next[p.userId]) {
          next[p.userId] = "view";
        }
      });
      return next;
    });
  }, [safeParticipants]);

  const changeParticipantAccess = async (participant: Participant, newAccess?: "view" | "edit") => {
    if (!isOwner || !token) {
      console.error("Cannot change participant access: owner only, and auth token is required.");
      return;
    }
    const currentAccess = participant.access ?? participantAccessState[participant.userId] ?? "view";
    const nextAccess = newAccess ?? (currentAccess === "edit" ? "view" : "edit");
    if (nextAccess === currentAccess) {
      return;
    }
    setSavingAccessFor(participant.userId);

    try {
      const res = await fetch(
        `${API_BASE}/board/${encodeURIComponent(boardId)}/participant/${encodeURIComponent(participant.userId)}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ access: nextAccess }),
        }
      );

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Failed to change access (${res.status})`);
      }

      setParticipantAccessState((current) => ({
        ...current,
        [participant.userId]: nextAccess,
      }));
    } catch (error) {
      console.error("Failed to change participant access:", error);
    } finally {
      setSavingAccessFor(null);
    }
  };

  // Local state for object operations (replace useBoard for now)
  const createEvent = (type: BoardEvent["type"], objectId: string, payload: any): BoardEvent => ({
    boardId,
    objectId,
    type,
    payload,
    userId,
    timestamp: Date.now(),
  });

  const addObject = (type: BoardEvent["type"], payload: any) => {
    if (!canEdit) return;
    const objectId = crypto.randomUUID?.() || String(Math.random());
    const event = createEvent(type, objectId, payload);
    dispatch(addEvent(event));
    onEmitEvent?.(event);
  };

  const moveObject = (objectId: string, x: number, y: number) => {
    if (!canEdit) return;
    const event = createEvent("MOVE_OBJECT", objectId, { x, y });
    dispatch(addEvent(event));
    onEmitEvent?.(event);
  };

  const deleteObject = (objectId: string) => {
    if (!canEdit) return;
    const event = createEvent("DELETE_OBJECT", objectId, {});
    dispatch(addEvent(event));
    onEmitEvent?.(event);
  };

  const editObject = (objectId: string, updates: any) => {
    if (!canEdit) return;
    const event = createEvent("UPDATE_OBJECT", objectId, updates);
    dispatch(addEvent(event));
    onEmitEvent?.(event);
  };

  const [showAccess, setShowAccess] = useState(false);
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [shareLabel, setShareLabel] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [tool, setTool] = useState<Tool | "pen" | "shape">("select");
  const [activeShape, setActiveShape] = useState<"square" | "rectangle" | "circle" | "triangle" | "arrow">("square");
  const [penColor, setPenColor] = useState<string>("#ff0000");
  const [penWidth, setPenWidth] = useState<number>(2);
  const [draftStroke, setDraftStroke] = useState<Array<{ x: number; y: number }> | null>(null);
  const isDrawingRef = useRef(false);
  const draftStrokeRef = useRef<Array<{ x: number; y: number }> | null>(null);
  const arrowHoldTimeoutRef = useRef<number | null>(null);
  const arrowHoldArmedRef = useRef(false);
  const [draftArrow, setDraftArrow] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const isArrowingRef = useRef(false);

  const [draftShape, setDraftShape] = useState<DraftShape>(null);
  const isShapingRef = useRef(false);

  const [draftTextBox, setDraftTextBox] = useState<DraftTextBox>(null);
  const isTextingRef = useRef(false);
  const [textEditor, setTextEditor] = useState<{
    overlayX: number;
    overlayY: number;
    canvasX: number;
    canvasY: number;
    width: number;
    height: number;
    value: string;
  } | null>(null);
  const textAreaRef = useRef<HTMLTextAreaElement | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);

  const dragRafRef = useRef<number | null>(null);
  const pendingDragPosRef = useRef<{ id: string; x: number; y: number } | null>(null);

  const renderer = useMemo(() => new BoardRenderer(), []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.platform);
      const mod = isMac ? e.metaKey : e.ctrlKey;

      const activeEl = document.activeElement;
      const typing =
        activeEl instanceof HTMLInputElement ||
        activeEl instanceof HTMLTextAreaElement ||
        (activeEl instanceof HTMLElement && activeEl.isContentEditable);

      if (mod && (e.key === "z" || e.key === "Z")) {
        e.preventDefault();
        dispatch(undo());
        return;
      }
      if (mod && (e.key === "y" || e.key === "Y")) {
        e.preventDefault();
        dispatch(redo());
        return;
      }

      if (!typing && mod && (e.key === "c" || e.key === "C")) {
        navigator.clipboard.writeText(boardId).catch(() => {});
        setShareLabel("Copied");
        window.setTimeout(() => setShareLabel(null), 1200);
        return;
      }

      if (!typing && (e.key === "p" || e.key === "P")) {
        setTool("pen");
        return;
      }
      if (!typing && (e.key === "t" || e.key === "T")) {
        setTool("text");
        return;
      }
      if (!typing && (e.key === "r" || e.key === "R")) {
        setTool("shape");
        setActiveShape("rectangle");
        return;
      }
      if (!typing && (e.key === "c" || e.key === "C")) {
        setTool("shape");
        setActiveShape("circle");
        return;
      }

      if (!typing && (e.key === "g" || e.key === "G")) {
        setTool("shape");
        setActiveShape("triangle");
        return;
      }

      if (!typing && (e.key === "a" || e.key === "A")) {
        setTool("shape");
        setActiveShape("arrow");
        return;
      }

      if (!typing && (e.key === "Backspace" || e.key === "Delete")) {
        if (selectedId) {
          deleteObject(selectedId);
          setSelectedId(null);
        }
        return;
      }

      if (e.key === "?") {
        setShowKeyboard(true);
      }
      if (e.key === "Escape") {
        if (textEditor) {
          setTextEditor(null);
          isTextingRef.current = false;
          setDraftTextBox(null);
          return;
        }
        setSelectedId(null);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [dispatch, textEditor]);

  useEffect(() => {
    if (!textEditor) return;
    window.setTimeout(() => {
      textAreaRef.current?.focus();
      textAreaRef.current?.setSelectionRange(textEditor.value.length, textEditor.value.length);
    }, 0);
  }, [textEditor]);

  const objects: CanvasObject[] = useMemo(() => {
    const objs: CanvasObject[] = [];
    const objectMap: Record<string, CanvasObject> = {};

    events.forEach((e: BoardEvent) => {
      const existing = objectMap[e.objectId];
      if (e.type === "ADD_TEXT" || e.type === "ADD_SHAPE") {
        const obj: CanvasObject = { ...e, x: e.payload.x, y: e.payload.y };
        objs.push(obj);
        objectMap[e.objectId] = obj;
      } else if (e.type === "DRAW_STROKE") {
        const first = (e.payload.points?.[0] as { x: number; y: number } | undefined) ?? { x: 0, y: 0 };
        const obj: CanvasObject = { ...e, x: first.x, y: first.y };
        objs.push(obj);
        objectMap[e.objectId] = obj;
      } else if (e.type === "MOVE_OBJECT" && existing) {
        const nextX = e.payload.x;
        const nextY = e.payload.y;
        const prevX = existing.x;
        const prevY = existing.y;
        const dx = nextX - existing.x;
        const dy = nextY - existing.y;

        existing.x = nextX;
        existing.y = nextY;

        if (existing.type === "DRAW_STROKE" && Array.isArray(existing.payload.points)) {
          existing.payload = {
            ...existing.payload,
            points: existing.payload.points.map((p: any) => ({ x: p.x + dx, y: p.y + dy })),
          };
        }

        if (existing.type === "ADD_SHAPE" && existing.payload?.shape === "arrow") {
          existing.payload = {
            ...existing.payload,
            x1: (existing.payload.x1 ?? prevX) + dx,
            y1: (existing.payload.y1 ?? prevY) + dy,
            x2: (existing.payload.x2 ?? prevX) + dx,
            y2: (existing.payload.y2 ?? prevY) + dy,
          };
        }
      } else if (e.type === "EDIT_TEXT" && existing) {
        existing.payload = { ...existing.payload, ...e.payload };
      } else if (e.type === "UPDATE_OBJECT" && existing) {
        existing.payload = { ...existing.payload, ...e.payload };
      } else if (e.type === "DELETE_OBJECT" && existing) {
        const index = objs.indexOf(existing);
        if (index !== -1) objs.splice(index, 1);
        delete objectMap[e.objectId];
      }
    });

    return objs;
  }, [events]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    renderer.draw(ctx, canvas, objects);

    if (draftStroke && draftStroke.length >= 2) {
      ctx.lineWidth = penWidth;
      ctx.strokeStyle = penColor;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(draftStroke[0].x, draftStroke[0].y);
      for (let i = 1; i < draftStroke.length; i++) ctx.lineTo(draftStroke[i].x, draftStroke[i].y);
      ctx.stroke();
    }

    if (draftArrow) {
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#111111";
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.setLineDash([6, 6]);

      ctx.beginPath();
      ctx.moveTo(draftArrow.x1, draftArrow.y1);
      ctx.lineTo(draftArrow.x2, draftArrow.y2);
      ctx.stroke();

      const angle = Math.atan2(draftArrow.y2 - draftArrow.y1, draftArrow.x2 - draftArrow.x1);
      const headLen = 12;
      const a1 = angle + Math.PI * 0.85;
      const a2 = angle - Math.PI * 0.85;
      const hx1 = draftArrow.x2 + headLen * Math.cos(a1);
      const hy1 = draftArrow.y2 + headLen * Math.sin(a1);
      const hx2 = draftArrow.x2 + headLen * Math.cos(a2);
      const hy2 = draftArrow.y2 + headLen * Math.sin(a2);

      ctx.beginPath();
      ctx.moveTo(draftArrow.x2, draftArrow.y2);
      ctx.lineTo(hx1, hy1);
      ctx.moveTo(draftArrow.x2, draftArrow.y2);
      ctx.lineTo(hx2, hy2);
      ctx.stroke();

      ctx.setLineDash([]);
    }

    if (draftShape) {
      const { shape, x1, y1, x2, y2 } = draftShape;
      const left = Math.min(x1, x2);
      const right = Math.max(x1, x2);
      const top = Math.min(y1, y2);
      const bottom = Math.max(y1, y2);
      const w = right - left;
      const h = bottom - top;

      const rc = rough.canvas(canvas);

      ctx.save();
      ctx.setLineDash([6, 6]);
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#111111";

      if (!rc) {
        ctx.strokeRect(left, top, w, h);
      } else {
        const roughOpts = {
          stroke: "#111111",
          strokeWidth: 2,
          roughness: 1.6,
          bowing: 1.2,
        };

        if (shape === "rectangle") {
          rc.rectangle(left, top, w, h, roughOpts);
        } else if (shape === "square") {
          const s = Math.min(w, h);
          const sx = x2 >= x1 ? left : right - s;
          const sy = y2 >= y1 ? top : bottom - s;
          rc.rectangle(sx, sy, s, s, roughOpts);
        } else if (shape === "circle") {
          const r = Math.max(1, Math.min(w, h) / 2);
          const cx = (x1 + x2) / 2;
          const cy = (y1 + y2) / 2;
          rc.circle(cx, cy, r * 2, roughOpts);
        } else if (shape === "triangle") {
          const cx = (x1 + x2) / 2;
          const cy = (y1 + y2) / 2;
          const s = Math.min(w, h);
          const half = s / 2;
          rc.polygon(
            [
              [cx, cy - half],
              [cx - half, cy + half],
              [cx + half, cy + half],
            ],
            roughOpts,
          );
        }
      }

      ctx.restore();
      ctx.setLineDash([]);
    }

    if (draftTextBox) {
      const left = Math.min(draftTextBox.x1, draftTextBox.x2);
      const right = Math.max(draftTextBox.x1, draftTextBox.x2);
      const top = Math.min(draftTextBox.y1, draftTextBox.y2);
      const bottom = Math.max(draftTextBox.y1, draftTextBox.y2);
      const w = right - left;
      const h = bottom - top;

      ctx.save();
      ctx.setLineDash([6, 6]);
      ctx.lineWidth = 2;
      ctx.strokeStyle = "rgba(79,70,229,0.9)";
      ctx.strokeRect(left, top, w, h);
      ctx.restore();
      ctx.setLineDash([]);
    }
  }, [objects, renderer, draftStroke, penColor, penWidth, draftArrow, draftShape, draftTextBox]);

  const getMousePos = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const pos = getMousePos(e);
    if (!pos) return;

    const clicked = renderer.hitTest(objects, pos.x, pos.y);

    if (tool === "select") {
      if (e.button !== 0) return;

      // Viewers can select but not drag (move)
      if (clicked) {
        setSelectedId(clicked.objectId);
        if (canEdit) {
          setDraggingId(clicked.objectId);
          setOffset({ x: pos.x - clicked.x, y: pos.y - clicked.y });
        }
      } else {
        setSelectedId(null);
      }

      return;
    }

    // Guard all drawing tools for view-only users
    if (!canEdit) return;

    if (tool === "text") {
      if (e.button !== 0) return;

      if (textEditor) {
        return;
      }

      isTextingRef.current = true;
      setDraftTextBox({ x1: pos.x, y1: pos.y, x2: pos.x, y2: pos.y });
      return;
    }

    if (tool === "shape") {
      if (e.button !== 0) return;

      if (activeShape === "arrow") {
        isArrowingRef.current = true;
        setDraftArrow({ x1: pos.x, y1: pos.y, x2: pos.x, y2: pos.y });
        return;
      }

      isShapingRef.current = true;
      setDraftShape({
        shape: activeShape,
        x1: pos.x,
        y1: pos.y,
        x2: pos.x,
        y2: pos.y,
      });
    }

    if (tool === "pen") {
      if (e.button !== 0) return;
      isDrawingRef.current = true;
      arrowHoldArmedRef.current = false;
      if (arrowHoldTimeoutRef.current != null) {
        window.clearTimeout(arrowHoldTimeoutRef.current);
        arrowHoldTimeoutRef.current = null;
      }
      setDraftStroke([{ x: pos.x, y: pos.y }]);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();

    // Only editors can delete
    if (!canEdit) return;

    if (tool !== "select") return;

    const pos = getMousePos(e);
    if (!pos) return;

    const clicked = renderer.hitTest(objects, pos.x, pos.y);
    if (!clicked) return;

    deleteObject(clicked.objectId);
    if (selectedId === clicked.objectId) setSelectedId(null);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    // Guard drawing tools for view-only users
    if (!canEdit && tool !== "select") return;

    if (tool === "pen") {
      if (!isDrawingRef.current) return;
      const pos = getMousePos(e);
      if (!pos) return;
      setDraftStroke((prev) => {
        const next = prev ? [...prev, { x: pos.x, y: pos.y }] : [{ x: pos.x, y: pos.y }];
        draftStrokeRef.current = next;
        return next;
      });

      arrowHoldArmedRef.current = false;
      if (arrowHoldTimeoutRef.current != null) {
        window.clearTimeout(arrowHoldTimeoutRef.current);
        arrowHoldTimeoutRef.current = null;
      }

      arrowHoldTimeoutRef.current = window.setTimeout(() => {
        if (!isDrawingRef.current) return;
        const points = draftStrokeRef.current;
        if (!points || points.length < 8) return;
        const asArrow = recognizeStrokeAsArrow(points);
        if (!asArrow) return;
        arrowHoldArmedRef.current = true;
      }, 1000);

      return;
    }

    if (tool === "shape" && activeShape === "arrow") {
      if (!isArrowingRef.current) return;
      const pos = getMousePos(e);
      if (!pos) return;
      setDraftArrow((prev) => {
        if (!prev) return { x1: pos.x, y1: pos.y, x2: pos.x, y2: pos.y };
        return { ...prev, x2: pos.x, y2: pos.y };
      });
      return;
    }

    if (tool === "shape" && activeShape !== "arrow") {
      if (!isShapingRef.current) return;
      const pos = getMousePos(e);
      if (!pos) return;
      setDraftShape((prev) => {
        if (!prev) return prev;
        return { ...prev, x2: pos.x, y2: pos.y };
      });
      return;
    }

    if (tool === "text") {
      if (!isTextingRef.current) return;
      const pos = getMousePos(e);
      if (!pos) return;
      setDraftTextBox((prev) => {
        if (!prev) return prev;
        return { ...prev, x2: pos.x, y2: pos.y };
      });
      return;
    }

    if (tool !== "select") return;
    if (!draggingId) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left - offset.x;
    const y = e.clientY - rect.top - offset.y;

    pendingDragPosRef.current = { id: draggingId, x, y };
    if (dragRafRef.current == null) {
      dragRafRef.current = window.requestAnimationFrame(() => {
        dragRafRef.current = null;
        const pending = pendingDragPosRef.current;
        if (!pending) return;
        moveObject(pending.id, pending.x, pending.y);
      });
    }
  };

  const handleMouseUp = () => {
    // Guard all write operations for view-only users
    if (!canEdit) {
      setDraggingId(null);
      return;
    }

    if (tool === "pen") {
      if (!isDrawingRef.current) return;
      isDrawingRef.current = false;

      if (arrowHoldTimeoutRef.current != null) {
        window.clearTimeout(arrowHoldTimeoutRef.current);
        arrowHoldTimeoutRef.current = null;
      }

      const points = draftStroke ?? [];
      setDraftStroke(null);
      draftStrokeRef.current = null;

      if (points.length >= 2) {
        if (arrowHoldArmedRef.current) {
          const asArrow = recognizeStrokeAsArrow(points);
          if (asArrow) {
            addObject("ADD_SHAPE", {
              ...asArrow,
              strokeColor: penColor,
              lineWidth: penWidth,
            });
            arrowHoldArmedRef.current = false;
            return;
          }
        }

        arrowHoldArmedRef.current = false;

        const recognized = recognizeStrokeAsShape(points);
        if (recognized) {
          addObject("ADD_SHAPE", {
            ...recognized.payload,
            strokeColor: recognized.payload.strokeColor ?? penColor,
            lineWidth: recognized.payload.lineWidth ?? penWidth,
          });
          return;
        }

        addObject("DRAW_STROKE", {
          points,
          color: penColor,
          lineWidth: penWidth,
        });
      }

      return;
    }

    if (tool === "shape" && activeShape === "arrow") {
      if (!isArrowingRef.current) return;
      isArrowingRef.current = false;

      const arrow = draftArrow;
      setDraftArrow(null);

      if (arrow) {
        const cx = (arrow.x1 + arrow.x2) / 2;
        const cy = (arrow.y1 + arrow.y2) / 2;

        addObject("ADD_SHAPE", {
          shape: "arrow",
          x: cx,
          y: cy,
          x1: arrow.x1,
          y1: arrow.y1,
          x2: arrow.x2,
          y2: arrow.y2,
          strokeColor: "#111111",
          lineWidth: 2,
        });
      }

      setTool("select");
      return;
    }

    if (tool === "shape" && activeShape !== "arrow") {
      if (!isShapingRef.current) return;
      isShapingRef.current = false;

      const s = draftShape;
      setDraftShape(null);

      if (s) {
        const left = Math.min(s.x1, s.x2);
        const right = Math.max(s.x1, s.x2);
        const top = Math.min(s.y1, s.y2);
        const bottom = Math.max(s.y1, s.y2);
        const w = right - left;
        const h = bottom - top;

        const movedEnough = Math.max(w, h) >= 6;
        const cx = (s.x1 + s.x2) / 2;
        const cy = (s.y1 + s.y2) / 2;

        if (!movedEnough) {
          addObject("ADD_SHAPE", {
            shape: s.shape,
            x: s.x1,
            y: s.y1,
            size: 60,
            strokeColor: "#111111",
            fillColor: "transparent",
            lineWidth: 2,
          });
        } else if (s.shape === "rectangle") {
          addObject("ADD_SHAPE", {
            shape: "rectangle",
            x: cx,
            y: cy,
            width: Math.max(6, w),
            height: Math.max(6, h),
            strokeColor: "#111111",
            fillColor: "transparent",
            lineWidth: 2,
          });
        } else if (s.shape === "square") {
          const size = Math.max(6, Math.min(w, h));
          addObject("ADD_SHAPE", {
            shape: "square",
            x: cx,
            y: cy,
            size,
            strokeColor: "#111111",
            fillColor: "transparent",
            lineWidth: 2,
          });
        } else if (s.shape === "circle") {
          const radius = Math.max(3, Math.min(w, h) / 2);
          addObject("ADD_SHAPE", {
            shape: "circle",
            x: cx,
            y: cy,
            radius,
            strokeColor: "#111111",
            fillColor: "transparent",
            lineWidth: 2,
          });
        } else if (s.shape === "triangle") {
          const size = Math.max(6, Math.min(w, h));
          addObject("ADD_SHAPE", {
            shape: "triangle",
            x: cx,
            y: cy,
            size,
            strokeColor: "#111111",
            fillColor: "transparent",
            lineWidth: 2,
          });
        }
      }

      setTool("select");
      return;
    }

    if (tool === "text") {
      if (!isTextingRef.current) return;
      isTextingRef.current = false;

      const box = draftTextBox;
      setDraftTextBox(null);
      if (!box) return;

      const left = Math.min(box.x1, box.x2);
      const right = Math.max(box.x1, box.x2);
      const top = Math.min(box.y1, box.y2);
      const bottom = Math.max(box.y1, box.y2);
      const width = Math.max(120, right - left);
      const height = Math.max(44, bottom - top);

      const canvas = canvasRef.current;
      const wrap = canvasWrapRef.current;
      const canvasRect = canvas?.getBoundingClientRect();
      const wrapRect = wrap?.getBoundingClientRect();
      const offsetLeft = canvasRect && wrapRect ? canvasRect.left - wrapRect.left : 0;
      const offsetTop = canvasRect && wrapRect ? canvasRect.top - wrapRect.top : 0;

      setTextEditor({
        overlayX: offsetLeft + left,
        overlayY: offsetTop + top,
        canvasX: left,
        canvasY: top,
        width,
        height,
        value: "",
      });
      return;
    }

    setDraggingId(null);
  };

  const commitTextEditor = () => {
    if (!textEditor) return;
    // View-only users can't add text
    if (!canEdit) {
      setTextEditor(null);
      setTool("select");
      return;
    }

    const raw = textEditor.value;
    const text = raw.replace(/\s+$/g, "");

    if (text.length > 0) {
      addObject("ADD_TEXT", {
        text,
        x: textEditor.canvasX,
        y: textEditor.canvasY,
        width: textEditor.width,
        height: textEditor.height,
        font: "16px Arial",
        color: "#000000",
      });
    }

    setTextEditor(null);
    setTool("select");
  };

  const selectedObject = useMemo(() => {
    if (!selectedId) return null;
    return objects.find((o) => o.objectId === selectedId) ?? null;
  }, [objects, selectedId]);

  const selectedSize = useMemo(() => {
    if (!selectedObject) return null;

    if (selectedObject.type === "ADD_TEXT") {
      const font = String(selectedObject.payload.font ?? "16px Arial");
      const m = font.match(/(\d+(?:\.\d+)?)px\s*(.*)/);
      return m ? Number(m[1]) : 16;
    }

    if (selectedObject.type === "DRAW_STROKE") {
      return Number(selectedObject.payload.lineWidth ?? 2);
    }

    if (selectedObject.type === "ADD_SHAPE") {
      const shape = selectedObject.payload.shape;
      if (shape === "circle") return Number(selectedObject.payload.radius ?? 30);
      if (shape === "rectangle") return Number(selectedObject.payload.width ?? selectedObject.payload.size ?? 60);
      if (shape === "arrow") return Number(selectedObject.payload.lineWidth ?? 2);
      return Number(selectedObject.payload.size ?? 60);
    }

    return null;
  }, [selectedObject]);

  const handleSelectedSizeChange = (next: number) => {
    if (!selectedObject) return;

    if (selectedObject.type === "ADD_TEXT") {
      const font = String(selectedObject.payload.font ?? "16px Arial");
      const m = font.match(/(\d+(?:\.\d+)?)px\s*(.*)/);
      const family = m?.[2] ?? "Arial";
      editObject(selectedObject.objectId, { font: `${next}px ${family}` });
      return;
    }

    if (selectedObject.type === "DRAW_STROKE") {
      editObject(selectedObject.objectId, { lineWidth: next });
      return;
    }

    if (selectedObject.type === "ADD_SHAPE") {
      const shape = selectedObject.payload.shape;
      if (shape === "circle") {
        editObject(selectedObject.objectId, { radius: next });
        return;
      }
      if (shape === "rectangle") {
        const height = Number(selectedObject.payload.height ?? selectedObject.payload.size ?? 60);
        editObject(selectedObject.objectId, { width: next, height });
        return;
      }
      if (shape === "arrow") {
        editObject(selectedObject.objectId, { lineWidth: next });
        return;
      }

      editObject(selectedObject.objectId, { size: next });
      return;
    }
  };

  // Generate avatar color based on userId
  const getAvatarColor = (userId: string) => {
    const colors = ["#ec4899", "#3b82f6", "#22c55e", "#f59e0b", "#8b5cf6", "#ef4444", "#14b8a6"];
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  return (
    <div className="st-boardPage">
      <div className="st-boardTopbar">
        <div className="st-boardTopLeft">
          <div className="st-brand">
            <div className="st-brandMark">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M5 4.5C5 3.67157 5.67157 3 6.5 3H19C20.1046 3 21 3.89543 21 5V18.5C21 19.3284 20.3284 20 19.5 20H7C5.89543 20 5 19.1046 5 18V4.5Z"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <path d="M9 7H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M9 11H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <div>RealTimeWhiteBoard</div>
          </div>
          <div className="st-boardTitle">Live Whiteboard</div>
        </div>

        <div className="st-boardTopRight">
          <button className="st-iconBtn" onClick={() => dispatch(undo())} disabled={!canUndo} title="Undo">
            ↶
          </button>
          <button className="st-iconBtn" onClick={() => dispatch(redo())} disabled={!canRedo} title="Redo">
            ↷
          </button>

          <div className="st-chip">Session ID: {boardId}</div>

          {userRole ? (
            <div className="st-chip" style={{ background: canEdit ? "#dcfce7" : "#fee2e2", color: canEdit ? "#166534" : "#991b1b" }}>
              {userRole} • {canEdit ? "edit" : "view only"}
            </div>
          ) : null}

          <button
            className="st-iconBtn"
            title="Share"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(boardId);
                setShareLabel("Copied");
                window.setTimeout(() => setShareLabel(null), 1200);
              } catch {
                setShareLabel("Failed");
                window.setTimeout(() => setShareLabel(null), 1200);
              }
            }}
          >
            ⤴
          </button>

          <button className="st-iconBtn" title="Settings" onClick={() => setShowAccess(true)}>
            ⚙
          </button>
          <button className="st-iconBtn" title="Keyboard" onClick={() => setShowKeyboard(true)}>
            ⌨
          </button>
          <button
            className="st-btn"
            onClick={() => {
              dispatch(setBoardState([]));
              onLeave();
            }}
          >
            Leave
          </button>
        </div>
      </div>

      <div className="st-boardBody">
        <div className="st-leftRail">
          <button
            className={`st-toolBtn ${tool === "pen" ? "st-toolBtnActive" : ""}`}
            onClick={() => setTool("pen")}
            title={canEdit ? "Pen" : "View-only: drawing disabled"}
            disabled={!canEdit}
            style={{ opacity: canEdit ? 1 : 0.4, cursor: canEdit ? "pointer" : "not-allowed" }}
          >
            ✎
          </button>
          <button
            className={`st-toolBtn ${tool === "shape" ? "st-toolBtnActive" : ""}`}
            onClick={() => setTool("shape")}
            title={canEdit ? "Shape" : "View-only: drawing disabled"}
            disabled={!canEdit}
            style={{ opacity: canEdit ? 1 : 0.4, cursor: canEdit ? "pointer" : "not-allowed" }}
          >
            ▢
          </button>
          <button
            className={`st-toolBtn ${tool === "text" ? "st-toolBtnActive" : ""}`}
            onClick={() => setTool("text")}
            title={canEdit ? "Text" : "View-only: drawing disabled"}
            disabled={!canEdit}
            style={{ opacity: canEdit ? 1 : 0.4, cursor: canEdit ? "pointer" : "not-allowed" }}
          >
            T
          </button>
          <button className={`st-toolBtn ${tool === "select" ? "st-toolBtnActive" : ""}`} onClick={() => setTool("select")} title="Select">
            ⟐
          </button>

          {canEdit ? (
            <>
              <div style={{ height: 8 }} />
              <button className="st-toolBtn" onClick={() => setPenColor("#111827")} title="Black">
                <div className="st-colorDot" style={{ background: "#111827" }} />
              </button>
              <button className="st-toolBtn" onClick={() => setPenColor("#ef4444")} title="Red">
                <div className="st-colorDot" style={{ background: "#ef4444" }} />
              </button>
              <button className="st-toolBtn" onClick={() => setPenColor("#3b82f6")} title="Blue">
                <div className="st-colorDot" style={{ background: "#3b82f6" }} />
              </button>
              <button className="st-toolBtn" onClick={() => setPenColor("#22c55e")} title="Green">
                <div className="st-colorDot" style={{ background: "#22c55e" }} />
              </button>
            </>
          ) : null}

          {tool === "shape" ? (
            <select value={activeShape} onChange={(e) => setActiveShape(e.target.value as any)} style={{ marginTop: 10, borderRadius: 10, padding: 8, border: "1px solid rgba(15, 23, 42, 0.12)" }}>
              <option value="square">Square</option>
              <option value="rectangle">Rectangle</option>
              <option value="circle">Circle</option>
              <option value="triangle">Triangle</option>
              <option value="arrow">Arrow</option>
            </select>
          ) : null}

          {tool === "pen" ? (
            <input type="range" min={1} max={12} value={penWidth} onChange={(e) => setPenWidth(Number(e.target.value))} style={{ marginTop: 10 }} />
          ) : null}
        </div>

        <div className="st-canvasWrap" ref={canvasWrapRef} style={{ position: "relative" }}>
          {tool === "select" && selectedObject && selectedSize != null ? (
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
              <div style={{ width: 60, fontSize: 12, fontWeight: 800, color: "rgba(15,23,42,0.6)" }}>Size</div>
              <input type="range" min={1} max={200} value={selectedSize} onChange={(e) => handleSelectedSizeChange(Number(e.target.value))} />
              <div style={{ width: 48, fontSize: 12 }}>{selectedSize}</div>
            </div>
          ) : null}

          <canvas
            ref={canvasRef}
            width={900}
            height={620}
            style={{
              border: "1px solid rgba(15, 23, 42, 0.12)",
              borderRadius: 12,
              cursor: tool === "text" || tool === "shape" ? "crosshair" : tool === "pen" ? "crosshair" : draggingId ? "grabbing" : "default",
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onContextMenu={handleContextMenu}
          />

          {textEditor ? (
            <textarea
              ref={(el) => {
                textAreaRef.current = el;
              }}
              value={textEditor.value}
              onChange={(e) => setTextEditor((prev) => (prev ? { ...prev, value: e.target.value } : prev))}
              onBlur={() => commitTextEditor()}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  e.preventDefault();
                  setTextEditor(null);
                  setTool("select");
                  return;
                }
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  commitTextEditor();
                }
              }}
              style={{
                position: "absolute",
                left: textEditor.overlayX,
                top: textEditor.overlayY,
                width: textEditor.width,
                height: textEditor.height,
                font: "16px Arial",
                padding: "8px 10px",
                borderRadius: 10,
                border: "2px solid rgba(79,70,229,0.55)",
                outline: "none",
                resize: "none",
                background: "rgba(255,255,255,0.96)",
                boxShadow: "0 8px 24px rgba(15,23,42,0.12)",
              }}
            />
          ) : null}
        </div>

        <div className="st-rightPanel">
          <div className="st-panelTabs">
            <div className={`st-panelTab st-panelTabActive`}>Participants</div>
            <div className="st-panelTab">History</div>
            <div className="st-panelTab">Notes</div>
          </div>

          <div className="st-panelContent">
            <div style={{ fontSize: 12, color: "rgba(15,23,42,0.6)", marginBottom: 10 }}>
              {safeParticipants.length} participant{safeParticipants.length !== 1 ? "s" : ""} online
            </div>
            {safeParticipants.length === 0 ? (
              <div style={{ fontSize: 13, color: "rgba(15,23,42,0.4)", textAlign: "center", padding: 20 }}>
                No participants yet
              </div>
            ) : (
              safeParticipants.map((p) => (
                <div key={p.userId} className="st-person">
                  <div className="st-avatar" style={{ background: getAvatarColor(p.userId) }}>
                    {getInitials(p.userName)}
                  </div>
                  <div>
                    <div style={{ fontWeight: 900, fontSize: 13 }}>{p.userName}</div>
                    <div className="st-status">Active now</div>
                    <div style={{ fontSize: 12, color: "rgba(15,23,42,0.75)" }}>
                      Access: {p.access ?? participantAccessState[p.userId] ?? "view"}
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                    {p.userId === userId ? (
                      <div className="st-rolePill" style={{ background: "#dbeafe", color: "#1d4ed8" }}>You</div>
                    ) : null}
                    <div style={{ position: "relative", width: 150, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                      <button
                        type="button"
                        className="st-btn"
                        style={{ minWidth: 130, padding: "6px 10px" }}
                        disabled={!isOwner || !token || savingAccessFor === p.userId}
                        onClick={() => setAccessMenuOpen((prev) => (prev === p.userId ? null : p.userId))}
                        title={!isOwner ? "Only the board owner can change participant access" : !token ? "Sign in to change access" : `Choose access for ${p.userName}`}
                      >
                        {savingAccessFor === p.userId ? "Saving..." : "Change access"}
                      </button>

                      {isOwner && accessMenuOpen === p.userId ? (
                        <div
                          style={{
                            position: "absolute",
                            top: "100%",
                            right: 0,
                            width: 150,
                            marginTop: 8,
                            padding: 8,
                            borderRadius: 12,
                            background: "white",
                            border: "1px solid rgba(15,23,42,0.12)",
                            boxShadow: "0 20px 40px rgba(15,23,42,0.12)",
                            zIndex: 10,
                          }}
                        >
                          {(["view", "edit"] as const).map((choice) => {
                            const currentAccess = p.access ?? participantAccessState[p.userId] ?? "view";
                            return (
                              <button
                                key={choice}
                                type="button"
                                className="st-btn"
                                style={{
                                  display: "block",
                                  width: "100%",
                                  textAlign: "left",
                                  padding: "8px 10px",
                                  marginBottom: 6,
                                }}
                                disabled={!token || savingAccessFor === p.userId || choice === currentAccess}
                                onClick={() => {
                                  setAccessMenuOpen(null);
                                  changeParticipantAccess(p, choice);
                                }}
                              >
                                {choice === currentAccess ? `${choice} (current)` : choice}
                              </button>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {shareLabel ? (
        <div style={{ position: "fixed", top: 66, right: 16, background: "#0f172a", color: "white", padding: "8px 10px", borderRadius: 12, fontSize: 12, zIndex: 60 }}>
          {shareLabel}
        </div>
      ) : null}

      {showAccess ? (
        <div className="st-modalOverlay" onMouseDown={() => setShowAccess(false)}>
          <div className="st-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="st-modalHeader">
              <div>
                <h2 className="st-modalTitle">Access Control</h2>
                <div style={{ fontSize: 12, color: "rgba(15,23,42,0.6)" }}>Manage participant roles and permissions for this board</div>
              </div>
              <button className="st-iconBtn" onClick={() => setShowAccess(false)}>
                ✕
              </button>
            </div>

            {safeParticipants.map((p) => (
              <div key={p.userId} style={{ border: "1px solid rgba(15,23,42,0.08)", borderRadius: 14, padding: 12, display: "grid", gridTemplateColumns: "36px 1fr auto", gap: 10, alignItems: "center", marginTop: 10 }}>
                <div className="st-avatar" style={{ background: getAvatarColor(p.userId) }}>
                  {getInitials(p.userName)}
                </div>
                <div>
                  <div style={{ fontWeight: 900, fontSize: 13 }}>{p.userName}</div>
                  <div className="st-status">Active now</div>
                </div>
                {p.userId === userId ? (
                  <div style={{ fontSize: 12, color: "#1d4ed8", fontWeight: 600 }}>You</div>
                ) : (
                  <div style={{ fontSize: 12, color: "rgba(15,23,42,0.6)" }}>Participant</div>
                )}
              </div>
            ))}

            <div style={{ marginTop: 12, background: "rgba(79,70,229,0.08)", border: "1px solid rgba(79,70,229,0.14)", borderRadius: 14, padding: 12, fontSize: 12, color: "rgba(15,23,42,0.75)" }}>
              <div style={{ fontWeight: 900, color: "#3730a3" }}>Editor:</div>
              <div>Can draw, add text, and modify the board</div>
              <div style={{ height: 8 }} />
              <div style={{ fontWeight: 900, color: "#3730a3" }}>Viewer:</div>
              <div>Can only view the board content</div>
            </div>
          </div>
        </div>
      ) : null}

      {showKeyboard ? (
        <div className="st-modalOverlay" onMouseDown={() => setShowKeyboard(false)}>
          <div className="st-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="st-modalHeader">
              <div>
                <h2 className="st-modalTitle">Keyboard Shortcuts</h2>
                <div style={{ fontSize: 12, color: "rgba(15,23,42,0.6)" }}>Boost your productivity with these keyboard shortcuts</div>
              </div>
              <button className="st-iconBtn" onClick={() => setShowKeyboard(false)}>
                ✕
              </button>
            </div>

            <div className="st-kbRow">
              <div>Select Pen tool</div>
              <div className="st-keycap">P</div>
            </div>
            <div className="st-kbRow">
              <div>Select Rectangle tool</div>
              <div className="st-keycap">R</div>
            </div>
            <div className="st-kbRow">
              <div>Select Circle tool</div>
              <div className="st-keycap">C</div>
            </div>
            <div className="st-kbRow">
              <div>Select Text tool</div>
              <div className="st-keycap">T</div>
            </div>
            <div className="st-kbRow">
              <div>Undo last action</div>
              <div className="st-keycap">Ctrl/Cmd + Z</div>
            </div>
            <div className="st-kbRow">
              <div>Redo action</div>
              <div className="st-keycap">Ctrl/Cmd + Y</div>
            </div>
            <div className="st-kbRow">
              <div>Copy session ID</div>
              <div className="st-keycap">Ctrl/Cmd + C</div>
            </div>
            <div className="st-kbRow">
              <div>Delete selected element</div>
              <div className="st-keycap">Delete/Backspace</div>
            </div>
            <div className="st-kbRow">
              <div>Deselect all</div>
              <div className="st-keycap">Esc</div>
            </div>

            <div style={{ marginTop: 12, background: "rgba(79,70,229,0.08)", border: "1px solid rgba(79,70,229,0.14)", borderRadius: 14, padding: 12, fontSize: 12, color: "rgba(15,23,42,0.75)" }}>
              <div style={{ fontWeight: 900, color: "#3730a3" }}>Tip:</div>
              <div>Press <span className="st-keycap">?</span> at any time to view this dialog.</div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
