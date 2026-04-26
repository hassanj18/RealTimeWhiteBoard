export type Action = {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  createdAt: Date;
};
