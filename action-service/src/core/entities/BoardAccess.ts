export type BoardRole = "view" | "edit";

export type BoardAccess = {
  userId: string;
  boardId: string;
  role: BoardRole;
  isActive: boolean;
};
