export interface AccessResult {
  hasAccess: boolean;
  userName?: string;
}

export interface BoardServicePort {
  checkAccess(userId: string, boardId: string, accessToken?: string): Promise<AccessResult>;
}
