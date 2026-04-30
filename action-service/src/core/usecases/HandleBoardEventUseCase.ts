import { WebSocketGatewayPort } from "../ports/WebSocketGatewayPort";

export type BoardEvent = {
  type: "BOARD_EVENT";
  payload: {
    boardId: string;
    [key: string]: unknown;
  };
};

export class HandleBoardEventUseCase {
  constructor(private readonly webSocketGateway: WebSocketGatewayPort) {}

  async execute(event: BoardEvent): Promise<void> {
    const { payload } = event;

    if (!payload?.boardId) {
      console.warn("[HandleBoardEvent] Missing payload.boardId, skipping broadcast");
      return;
    }

    await this.webSocketGateway.sendToBoard(payload.boardId, event);
  }
}
