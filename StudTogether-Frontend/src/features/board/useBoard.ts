import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { BoardSocket } from "../../shared/realtime/BoardSocket";
import { addEvent, setBoardState } from "../../store/boardSlice.ts";
import type { RootState } from "../../store/store";
import { BoardEventService } from "./BoardEventService";

export function useBoard(socket: BoardSocket, boardId: string, userId: string) {
  const dispatch = useDispatch();
  const events = useSelector((state: RootState) => state.board.events);

  const service = new BoardEventService(socket, boardId, userId);

  useEffect(() => {
    const stateHandler = (state: { boardId: string; events: any[] }) => {
      if (state.boardId !== boardId) return;
      dispatch(setBoardState(state.events));
    };

    const eventHandler = (event: any) => {
      if (event.boardId !== boardId) return;
      dispatch(addEvent(event));
    };

    socket.on("board:event", eventHandler);
    socket.on("board:state", stateHandler);

    return () => {
      socket.off("board:event", eventHandler);
      socket.off("board:state", stateHandler);
    };
  }, [socket, boardId, dispatch]);

  const addObject = (type: any, payload: any) => {
    return service.addObject(type, payload);
  };

  const moveObject = (objectId: string, x: number, y: number) => {
    service.moveObject(objectId, x, y);
  };

  const editObject = (objectId: string, payload: any) => {
    service.editObject(objectId, payload);
  };

  const deleteObject = (objectId: string) => {
    service.deleteObject(objectId);
  };

  return { events, addObject, moveObject, editObject, deleteObject };
}