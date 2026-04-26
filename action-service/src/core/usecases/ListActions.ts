import { ActionRepository } from "../ports/ActionRepository";

export class ListActions {
  constructor(private readonly actions: ActionRepository) {}

  async execute(limit: number) {
    const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(limit, 100) : 20;
    return this.actions.list(safeLimit);
  }
}
