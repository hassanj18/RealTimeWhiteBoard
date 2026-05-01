export interface WebSocketGatewayPort {
  sendToBoard(boardId: string, message: unknown): Promise<void>;
  sendToUser(boardId: string, userId: string, message: unknown): Promise<void>;
}
