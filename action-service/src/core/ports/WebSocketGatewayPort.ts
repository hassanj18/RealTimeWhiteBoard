export interface WebSocketGatewayPort {
  sendToBoard(boardId: string, message: unknown): Promise<void>;
  sendToUser(userId: string, message: unknown): Promise<void>;
}
